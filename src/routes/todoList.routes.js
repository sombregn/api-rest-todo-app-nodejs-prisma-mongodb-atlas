import express from 'express';
import todoListController from '../controllers/todoList.controller.js';
import {
  validateCreateTodoList,
  validateUpdateTodoList,
  validateMongoId,
  validateCreateTodoItem,
  validateUpdateTodoItem
} from '../middlewares/validation.middleware.js';

const router = express.Router();

// Routes pour les TodoLists
router
  .route('/')
  .get(todoListController.getAllLists)
  .post(validateCreateTodoList, todoListController.createList);

router
  .route('/recent')
  .get(todoListController.getRecentLists);

router
  .route('/name/:name')
  .get(todoListController.getListByName);

router
  .route('/:id')
  .get(validateMongoId, todoListController.getListById)
  .put(validateUpdateTodoList, todoListController.updateList)
  .patch(validateUpdateTodoList, todoListController.patchList)
  .delete(validateMongoId, todoListController.deleteList);

// Routes pour les TodoItems
router
  .route('/:listId/items')
  .post(validateCreateTodoItem, todoListController.addItem);

router
  .route('/:listId/items/:itemId')
  .put(validateUpdateTodoItem, todoListController.updateItem)
  .patch(validateUpdateTodoItem, todoListController.patchItem)
  .delete(todoListController.removeItem);

router
  .route('/:listId/items/:itemId/toggle')
  .patch(todoListController.toggleItemStatus);

export default router;