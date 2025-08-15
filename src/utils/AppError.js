import { StatusCodes } from 'http-status-codes';

class AppError extends Error {
  constructor(message, statusCode = StatusCodes.INTERNAL_SERVER_ERROR, errors = null, context = {}) {
    super(message);
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;
    this.context = context; // Contexte enrichi
    this.hints = []; // ✅ NOUVEAU : Array pour stocker les hints
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Ajouter du contexte à l'erreur
   */
  addContext(key, value) {
    if (!this.context) this.context = {};
    this.context[key] = value;
    return this; // Permet le chaînage
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Ajouter une suggestion de correction
   */
  addHint(hint) {
    if (!this.hints) this.hints = [];
    this.hints.push(hint);
    return this; // Permet le chaînage
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Ajouter plusieurs hints d'un coup
   */
  addHints(hints) {
    if (!this.hints) this.hints = [];
    if (Array.isArray(hints)) {
      this.hints.push(...hints);
    }
    return this;
  }

  /**
   * Sérialisation JSON enrichie
   */
  toJSON() {
    return {
      status: this.status,
      statusCode: this.statusCode,
      message: this.message,
      errors: this.errors,
      context: this.context,
      hints: this.hints,
      timestamp: this.timestamp,
      requestId: this.context?.requestId,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: this.stack?.split('\n') 
      })
    };
  }
}

export default AppError;


export class ValidationError extends AppError {
  constructor(errors, context = {}) {
    super('Erreur de validation', StatusCodes.BAD_REQUEST, errors, {
      ...context,
      type: 'validation'
    });
    
    // ✅ Hints par défaut pour les erreurs de validation
    this.addHints([
      'Vérifiez les données envoyées dans votre requête',
      'Consultez la documentation de l\'API pour le format requis',
      'Vérifiez les types de données (string, number, boolean, etc.)'
    ]);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Ressource', context = {}) {
    super(`${resource} non trouvé(e)`, StatusCodes.NOT_FOUND, null, {
      ...context,
      type: 'not_found',
      resource: resource.toLowerCase()
    });
    
    // ✅ Hints par défaut pour les erreurs 404
    this.addHints([
      'Vérifiez l\'ID ou le nom fourni',
      'Vérifiez que la ressource existe encore',
      'La ressource a peut-être été supprimée'
    ]);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Non autorisé', context = {}) {
    super(message, StatusCodes.UNAUTHORIZED, null, {
      ...context,
      type: 'unauthorized'
    });
    
    // ✅ Hints par défaut pour les erreurs 401
    this.addHints([
      'Vérifiez votre token d\'authentification',
      'Reconnectez-vous si nécessaire',
      'Vérifiez que votre session n\'a pas expiré'
    ]);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Accès interdit', context = {}) {
    super(message, StatusCodes.FORBIDDEN, null, {
      ...context,
      type: 'forbidden'
    });
    
    // ✅ Hints par défaut pour les erreurs 403
    this.addHints([
      'Vous n\'avez pas les permissions pour cette action',
      'Contactez un administrateur si nécessaire',
      'Vérifiez votre niveau d\'accès'
    ]);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflit de données', context = {}) {
    super(message, StatusCodes.CONFLICT, null, {
      ...context,
      type: 'conflict'
    });
    
    // ✅ Hints par défaut pour les erreurs 409
    this.addHints([
      'Une ressource avec ces données existe déjà',
      'Modifiez vos données pour éviter le conflit',
      'Ou supprimez/modifiez l\'élément existant'
    ]);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Requête invalide', context = {}) {
    super(message, StatusCodes.BAD_REQUEST, null, {
      ...context,
      type: 'bad_request'
    });
    
    // ✅ Hints par défaut pour les erreurs 400
    this.addHints([
      'Vérifiez le format de votre requête',
      'Vérifiez les paramètres envoyés',
      'Consultez la documentation de l\'API'
    ]);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Erreur interne du serveur', context = {}) {
    super(message, StatusCodes.INTERNAL_SERVER_ERROR, null, {
      ...context,
      type: 'internal_server_error'
    });
    
    // ✅ Hints par défaut pour les erreurs 500
    this.addHints([
      'Cette erreur a été reportée aux développeurs',
      'Réessayez dans quelques instants',
      'Contactez le support si le problème persiste'
    ]);
  }
}