import { StatusCodes } from 'http-status-codes';
import todoListService from '../services/todoList.service.js';
import todoListMapper from '../mappers/todoList.mapper.js';
import todoItemMapper from '../mappers/todoItem.mapper.js';
import catchAsync from '../utils/catchAsync.js';
import responseFormatter from '../utils/responseFormatter.js';
import logger from '../utils/logger.js';

// ✅ IMPORTS DES ERREURS ENRICHIES
import { NotFoundError, ConflictError } from '../utils/AppError.js';

class TodoListController {
  /**
   * GET /api/todolists
   * Récupérer toutes les listes avec filtres et pagination
   */
  getAllLists = catchAsync(async (req, res) => {
    const { status, limit, page, sortBy, order } = req.query;
    
    logger.info('📋 Getting all lists', { 
      requestId: req.requestId,
      filters: req.query,
      validatedQuery: { status, limit, page, sortBy, order }
    });
    
    const filters = {};
    if (status) filters.status = status;

    const lists = await todoListService.getAllLists(filters, {
      limit,
      page,
      sortBy,
      order
    }, req.requestId);

    const mappedLists = todoListMapper.toAPIList(lists.data);
    
    return responseFormatter.paginated(
      res,
      { lists: mappedLists },
      {
        page: lists.page,
        limit: lists.limit,
        total: lists.total
      },
      'Listes récupérées avec succès'
    );
  }, { controller: 'TodoListController', action: 'getAllLists' });

  /**
   * GET /api/todolists/recent
   * Récupérer les listes récemment modifiées
   */
  getRecentLists = catchAsync(async (req, res) => {
    const { limit } = req.query;
    
    logger.info('📋 Getting recent lists', { 
      requestId: req.requestId,
      limit 
    });
    
    const lists = await todoListService.getRecentLists(limit, req.requestId);
    const mappedLists = lists.map(list => todoListMapper.toSummary(list));
    
    return responseFormatter.success(
      res,
      { lists: mappedLists },
      `${mappedLists.length} listes récentes récupérées`
    );
  }, { controller: 'TodoListController', action: 'getRecentLists' });

  /**
   * GET /api/todolists/:id
   * Récupérer une liste par ID
   */
  getListById = catchAsync(async (req, res) => {
    const { id } = req.params;
    
    logger.info('📋 Fetching todo list', { 
      requestId: req.requestId,
      listId: id,
      userAgent: req.get('user-agent')
    });
    
    const list = await todoListService.getListById(id, req.requestId);
    
    if (!list) {
      throw new NotFoundError('Liste TODO')
        .addContext('listId', id)
        .addContext('action', 'getListById')
        .addContext('requestId', req.requestId)
        .addHint('Vérifiez que l\'ID fourni est correct')
        .addHint('Consultez GET /api/todolists pour voir les listes disponibles')
        .addHint('L\'ID doit être un ObjectID MongoDB valide');
    }
    
    const mappedList = todoListMapper.toAPI(list);
    
    logger.info('✅ Todo list retrieved successfully', { 
      requestId: req.requestId,
      listId: id,
      itemCount: list.items?.length || 0
    });
    
    return responseFormatter.success(
      res,
      { list: mappedList },
      'Liste récupérée avec succès'
    );
  }, { controller: 'TodoListController', action: 'getListById' });

  /**
   * GET /api/todolists/by-name/:name
   * Récupérer une liste par nom
   */
  getListByName = catchAsync(async (req, res) => {
    const { name } = req.params;
    
    logger.info('📋 Getting list by name', { 
      requestId: req.requestId,
      name 
    });
    
    try {
      const list = await todoListService.getListByName(name, req.requestId);
      const mappedList = todoListMapper.toAPI(list);
      
      return responseFormatter.success(
        res,
        { list: mappedList },
        'Liste trouvée'
      );
    } catch (error) {
      if (error instanceof NotFoundError) {
        error.addContext('searchName', name)
             .addContext('action', 'getListByName')
             .addHint('Vérifiez l\'orthographe du nom')
             .addHint('La recherche est insensible à la casse')
             .addHint('Consultez GET /api/todolists pour voir les noms disponibles');
      }
      throw error;
    }
  }, { controller: 'TodoListController', action: 'getListByName' });

