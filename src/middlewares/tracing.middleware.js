import { generateRequestId } from '../utils/errorUtils.js';
import logger from '../utils/logger.js';

/**
 * Middleware pour ajouter un ID unique à chaque requête
 */
export const tracingMiddleware = (req, res, next) => {
  // Générer un ID unique pour cette requête
  req.requestId = generateRequestId();
  
  // Ajouter l'ID dans les headers de réponse
  res.set('X-Request-ID', req.requestId);
  
  // Logger le début de la requête
  logger.info('🚀 Request started', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString()
  });
  
  // Capturer le temps de début
  req.startTime = Date.now();
  
  // Hook sur la fin de la réponse
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - req.startTime;
    
    logger.info('✅ Request completed', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
    
    return originalSend.call(this, body);
  };
  
  next();
};