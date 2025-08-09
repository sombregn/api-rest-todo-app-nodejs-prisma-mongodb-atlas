import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

import routes from './routes/index.js';
import errorHandler from './middlewares/error.middleware.js';
import loggerMiddleware from './middlewares/logger.middleware.js';
import AppError from './utils/AppError.js';

const app = express();

// Middlewares de sécurité
// app.use(helmet());
// app.use(cors());
// // app.use(mongoSanitize());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite de 100 requêtes
  message: 'Trop de requêtes, veuillez réessayer plus tard.'
});
app.use('/api/', limiter);

// Middlewares de parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined'));
app.use(loggerMiddleware);

// Routes
app.use('/api', routes);

// 404 handler
app.all('/{*any}', (req, res, next) => {
  next(new AppError(`Impossible de trouver ${req.originalUrl} sur ce serveur!`, 404));
});

// Error handler
app.use(errorHandler);

export default app;