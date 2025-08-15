// import express from 'express';
// import cors from 'cors';
// import helmet from 'helmet';
// import morgan from 'morgan';
// import compression from 'compression';
// import rateLimit from 'express-rate-limit';
// import mongoSanitize from 'express-mongo-sanitize';

// import routes from './routes/index.js';
// import errorHandler from './middlewares/error.middleware.js';
// import loggerMiddleware from './middlewares/logger.middleware.js';
// import AppError from './utils/AppError.js';

// const app = express();

// // Middlewares de sécurité
// // app.use(helmet());
// // app.use(cors());
// // // app.use(mongoSanitize());

// // Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limite de 100 requêtes
//   message: 'Trop de requêtes, veuillez réessayer plus tard.'
// });
// app.use('/api/', limiter);

// // Middlewares de parsing
// app.use(express.json({ limit: '10kb' }));
// app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// // Compression
// app.use(compression());

// // Logging
// app.use(morgan('combined'));
// app.use(loggerMiddleware);

// // Routes
// app.use('/api', routes);

// // 404 handler
// app.all('/{*any}', (req, res, next) => {
//   next(new AppError(`Impossible de trouver ${req.originalUrl} sur ce serveur!`, 404));
// });

// // Error handler
// app.use(errorHandler);

// export default app;


// import express from 'express';
// import cors from 'cors';
// import helmet from 'helmet';
// import morgan from 'morgan';
// import compression from 'compression';
// import rateLimit from 'express-rate-limit';
// import mongoSanitize from 'express-mongo-sanitize';

// import routes from './routes/index.js';
// import errorHandler, { notFoundHandler } from './middlewares/error.middleware.js';
// import loggerMiddleware from './middlewares/logger.middleware.js';
// import logger from './utils/logger.js';

// const app = express();

// // Trust proxy
// app.set('trust proxy', 1);

// // Middlewares de sécurité
// app.use(helmet({
//   contentSecurityPolicy: {
//     directives: {
//       defaultSrc: ["'self'"],
//       styleSrc: ["'self'", "'unsafe-inline'"],
//       scriptSrc: ["'self'"],
//       imgSrc: ["'self'", "data:", "https:"],
//     },
//   },
// }));

// // CORS
// app.use(cors({
//   origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
// }));

// // Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limite de 100 requêtes
//   message: 'Trop de requêtes depuis cette IP, veuillez réessayer dans 15 minutes.',
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// app.use('/api/', limiter);

// // Rate limiting plus strict pour la création
// const createLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 10,
//   message: 'Trop de créations, veuillez réessayer plus tard.',
// });

// app.use('/api/todolists', createLimiter);

// // Parsing et sanitization
// app.use(express.json({ limit: '10kb' }));
// app.use(express.urlencoded({ extended: true, limit: '10kb' }));
// // app.use(mongoSanitize());

// // Compression
// app.use(compression());

// // Logging
// if (process.env.NODE_ENV === 'development') {
//   app.use(morgan('dev'));
// }
// app.use(loggerMiddleware);

// // Health check
// app.get('/health', (req, res) => {
//   res.status(200).json({
//     status: 'OK',
//     message: 'Server is running',
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//     environment: process.env.NODE_ENV
//   });
// });

// // Routes API
// app.use('/api', routes);

// // Gestion des routes non trouvées
// app.use(notFoundHandler);

// // Gestionnaire d'erreurs global
// app.use(errorHandler);

// // Gestion des rejets de promesses non gérées
// process.on('unhandledRejection', (err) => {
//   logger.error('UNHANDLED REJECTION! 💥', err);
//   // Ne pas arrêter le serveur en développement
//   if (process.env.NODE_ENV === 'production') {
//     process.exit(1);
//   }
// });

// // Gestion des exceptions non capturées
// process.on('uncaughtException', (err) => {
//   logger.error('UNCAUGHT EXCEPTION! 💥', err);
//   process.exit(1);
// });

// export default app;


// src/app.js (modifications à apporter)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import routes from './routes/index.js';
import errorHandler, { notFoundHandler } from './middlewares/error.middleware.js';
import loggerMiddleware from './middlewares/logger.middleware.js';
import { tracingMiddleware } from './middlewares/tracing.middleware.js'; // NOUVEAU
import logger from './utils/logger.js';

const app = express();

// Trust proxy
app.set('trust proxy', 1);

// NOUVEAU: Middleware de traçabilité (à ajouter en premier)
app.use(tracingMiddleware);

// Middlewares de sécurité
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer dans 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Parsing et sanitization
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(loggerMiddleware);

// Health check (ENRICHI avec plus d'infos)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    requestId: req.requestId, // NOUVEAU
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Routes API
app.use('/api', routes);

// Gestion des routes non trouvées
app.use(notFoundHandler);

// Gestionnaire d'erreurs global
app.use(errorHandler);

export default app;