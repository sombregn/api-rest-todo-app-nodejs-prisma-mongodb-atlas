import logger from '../utils/logger.js';
import AppError from '../utils/AppError.js';

const handlePrismaError = (err) => {
  if (err.code === 'P2002') {
    return new AppError('Une entrée avec ces données existe déjà', 400);
  }
  if (err.code === 'P2025') {
    return new AppError('Enregistrement non trouvé', 404);
  }
  return new AppError('Erreur de base de données', 500);
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    logger.error('ERROR 💥', err);
    res.status(500).json({
      status: 'error',
      message: 'Une erreur est survenue!'
    });
  }
};

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  logger.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    if (err.code && err.code.startsWith('P')) {
      error = handlePrismaError(err);
    }

    sendErrorProd(error, res);
  }
};

export default errorHandler;