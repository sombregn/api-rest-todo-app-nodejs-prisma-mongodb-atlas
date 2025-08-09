import logger from '../utils/logger.js';

const loggerMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Log de la requête entrante
  logger.info({
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Log de la réponse
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`
    });
  });

  next();
};

export default loggerMiddleware;