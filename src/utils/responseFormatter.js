import { StatusCodes } from 'http-status-codes';

/**
 * Classe pour formater les réponses API de manière cohérente
 */
class ResponseFormatter {
  /**
   * Réponse de succès
   */
  success(res, data, message = 'Succès', statusCode = StatusCodes.OK) {
    return res.status(statusCode).json({
      success: true,
      status: 'success',
      statusCode,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Réponse de création
   */
  created(res, data, message = 'Ressource créée avec succès') {
    return this.success(res, data, message, StatusCodes.CREATED);
  }

  /**
   * Réponse de mise à jour
   */
  updated(res, data, message = 'Ressource mise à jour avec succès') {
    return this.success(res, data, message, StatusCodes.OK);
  }

  /**
   * Réponse de suppression
   */
  deleted(res, message = 'Ressource supprimée avec succès') {
    return res.status(StatusCodes.NO_CONTENT).send();
  }

  /**
   * Réponse avec pagination
   */
  paginated(res, data, pagination, message = 'Succès') {
    return res.status(StatusCodes.OK).json({
      success: true,
      status: 'success',
      statusCode: StatusCodes.OK,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.limit),
        hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
        hasPrev: pagination.page > 1
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Réponse d'erreur (utilisée par le middleware d'erreur)
   */
  error(res, message, statusCode = StatusCodes.INTERNAL_SERVER_ERROR, errors = null) {
    return res.status(statusCode).json({
      success: false,
      status: 'error',
      statusCode,
      message,
      errors,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Réponse d'erreur not found enrichie
   */
  notFound(res, message = 'Ressource non trouvée', context = {}) {
    return res.status(StatusCodes.NOT_FOUND).json({
      success: false,
      status: 'fail',
      statusCode: StatusCodes.NOT_FOUND,
      message,
      requestId: res.req?.requestId,
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Réponse de succès enrichie avec métriques
   */
  success(res, data, message = 'Succès', statusCode = StatusCodes.OK, meta = {}) {
    const response = {
      success: true,
      status: 'success',
      statusCode,
      message,
      requestId: res.req?.requestId,
      data,
      timestamp: new Date().toISOString()
    };

    // Ajouter des métriques en développement
    if (process.env.NODE_ENV === 'development' && res.req?.startTime) {
      response.meta = {
        duration: `${Date.now() - res.req.startTime}ms`,
        ...meta
      };
    }

    return res.status(statusCode).json(response);
  }
}

export default new ResponseFormatter();