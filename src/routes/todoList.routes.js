import express from 'express';
import todoListController from '../controllers/todoList.controller.js';
import { validate } from '../middlewares/validation.middleware.js';
import {
  createTodoListSchema,
  updateTodoListSchema,
  patchTodoListSchema,
  getTodoListByIdSchema,
  getTodoListByNameSchema,
  getAllTodoListsSchema,
  deleteTodoListSchema
} from '../schemas/todoList.schema.js';
import {
  createTodoItemSchema,
  updateTodoItemSchema,
  deleteTodoItemSchema,
  toggleTodoItemSchema
} from '../schemas/todoItem.schema.js'; 

const router = express.Router();

// ===== ROUTES POUR LES LISTES =====
router.route('/')
  .get(validate(getAllTodoListsSchema), todoListController.getAllLists)
  .post(validate(createTodoListSchema), todoListController.createList);

router.get('/recent', validate(getAllTodoListsSchema), todoListController.getRecentLists);
router.get('/by-name/:name', validate(getTodoListByNameSchema), todoListController.getListByName);

router.route('/:id')
  .get(validate(getTodoListByIdSchema), todoListController.getListById)
  .put(validate(updateTodoListSchema), todoListController.updateList)
  .patch(validate(patchTodoListSchema), todoListController.patchList)
  .delete(validate(deleteTodoListSchema), todoListController.deleteList);

// ===== ROUTES POUR LES ITEMS =====
router.post('/:listId/items', validate(createTodoItemSchema), todoListController.addItem);

router.route('/:listId/items/:itemId')
  .put(validate(updateTodoItemSchema), todoListController.updateItem)
  .patch(validate(updateTodoItemSchema), todoListController.patchItem)
  .delete(validate(deleteTodoItemSchema), todoListController.removeItem);

router.patch('/:listId/items/:itemId/toggle', validate(toggleTodoItemSchema), todoListController.toggleItemStatus);

export default router;