  /**
   * POST /api/todolists
   * Créer une nouvelle liste
   */
  createList = catchAsync(async (req, res) => {
    logger.info('🆕 Creating new todo list', { 
      requestId: req.requestId,
      title: req.body.title,
      dataSize: JSON.stringify(req.body).length
    });
    
    try {
      const dbData = todoListMapper.toDBCreate(req.body);
      const list = await todoListService.createList(dbData, req.requestId);
      const mappedList = todoListMapper.toAPI(list);
      
      logger.info('✅ Todo list created successfully', { 
        requestId: req.requestId,
        listId: list.id,
        title: list.title
      });
      
      return responseFormatter.created(
        res,
        { list: mappedList },
        'Liste créée avec succès'
      );
    } catch (error) {
      if (error.addContext) {
        error.addContext('operation', 'createList')
             .addContext('inputData', req.body)
             .addContext('dataValidation', 'passed')
             .addContext('requestId', req.requestId);
      }
      
      if (error instanceof ConflictError) {
        error.addHint('Modifiez le titre de votre liste')
             .addHint('Ou mettez à jour la liste existante avec PUT /api/todolists/:id')
             .addHint('Les titres doivent être uniques (insensible à la casse)');
      }
      
      throw error;
    }
  }, { controller: 'TodoListController', action: 'createList' });

  /**
   * PUT /api/todolists/:id
   * Mettre à jour complètement une liste
   */
  updateList = catchAsync(async (req, res) => {
    const { id } = req.params;
    
    logger.info('🔄 Updating list', { 
      requestId: req.requestId,
      id, 
      data: req.body,
      validation: 'passed'
    });
    
    try {
      const dbData = todoListMapper.toDBUpdate(req.body);
      const list = await todoListService.updateList(id, dbData, req.requestId);
      
      if (!list) {
        throw new NotFoundError('Liste TODO')
          .addContext('listId', id)
          .addContext('operation', 'update')
          .addContext('requestId', req.requestId)
          .addHint('Vérifiez que l\'ID existe avec GET /api/todolists/:id')
          .addHint('La liste a peut-être été supprimée');
      }
      
      const mappedList = todoListMapper.toAPI(list);
      
      logger.info('✅ List updated successfully', { 
        requestId: req.requestId,
        id 
      });
      
      return responseFormatter.updated(
        res,
        { list: mappedList },
        'Liste mise à jour avec succès'
      );
    } catch (error) {
      if (error instanceof ConflictError) {
        error.addHint('Un autre élément utilise déjà ce titre')
             .addHint('Choisissez un titre différent');
      }
      throw error;
    }
  }, { controller: 'TodoListController', action: 'updateList' });

  /**
   * PATCH /api/todolists/:id
   * Mettre à jour partiellement une liste
   */
  patchList = catchAsync(async (req, res) => {
    const { id } = req.params;
    
    logger.info('🔄 Patching list', { 
      requestId: req.requestId,
      id, 
      data: req.body,
      fieldsCount: Object.keys(req.body).length
    });
    
    try {
      const dbData = todoListMapper.toDBUpdate(req.body);
      const list = await todoListService.updateList(id, dbData, req.requestId);
      
      if (!list) {
        throw new NotFoundError('Liste TODO')
          .addContext('listId', id)
          .addContext('operation', 'patch')
          .addContext('fieldsUpdated', Object.keys(req.body))
          .addContext('requestId', req.requestId)
          .addHint('Vérifiez que l\'ID existe')
          .addHint('Pour une création, utilisez POST /api/todolists');
      }
      
      const mappedList = todoListMapper.toAPI(list);
      
      logger.info('✅ List patched successfully', { 
        requestId: req.requestId,
        id 
      });
      
      return responseFormatter.updated(
        res,
        { list: mappedList },
        'Liste mise à jour avec succès'
      );
    } catch (error) {
      if (error instanceof ConflictError) {
        error.addHint('Conflit détecté sur un champ modifié')
             .addHint('Vérifiez les données existantes');
      }
      throw error;
    }
  }, { controller: 'TodoListController', action: 'patchList' });

