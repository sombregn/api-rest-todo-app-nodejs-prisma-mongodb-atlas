import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import todoListService from "../services/todoList.service.js";

class TodoListController {
  // GET /api/todolists
  getAllLists = catchAsync(async (req, res, next) => {
    const { status } = req.query;
    const filters = {};

    if (status) {
      filters.status = status;
    }

    const lists = await todoListService.getAllLists(filters);

    res.status(200).json({
      status: "success",
      results: lists.length,
      data: {
        lists,
      },
    });
  });

  // GET /api/todolists/recent
  getRecentLists = catchAsync(async (req, res, next) => {
    const limit = parseInt(req.query.limit) || 10;
    const lists = await todoListService.getRecentLists(limit);

    res.status(200).json({
      status: "success",
      results: lists.length,
      data: {
        lists,
      },
    });
  });

  // GET /api/todolists/:id
  getListById = catchAsync(async (req, res, next) => {
    const list = await todoListService.getListById(req.params.id);

    res.status(200).json({
      status: "success",
      data: {
        list,
      },
    });
  });

  // GET /api/todolists/name/:name
  getListByName = catchAsync(async (req, res, next) => {
    const list = await todoListService.getListByName(req.params.name);

    res.status(200).json({
      status: "success",
      data: {
        list,
      },
    });
  });

  // POST /api/todolists
  createList = catchAsync(async (req, res, next) => {
    const list = await todoListService.createList(req.body);

    res.status(201).json({
      status: "success",
      data: {
        list,
      },
    });
  });

  // PUT /api/todolists/:id
  updateList = catchAsync(async (req, res, next) => {
    const list = await todoListService.updateList(req.params.id, req.body);

    res.status(200).json({
      status: "success",
      data: {
        list,
      },
    });
  });

  // PATCH /api/todolists/:id
  patchList = catchAsync(async (req, res, next) => {
    const list = await todoListService.updateList(req.params.id, req.body);

    res.status(200).json({
      status: "success",
      data: {
        list,
      },
    });
  });

  // DELETE /api/todolists/:id
  deleteList = catchAsync(async (req, res, next) => {
    await todoListService.deleteList(req.params.id);

    res.status(204).json({
      status: "success",
      data: null,
    });
  });

  // --- GESTION DES ITEMS ---

  // POST /api/todolists/:listId/items
  addItem = catchAsync(async (req, res, next) => {
    const item = await todoListService.addItemToList(
      req.params.listId,
      req.body
    );

    res.status(201).json({
      status: "success",
      data: {
        item,
      },
    });
  });

  // PUT /api/todolists/:listId/items/:itemId
  updateItem = catchAsync(async (req, res, next) => {
    const { listId, itemId } = req.params;
    const item = await todoListService.updateItem(listId, itemId, req.body);

    res.status(200).json({
      status: 'success',
      data: {
        item
      }
    });
  });
  // PUT /api/todolists/:listId/items/:itemId
//  updateItem = catchAsync(async (req, res, next) => {
//   const { listId, itemId } = req.params;
  
//   console.log('=== CONTROLLER DEBUG ===');
//   console.log('Body received:', req.body);
//   console.log('Body keys:', Object.keys(req.body || {}));
//   console.log('========================');
  
//   const item = await todoListService.updateItem(listId, itemId, req.body);
 
//   res.status(200).json({
//     status: 'success',
//     data: {
//       item
//     }
//   });
// });

  // PATCH /api/todolists/:listId/items/:itemId
  patchItem = catchAsync(async (req, res, next) => {
    const { listId, itemId } = req.params;
    const item = await todoListService.updateItem(listId, itemId, req.body);

    res.status(200).json({
      status: "success",
      data: {
        item,
      },
    });
  });

  // DELETE /api/todolists/:listId/items/:itemId
  removeItem = catchAsync(async (req, res, next) => {
    const { listId, itemId } = req.params;
    await todoListService.removeItemFromList(listId, itemId);

    res.status(204).json({
      status: "success",
      data: null,
    });
  });

  // PATCH /api/todolists/:listId/items/:itemId/toggle
  toggleItemStatus = catchAsync(async (req, res, next) => {
    const { listId, itemId } = req.params;
    const item = await todoListService.toggleItemStatus(listId, itemId);

    res.status(200).json({
      status: "success",
      data: {
        item,
      },
    });
  });
}

export default new TodoListController();
