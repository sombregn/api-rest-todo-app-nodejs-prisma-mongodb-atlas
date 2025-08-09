import app from './src/app.js';
import config from './src/config/config.js';
import logger from './src/utils/logger.js';
import prisma from './src/models/prisma.js';

// Gestion des erreurs non capturées
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  process.exit(1);
});

// Connexion à la base de données et démarrage du serveur
const startServer = async () => {
  try {
    // Tester la connexion Prisma
    await prisma.$connect();
    logger.info('✅ Database connected successfully');

    // Démarrer le serveur
    const server = app.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port}`);
      logger.info(`📝 Environment: ${config.env}`);
    });

    // Gestion des promesses rejetées
    process.on('unhandledRejection', (err) => {
      logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
      logger.error(err);
      server.close(() => {
        process.exit(1);
      });
    });

    // Gestion de l'arrêt gracieux
    process.on('SIGTERM', () => {
      logger.info('👋 SIGTERM received. Shutting down gracefully');
      server.close(() => {
        logger.info('💤 Process terminated!');
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;


// // server.js
// import express from 'express';
// import dotenv from 'dotenv';

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 3000;

// app.use(express.json());

// // // Route de test
// // app.get('/api/health', (req, res) => {
// //   res.json({ status: 'OK', message: 'Server is running' });
// // });

// app.listen(PORT, () => {
//   console.log(`✅ Server running on port ${PORT}`);
// });