  /**
   * DELETE /api/todolists/:id
   * Supprimer une liste
   */
  deleteList = catchAsync(async (req, res) => {
    const { id } = req.params;
    
    logger.info('🗑️ Deleting todo list', { 
      requestId: req.requestId,
      listId: id
    });
    
    try {
      const deleted = await todoListService.deleteList(id, req.requestId);
      
      if (!deleted) {
        throw new NotFoundError('Liste TODO')
          .addContext('listId', id)
          .addContext('operation', 'delete')
          .addContext('requestId', req.requestId)
          .addHint('La liste a peut-être déjà été supprimée')
          .addHint('Vérifiez que l\'ID existe avec GET /api/todolists/:id')
          .addHint('Utilisez GET /api/todolists pour voir les listes disponibles');
      }
      
      logger.info('✅ Todo list deleted successfully', { 
        requestId: req.requestId,
        listId: id
      });
      
      return responseFormatter.deleted(res, 'Liste supprimée avec succès');
    } catch (error) {
      logger.error('❌ Error deleting todo list', {
        requestId: req.requestId,
        listId: id,
        error: error.message,
        stack: error.stack?.split('\n')[0]
      });
      
      if (error instanceof NotFoundError) {
        error.addHint('Impossible de supprimer une liste inexistante');
      }
      
      throw error;
    }
  }, { controller: 'TodoListController', action: 'deleteList' });

  /**
   * POST /api/todolists/:listId/items
   * Ajouter un item à une liste
   */
  addItem = catchAsync(async (req, res) => {
    const { listId } = req.params;
    
    logger.info('➕ Adding item to list', { 
      requestId: req.requestId,
      listId, 
      data: req.body,
      validation: 'passed'
    });
    
    try {
      const dbData = todoItemMapper.toDBCreate(req.body, listId);
      const item = await todoListService.addItemToList(listId, dbData, req.requestId);
      const mappedItem = todoItemMapper.toAPI(item);
      
      logger.info('✅ Item added successfully', { 
        requestId: req.requestId,
        listId, 
        itemId: item.id 
      });
      
      return responseFormatter.created(
        res,
        { item: mappedItem },
        'Item ajouté avec succès'
      );
    } catch (error) {
      if (error instanceof NotFoundError) {
        error.addContext('operation', 'addItem')
             .addContext('targetListId', listId)
             .addHint('Vérifiez que la liste parente existe')
             .addHint('Créez d\'abord la liste avec POST /api/todolists');
      }
      throw error;
    }
  }, { controller: 'TodoListController', action: 'addItem' });

  /**
   * PUT /api/todolists/:listId/items/:itemId
   * Mettre à jour complètement un item
   */
  updateItem = catchAsync(async (req, res) => {
    const { listId, itemId } = req.params;
    
    logger.info('🔄 Updating item', { 
      requestId: req.requestId,
      listId, 
      itemId, 
      data: req.body,
      validation: 'passed'
    });
    
    try {
      const dbData = todoItemMapper.toDBUpdate(req.body);
      const item = await todoListService.updateItem(listId, itemId, dbData, req.requestId);
      
      if (!item) {
        throw new NotFoundError('Item')
          .addContext('listId', listId)
          .addContext('itemId', itemId)
          .addContext('operation', 'updateItem')
          .addHint('Vérifiez que l\'item et la liste existent')
          .addHint('Vérifiez que l\'item appartient à cette liste');
      }
      
      const mappedItem = todoItemMapper.toAPI(item);
      
      logger.info('✅ Item updated successfully', { 
        requestId: req.requestId,
        listId, 
        itemId 
      });
      
      return responseFormatter.updated(
        res,
        { item: mappedItem },
        'Item mis à jour avec succès'
      );
    } catch (error) {
      if (error instanceof NotFoundError) {
        error.addHint('L\'item n\'existe pas ou n\'appartient pas à cette liste');
      }
      throw error;
    }
  }, { controller: 'TodoListController', action: 'updateItem' });

