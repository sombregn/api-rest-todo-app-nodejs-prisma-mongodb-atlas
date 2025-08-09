import express from 'express';
import todoListRoutes from './todoList.routes.js';

const router = express.Router();

// Route de santé
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running'
  });
});

// Routes principales
router.use('/todolists', todoListRoutes);

export default router;


