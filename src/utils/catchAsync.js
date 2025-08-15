import logger from './logger.js';

const catchAsync = (fn, context = {}) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      // Enrichir l'erreur avec le contexte
      if (err.addContext) {
        err.addContext('controller', context.controller || 'unknown');
        err.addContext('action', context.action || 'unknown');
        err.addContext('requestId', req.requestId);
      }
      
      // Logger pour le debugging
      logger.debug('Error caught in catchAsync', {
        requestId: req.requestId,
        error: err.message,
        controller: context.controller,
        action: context.action
      });
      
      next(err);
    });
  };
};

export default catchAsync;