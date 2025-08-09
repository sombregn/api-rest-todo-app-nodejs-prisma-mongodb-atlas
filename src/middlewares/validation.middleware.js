import { body, param, query, validationResult } from 'express-validator';
import AppError from '../utils/AppError.js';

// Middleware pour vérifier les erreurs de validation
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return next(new AppError(errorMessages.join(', '), 400));
  }
  next();
};

// Validations pour TodoList
export const validateCreateTodoList = [
  body('title')
    .trim()
    .notEmpty().withMessage('Le titre est requis')
    .isLength({ min: 3, max: 100 }).withMessage('Le titre doit contenir entre 3 et 100 caractères'),
  body('status')
    .optional()
    .isIn(['TODO', 'IN_PROGRESS', 'DONE']).withMessage('Le status doit être TODO, IN_PROGRESS ou DONE'),
  handleValidationErrors
];

export const validateUpdateTodoList = [
  param('id').isMongoId().withMessage('ID invalide'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Le titre doit contenir entre 3 et 100 caractères'),
  body('status')
    .optional()
    .isIn(['TODO', 'IN_PROGRESS', 'DONE']).withMessage('Le status doit être TODO, IN_PROGRESS ou DONE'),
  handleValidationErrors
];

// Validations pour TodoItem
export const validateCreateTodoItem = [
  param('listId').isMongoId().withMessage('ID de liste invalide'),
  body('label')
    .trim()
    .notEmpty().withMessage('Le libellé est requis')
    .isLength({ min: 1, max: 200 }).withMessage('Le libellé doit contenir entre 1 et 200 caractères'),
  body('status')
    .optional()
    .isIn(['COMPLETED', 'NOT_COMPLETED']).withMessage('Le status doit être COMPLETED ou NOT_COMPLETED'),
  handleValidationErrors
];

export const validateUpdateTodoItem = [
  param('listId').isMongoId().withMessage('ID de liste invalide'),
  param('itemId').isMongoId().withMessage('ID d\'item invalide'),
  body('label')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 }).withMessage('Le libellé doit contenir entre 1 et 200 caractères'),
  body('status')
    .optional()
    .isIn(['COMPLETED', 'NOT_COMPLETED']).withMessage('Le status doit être COMPLETED ou NOT_COMPLETED'),
  handleValidationErrors
];

export const validateMongoId = [
  param('id').isMongoId().withMessage('ID invalide'),
  handleValidationErrors
];