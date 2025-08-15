import { StatusCodes } from 'http-status-codes';
import { ValidationError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

/**
 * Formate les erreurs Zod en messages compréhensibles
 */
const formatZodErrors = (zodErrors) => {
  if (!zodErrors || !Array.isArray(zodErrors)) {
    return [{ 
      field: 'unknown', 
      message: 'Erreur de validation inconnue' 
    }];
  }

  return zodErrors.map(error => {
    const field = error.path?.join('.') || 'unknown';
    let message = error.message;

    // Améliorer les messages selon le type d'erreur
    switch (error.code) {
      case 'too_small':
        if (error.type === 'string') {
          message = `Le champ "${field}" doit contenir au moins ${error.minimum} caractère(s)`;
        }
        break;
      
      case 'too_big':
        if (error.type === 'string') {
          message = `Le champ "${field}" ne peut pas dépasser ${error.maximum} caractères`;
        }
        break;
      
      case 'invalid_string':
        if (error.validation === 'regex') {
          message = `Le format du champ "${field}" est invalide`;
        }
        break;
      
      case 'invalid_type':
        message = `Le champ "${field}" doit être de type ${error.expected}`;
        break;
      
      default:
        // Garder le message par défaut s'il est déjà bien
        break;
    }

    return {
      field,
      message,
      code: error.code,
      value: error.input
    };
  });
};

/**
 * Middleware de validation principal
 */
export const validate = (schema) => {
  return async (req, res, next) => {
    try {
      logger.debug('🔍 Validating request', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        hasBody: !!req.body,
        hasParams: !!req.params,
        hasQuery: !!req.query
      });

      // Préparer les données à valider
      const dataToValidate = {};
      
      if (schema.body) {
        dataToValidate.body = req.body || {};
      }
      
      if (schema.params) {
        dataToValidate.params = req.params || {};
      }
      
      if (schema.query) {
        dataToValidate.query = req.query || {};
      }

      // ✅ VALIDATION AVEC GESTION D'ERREUR ROBUSTE
      const result = schema.safeParse ? 
        schema.safeParse(dataToValidate) : 
        schema.body?.safeParse ? schema.body.safeParse(dataToValidate.body) : null;

      if (!result) {
        throw new ValidationError([{
          field: 'schema',
          message: 'Schéma de validation invalide'
        }]);
      }

      // Si la validation échoue
      if (!result.success) {
        const formattedErrors = formatZodErrors(result.error?.issues);
        
        logger.warn('❌ Validation failed', {
          requestId: req.requestId,
          errors: formattedErrors,
          originalData: dataToValidate
        });

        // ✅ CRÉER UNE ERREUR AVEC HINTS UTILES
        const validationError = new ValidationError(formattedErrors)
          .addContext('validationType', 'request')
          .addContext('requestId', req.requestId)
          .addContext('method', req.method)
          .addContext('url', req.url)
          .addHint('Vérifiez les données envoyées dans votre requête')
          .addHint('Consultez la documentation de l\'API pour les formats requis');

        // Ajouter des hints spécifiques selon les erreurs
        const hasEmptyTitle = formattedErrors.some(err => 
          err.field.includes('title') && err.code === 'too_small'
        );
        
        if (hasEmptyTitle) {
          validationError.addHint('Le titre ne peut pas être vide')
                         .addHint('Le titre doit contenir au moins 3 caractères');
        }

        const hasInvalidId = formattedErrors.some(err => 
          err.field.includes('id') && err.code === 'invalid_string'
        );
        
        if (hasInvalidId) {
          validationError.addHint('L\'ID doit être un ObjectID MongoDB valide (24 caractères hexadécimaux)')
                         .addHint('Exemple d\'ID valide: 507f1f77bcf86cd799439011');
        }

        return next(validationError);
      }

      // ✅ VALIDATION RÉUSSIE - Mettre à jour req avec les données validées
      if (result.data) {
        if (result.data.body) req.body = result.data.body;
        if (result.data.params) req.params = result.data.params;
        if (result.data.query) req.query = result.data.query;
      }

      logger.debug('✅ Validation successful', {
        requestId: req.requestId,
        validatedFields: Object.keys(dataToValidate)
      });

      next();

    } catch (error) {
      logger.error('💥 Validation middleware error', {
        requestId: req.requestId,
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 3) // Première lignes de la stack
      });

      // ✅ GESTION D'ERREUR ROBUSTE
      if (error instanceof ValidationError) {
        return next(error);
      }

      // Pour les erreurs inattendues, créer une erreur compréhensible
      const unexpectedError = new ValidationError([{
        field: 'validation',
        message: 'Erreur lors de la validation des données'
      }])
      .addContext('originalError', error.message)
      .addContext('requestId', req.requestId)
      .addHint('Cette erreur a été reportée à notre équipe')
      .addHint('Réessayez avec des données différentes')
      .addHint('Contactez le support si le problème persiste');

      next(unexpectedError);
    }
  };
};

/**
 * Middleware pour valider les IDs MongoDB
 */
export const validateMongoId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      const error = new ValidationError([{
        field: paramName,
        message: `Le paramètre ${paramName} est requis`
      }])
      .addHint(`Vérifiez l'URL de votre requête`)
      .addHint(`Le paramètre ${paramName} doit être fourni`);
      
      return next(error);
    }

    // Validation MongoDB ObjectID (24 caractères hexadécimaux)
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    
    if (!mongoIdRegex.test(id)) {
      const error = new ValidationError([{
        field: paramName,
        message: `${paramName} invalide`,
        value: id
      }])
      .addContext('providedId', id)
      .addContext('expectedFormat', 'ObjectID MongoDB (24 caractères hexadécimaux)')
      .addHint('L\'ID doit être un ObjectID MongoDB valide')
      .addHint('Exemple d\'ID valide: 507f1f77bcf86cd799439011')
      .addHint('Vérifiez l\'ID dans votre requête');
      
      return next(error);
    }

    next();
  };
};

/**
 * Middleware pour valider le JSON du body
 */
export const validateJSON = (req, res, next) => {
  // Ce middleware est automatiquement géré par express.json()
  // Mais on peut ajouter des vérifications supplémentaires
  
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    if (!req.body || Object.keys(req.body).length === 0) {
      const error = new ValidationError([{
        field: 'body',
        message: 'Le body de la requête ne peut pas être vide'
      }])
      .addHint('Envoyez des données JSON dans le body de votre requête')
      .addHint('Vérifiez le Content-Type: application/json')
      .addHint('Vérifiez la syntaxe de votre JSON');
      
      return next(error);
    }
  }

  next();
};