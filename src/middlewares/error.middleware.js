import { StatusCodes } from 'http-status-codes';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger.js';
import AppError from '../utils/AppError.js';

/**
 * Gestionnaire d'erreurs Prisma enrichi
 */
const handlePrismaError = (err, req) => {
  const context = {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    prismaCode: err.code,
    prismaError: err.meta
  };

  switch (err.code) {
    case 'P2002':
      const field = err.meta?.target?.[0] || 'champ';
      return new AppError(
        `Une entrée avec ce ${field} existe déjà`,
        StatusCodes.CONFLICT,
        null,
        context
      ).addHints([
        `Modifiez la valeur du champ "${field}"`,
        'Vérifiez les contraintes d\'unicité',
        'Ou supprimez l\'élément existant'
      ]);
    
    case 'P2003':
      return new AppError(
        'Référence invalide à une ressource liée',
        StatusCodes.BAD_REQUEST,
        null,
        context
      ).addHints([
        'Vérifiez que la ressource référencée existe',
        'Créez d\'abord la ressource parente',
        'Vérifiez les IDs de liaison'
      ]);
    
    case 'P2025':
      return new AppError(
        'Enregistrement non trouvé',
        StatusCodes.NOT_FOUND,
        null,
        context
      ).addHints([
        'Vérifiez l\'ID fourni',
        'L\'enregistrement a peut-être été supprimé',
        'Consultez la liste des ressources disponibles'
      ]);
    
    case 'P2014':
      return new AppError(
        'ID invalide fourni',
        StatusCodes.BAD_REQUEST,
        null,
        context
      ).addHints([
        'Vérifiez le format de l\'ID',
        'L\'ID doit être un ObjectID MongoDB valide',
        'Exemple d\'ID valide: 507f1f77bcf86cd799439011'
      ]);
    
    default:
      logger.error('Unhandled Prisma error', { 
        code: err.code, 
        meta: err.meta,
        requestId: req.requestId
      });
      
      return new AppError(
        'Erreur de base de données',
        StatusCodes.INTERNAL_SERVER_ERROR,
        null,
        context
      ).addHints([
        'Cette erreur a été reportée aux développeurs',
        'Réessayez dans quelques instants',
        'Contactez le support si le problème persiste'
      ]);
  }
};

/**
 * Générateur de hints automatiques selon le type d'erreur
 */
const generateAutoHints = (err, req) => {
  const hints = [];
  
  // Hints selon le code d'erreur
  if (err.statusCode === 404) {
    hints.push('💡 Vérifiez que l\'ID fourni existe en base de données');
    hints.push('💡 Vérifiez l\'URL de la requête');
  }
  
  if (err.statusCode === 409) {
    hints.push('💡 Une ressource avec ces données existe déjà');
    hints.push('💡 Modifiez vos données pour éviter le conflit');
  }
  
  if (err.statusCode === 400) {
    hints.push('💡 Vérifiez le format des données envoyées');
  }
  
  // Hints selon le type d'erreur
  if (err.name === 'ValidationError') {
    hints.push('💡 Vérifiez les données envoyées dans le body de la requête');
  }
  
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    hints.push('💡 Erreur liée à la base de données - vérifiez les contraintes');
  }
  
  // Hints selon l'action
  if (req.method === 'POST') {
    hints.push('💡 Pour les créations, vérifiez l\'unicité des champs requis');
  }
  
  if (req.method === 'DELETE') {
    hints.push('💡 Impossible de supprimer une ressource inexistante');
  }
  
  return hints;
};

/**
 * Formateur de réponse d'erreur pour le développement (ENRICHI)
 */
const sendErrorDev = (err, req, res) => {
  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  
  // Combiner les hints personnalisés avec les hints automatiques
  const allHints = [
    ...(err.hints || []),
    ...generateAutoHints(err, req)
  ];
  
  // Log enrichi pour le développement
  logger.error('🐛 DEV ERROR DETAILS', {
    requestId: req.requestId,
    error: {
      name: err.name,
      message: err.message,
      statusCode: err.statusCode,
      isOperational: err.isOperational
    },
    request: {
      method: req.method,
      url: req.url,
      originalUrl: req.originalUrl,
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('user-agent')
    },
    context: err.context,
    hints: allHints,
    timestamp: new Date().toISOString()
  });

  // ✅ RÉPONSE ENRICHIE AVEC TOUS LES HINTS
  res.status(statusCode).json({
    success: false,
    status: err.status || 'error',
    statusCode,
    message: err.message,
    requestId: req.requestId,
    errors: err.errors,
    context: err.context,
    hints: allHints, // ✅ HINTS COMBINÉS VISIBLES
    stack: err.stack?.split('\n'),
    debug: {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      params: req.params,
      query: req.query,
      body: req.body,
      userAgent: req.get('user-agent')
    }
  });
};