  /**
   * PATCH /api/todolists/:listId/items/:itemId
   * Mettre à jour partiellement un item
   */
  patchItem = catchAsync(async (req, res) => {
    const { listId, itemId } = req.params;
    
    logger.info('🔄 Patching item', { 
      requestId: req.requestId,
      listId, 
      itemId, 
      data: req.body,
      fieldsCount: Object.keys(req.body).length
    });
    
    try {
      const dbData = todoItemMapper.toDBUpdate(req.body);
      const item = await todoListService.updateItem(listId, itemId, dbData, req.requestId);
      
      if (!item) {
        throw new NotFoundError('Item')
          .addContext('listId', listId)
          .addContext('itemId', itemId)
          .addContext('operation', 'patchItem')
          .addContext('fieldsUpdated', Object.keys(req.body))
          .addHint('Vérifiez que l\'item et la liste existent')
          .addHint('Vérifiez que l\'item appartient à cette liste');
      }
      
      const mappedItem = todoItemMapper.toAPI(item);
      
      logger.info('✅ Item patched successfully', { 
        requestId: req.requestId,
        listId, 
        itemId 
      });
      
      return responseFormatter.updated(
        res,
        { item: mappedItem },
        'Item mis à jour avec succès'
      );
    } catch (error) {
      if (error instanceof NotFoundError) {
        error.addHint('L\'item n\'existe pas dans cette liste');
      }
      throw error;
    }
  }, { controller: 'TodoListController', action: 'patchItem' });

  /**
   * DELETE /api/todolists/:listId/items/:itemId
   * Supprimer un item d'une liste
   */
  removeItem = catchAsync(async (req, res) => {
    const { listId, itemId } = req.params;
    
    logger.info('🗑️ Removing item from list', { 
      requestId: req.requestId,
      listId, 
      itemId 
    });
    
    try {
      const deleted = await todoListService.removeItemFromList(listId, itemId, req.requestId);
      
      if (!deleted) {
        throw new NotFoundError('Item')
          .addContext('listId', listId)
          .addContext('itemId', itemId)
          .addContext('operation', 'removeItem')
          .addHint('L\'item a peut-être déjà été supprimé')
          .addHint('Vérifiez que l\'item appartient à cette liste');
      }
      
      logger.info('✅ Item removed successfully', { 
        requestId: req.requestId,
        listId, 
        itemId 
      });
      
      return responseFormatter.deleted(res, 'Item supprimé avec succès');
    } catch (error) {
      if (error instanceof NotFoundError) {
        error.addHint('Impossible de supprimer un item inexistant');
      }
      throw error;
    }
  }, { controller: 'TodoListController', action: 'removeItem' });

  /**
   * PATCH /api/todolists/:listId/items/:itemId/toggle
   * Basculer le statut d'un item
   */
  toggleItemStatus = catchAsync(async (req, res) => {
    const { listId, itemId } = req.params;
    
    logger.info('🔄 Toggling item status', { 
      requestId: req.requestId,
      listId, 
      itemId 
    });
    
    try {
      const item = await todoListService.toggleItemStatus(listId, itemId, req.requestId);
      
      if (!item) {
        throw new NotFoundError('Item')
          .addContext('listId', listId)
          .addContext('itemId', itemId)
          .addContext('operation', 'toggleStatus')
          .addHint('Vérifiez que l\'item existe dans cette liste')
          .addHint('Utilisez GET /api/todolists/:id pour voir les items');
      }
      
      const mappedItem = todoItemMapper.toAPI(item);
      
      logger.info('✅ Item status toggled', { 
        requestId: req.requestId,
        listId, 
        itemId, 
        newStatus: item.status 
      });
      
      return responseFormatter.updated(
        res,
        { item: mappedItem },
        `Item marqué comme ${item.status === 'COMPLETED' ? 'terminé' : 'non terminé'}`
      );
    } catch (error) {
      if (error instanceof NotFoundError) {
        error.addHint('L\'item n\'existe pas dans cette liste');
      }
      throw error;
    }
  }, { controller: 'TodoListController', action: 'toggleItemStatus' });
}

// ✅ EXPORT CORRECT
export default new TodoListController();