/**
 * Formateur de réponse d'erreur pour la production (SÉCURISÉ)
 */
const sendErrorProd = (err, req, res) => {
  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;

  // Log complet pour les développeurs (invisible côté client)
  logger.error('🚨 PRODUCTION ERROR', {
    requestId: req.requestId,
    error: {
      name: err.name,
      message: err.message,
      statusCode: err.statusCode,
      isOperational: err.isOperational,
      stack: err.stack
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent')
    },
    context: err.context,
    hints: err.hints,
    timestamp: new Date().toISOString()
  });

  // Erreurs opérationnelles : envoyer le message et les hints au client
  if (err.isOperational) {
    const safeHints = (err.hints || []).filter(hint => 
      !hint.includes('développeurs') && 
      !hint.includes('stack') && 
      !hint.includes('debug')
    );

    res.status(statusCode).json({
      success: false,
      status: err.status,
      statusCode,
      message: err.message,
      requestId: req.requestId,
      errors: err.errors,
      hints: safeHints, // ✅ HINTS FILTRÉS POUR LA PRODUCTION
      timestamp: new Date().toISOString()
    });
  } else {
    // Erreurs de programmation : message générique
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      status: 'error',
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: 'Une erreur interne est survenue',
      requestId: req.requestId,
      hints: [
        'Cette erreur a été reportée à notre équipe',
        'Réessayez dans quelques instants',
        'Contactez le support si le problème persiste'
      ],
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Middleware principal de gestion des erreurs (FINAL)
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;
  error.requestId = req.requestId;

  // Copier les propriétés importantes
  if (err.hints) error.hints = [...err.hints];
  if (err.context) error.context = { ...err.context };

  // Gérer les erreurs Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    error = handlePrismaError(err, req);
  }

  // Gérer les erreurs de validation Prisma
  if (err instanceof Prisma.PrismaClientValidationError) {
    error = new AppError(
      'Données invalides fournies',
      StatusCodes.BAD_REQUEST,
      null,
      { requestId: req.requestId, prismaValidation: true }
    ).addHints([
      'Vérifiez le format des données dans votre requête',
      'Consultez le schéma de base de données',
      'Vérifiez les types de données requis'
    ]);
  }

  // Gérer les erreurs de cast MongoDB/ObjectID
  if (err.name === 'CastError') {
    error = new AppError(
      'ID invalide',
      StatusCodes.BAD_REQUEST,
      null,
      { requestId: req.requestId, invalidId: err.value }
    ).addHints([
      'L\'ID doit être un ObjectID MongoDB valide',
      'Format attendu: 507f1f77bcf86cd799439011',
      'Vérifiez l\'ID dans votre requête'
    ]);
  }

  // Gérer les erreurs de syntax JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = new AppError(
      'JSON invalide dans le body de la requête',
      StatusCodes.BAD_REQUEST,
      null,
      { requestId: req.requestId, jsonError: true }
    ).addHints([
      'Vérifiez la syntaxe de votre JSON',
      'Vérifiez les guillemets et virgules',
      'Utilisez un validateur JSON en ligne'
    ]);
  }

  // Envoyer la réponse appropriée selon l'environnement
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, req, res);
  }
};

export default errorHandler;

/**
 * Middleware pour gérer les routes non trouvées (ENRICHI)
 */
export const notFoundHandler = (req, res, next) => {
  const message = `Route ${req.method} ${req.originalUrl} non trouvée`;
  
  // Suggérer des routes similaires
  const suggestions = [];
  const path = req.path.toLowerCase();
  
  if (path.includes('todo')) {
    suggestions.push('GET /api/todolists', 'POST /api/todolists', 'GET /api/todolists/:id');
  }
  
  const context = {
    requestId: req.requestId,
    availableRoutes: suggestions,
    requestedRoute: `${req.method} ${req.originalUrl}`
  };
  
  const error = new AppError(message, StatusCodes.NOT_FOUND, null, context)
    .addHints([
      'Vérifiez l\'URL de votre requête',
      'Vérifiez la méthode HTTP utilisée',
      'Consultez la documentation de l\'API',
      ...(suggestions.length > 0 ? ['Routes similaires disponibles: ' + suggestions.join(', ')] : [])
    ]);
  
  next(error);
};