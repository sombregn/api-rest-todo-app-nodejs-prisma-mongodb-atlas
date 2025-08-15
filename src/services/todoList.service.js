import prisma from '../models/prisma.js';
import { NotFoundError, ConflictError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

class TodoListService {
  /**
   * Récupérer toutes les listes avec pagination
   */
  async getAllLists(filters = {}, options = {}, requestId = null) {
    const { 
      limit = 10, 
      page = 1, 
      sortBy = 'updatedAt', 
      order = 'desc' 
    } = options;

    try {
      logger.debug('🔍 Querying all lists from database', { 
        filters,
        options,
        requestId
      });

      const skip = (page - 1) * limit;

      const [lists, total] = await prisma.$transaction([
        prisma.todoList.findMany({
          where: filters,
          include: {
            items: true,
            _count: {
              select: { items: true }
            }
          },
          orderBy: {
            [sortBy]: order
          },
          skip,
          take: limit
        }),
        prisma.todoList.count({ where: filters })
      ]);

      logger.info(`✅ Retrieved ${lists.length} todo lists`, { 
        filters, 
        options,
        total,
        requestId 
      });

      return {
        data: lists,
        page,
        limit,
        total
      };
    } catch (error) {
      logger.error('💥 Error fetching todo lists:', {
        error: error.message,
        filters,
        options,
        requestId
      });
      throw error;
    }
  }

  /**
   * Récupérer une liste par ID
   */
  async getListById(id, requestId = null) {
    try {
      logger.debug('🔍 Querying database for todo list', { 
        listId: id,
        requestId,
        operation: 'findUnique'
      });

      const list = await prisma.todoList.findUnique({
        where: { id },
        include: {
          items: {
            orderBy: {
              createdAt: 'desc'
            }
          },
          _count: {
            select: { items: true }
          }
        }
      });

      if (!list) {
        logger.warn('🚫 Todo list not found in database', { 
          listId: id,
          requestId
        });
        
        throw new NotFoundError('Liste TODO')
          .addContext('listId', id)
          .addContext('database', 'checked')
          .addContext('operation', 'getListById')
          .addContext('requestId', requestId)
          .addHint('Vérifiez que l\'ID fourni est correct')
          .addHint('L\'ID doit être un ObjectID MongoDB valide')
          .addHint('Consultez GET /api/todolists pour voir les listes disponibles')
          .addHint('La liste a peut-être été supprimée');
      }

      logger.debug('✅ Todo list found in database', { 
        listId: id,
        requestId,
        itemCount: list._count.items,
        lastUpdated: list.updatedAt
      });

      return list;
    } catch (error) {
      if (error.isOperational) throw error;
      
      logger.error('💥 Database error in getListById', {
        listId: id,
        requestId,
        error: error.message,
        isPrismaError: error.constructor.name.includes('Prisma')
      });
      
      throw error;
    }
  }

  /**
   * Récupérer une liste par nom
   */
  async getListByName(title, requestId = null) {
    try {
      logger.debug('🔍 Querying database for todo list by name', { 
        title,
        requestId
      });

      const list = await prisma.todoList.findFirst({
        where: {
          title: {
            equals: title,
            mode: 'insensitive'
          }
        },
        include: {
          items: true,
          _count: {
            select: { items: true }
          }
        }
      });

      if (!list) {
        logger.warn('🚫 Todo list not found by name', { 
          title,
          requestId
        });
        
        throw new NotFoundError(`Liste avec le nom "${title}"`)
          .addContext('searchTitle', title)
          .addContext('searchMode', 'insensitive')
          .addContext('operation', 'getListByName')
          .addContext('requestId', requestId)
          .addHint('Vérifiez l\'orthographe du nom de la liste')
          .addHint('La recherche ignore la casse (majuscules/minuscules)')
          .addHint('Consultez GET /api/todolists pour voir tous les noms');
      }

      logger.info(`✅ Retrieved todo list with title: ${title}`, {
        listId: list.id,
        requestId
      });
      
      return list;
    } catch (error) {
      if (error.isOperational) throw error;
      
      logger.error(`💥 Error fetching todo list by name ${title}:`, {
        error: error.message,
        requestId
      });
      throw error;
    }
  }

  /**
   * Créer une nouvelle liste
   */
  async createList(data, requestId = null) {
    try {
      logger.debug('🔍 Checking for existing list with same title', { 
        title: data.title,
        requestId
      });

      const existingList = await prisma.todoList.findFirst({
        where: {
          title: {
            equals: data.title,
            mode: 'insensitive'
          }
        }
      });

      if (existingList) {
        logger.warn('🚫 List with same title already exists', { 
          title: data.title,
          existingListId: existingList.id,
          requestId
        });
        
        throw new ConflictError(`Une liste avec le titre "${data.title}" existe déjà`)
          .addContext('conflictField', 'title')
          .addContext('conflictValue', data.title)
          .addContext('existingListId', existingList.id)
          .addContext('operation', 'createList')
          .addContext('requestId', requestId)
          .addHint('Choisissez un titre différent pour votre liste')
          .addHint('Ou modifiez la liste existante avec PUT /api/todolists/' + existingList.id)
          .addHint('Les titres doivent être uniques (insensible à la casse)')
          .addHint('Vous pouvez récupérer la liste existante avec GET /api/todolists/' + existingList.id);
      }

      logger.debug('🆕 Creating new list in database', { 
        title: data.title,
        requestId
      });

      const list = await prisma.todoList.create({
        data,
        include: {
          items: true,
          _count: {
            select: { items: true }
          }
        }
      });

      logger.info('✅ New todo list created successfully', { 
        listId: list.id,
        title: list.title,
        requestId
      });

      return list;
    } catch (error) {
      if (error.isOperational) throw error;
      
      logger.error('💥 Database error in createList', {
        title: data.title,
        requestId,
        error: error.message,
        data: JSON.stringify(data)
      });
      
      throw error;
    }
  }

  /**
   * Mettre à jour une liste
   */
  async updateList(id, data, requestId = null) {
    try {
      // Vérifier que la liste existe d'abord
      await this.getListById(id, requestId);

      // Si le titre est modifié, vérifier l'unicité
      if (data.title) {
        logger.debug('🔍 Checking title uniqueness for update', {
          listId: id,
          newTitle: data.title,
          requestId
        });

        const existingList = await prisma.todoList.findFirst({
          where: {
            title: {
              equals: data.title,
              mode: 'insensitive'
            },
            NOT: { id }
          }
        });

        if (existingList) {
          throw new ConflictError(`Une liste avec le titre "${data.title}" existe déjà`)
            .addContext('conflictField', 'title')
            .addContext('conflictValue', data.title)
            .addContext('currentListId', id)
            .addContext('existingListId', existingList.id)
            .addContext('operation', 'updateList')
            .addContext('requestId', requestId)
            .addHint('Choisissez un titre différent')
            .addHint('Ou supprimez/modifiez la liste en conflit');
        }
      }

      const list = await prisma.todoList.update({
        where: { id },
        data,
        include: {
          items: true,
          _count: {
            select: { items: true }
          }
        }
      });

      logger.info(`✅ Updated todo list: ${id}`, {
        requestId,
        updatedFields: Object.keys(data)
      });
      
      return list;
    } catch (error) {
      if (error.isOperational) throw error;
      
      logger.error(`💥 Error updating todo list ${id}:`, {
        error: error.message,
        requestId
      });
      throw error;
    }
  }

  /**
   * Supprimer une liste
   */
  async deleteList(id, requestId = null) {
    try {
      // Vérifier que la liste existe d'abord
      const existingList = await this.getListById(id, requestId);

      logger.debug('🗑️ Deleting list from database', {
        listId: id,
        listTitle: existingList.title,
        itemCount: existingList._count.items,
        requestId
      });

      await prisma.todoList.delete({
        where: { id }
      });

      logger.info(`✅ Deleted todo list: ${id}`, {
        requestId,
        deletedTitle: existingList.title
      });
      
      return { message: 'Liste supprimée avec succès' };
    } catch (error) {
      if (error.isOperational) throw error;
      
      logger.error(`💥 Error deleting todo list ${id}:`, {
        error: error.message,
        requestId
      });
      throw error;
    }
  }

  /**
   * Récupérer les listes récemment modifiées
   */
  async getRecentLists(limit = 10, requestId = null) {
    try {
      logger.debug('🔍 Querying recent lists', {
        limit,
        requestId
      });

      const lists = await prisma.todoList.findMany({
        take: limit,
        orderBy: {
          updatedAt: 'desc'
        },
        include: {
          items: {
            take: 5,
            orderBy: {
              updatedAt: 'desc'
            }
          },
          _count: {
            select: { items: true }
          }
        }
      });

      logger.info(`✅ Retrieved ${lists.length} recent todo lists`, {
        requestId
      });
      
      return lists;
    } catch (error) {
      logger.error('💥 Error fetching recent todo lists:', {
        error: error.message,
        requestId
      });
      throw error;
    }
  }

  /**
   * Ajouter un item à une liste
   */
  async addItemToList(listId, itemData, requestId = null) {
    try {
      // Vérifier que la liste existe
      await this.getListById(listId, requestId);

      logger.debug('➕ Adding item to database', {
        listId,
        itemData,
        requestId
      });

      const item = await prisma.todoItem.create({
        data: itemData
      });

      // Mettre à jour la date de modification de la liste
      await prisma.todoList.update({
        where: { id: listId },
        data: { updatedAt: new Date() }
      });

      logger.info(`✅ Added item to list ${listId}`, { 
        itemId: item.id,
        requestId 
      });
      
      return item;
    } catch (error) {
      if (error.isOperational) throw error;
      
      logger.error(`💥 Error adding item to list ${listId}:`, {
        error: error.message,
        requestId
      });
      throw error;
    }
  }

  /**
   * Mettre à jour un item
   */
  async updateItem(listId, itemId, itemData, requestId = null) {
    try {
      logger.debug('🔍 Checking if item exists in list', {
        listId,
        itemId,
        requestId
      });

      const existingItem = await prisma.todoItem.findFirst({
        where: {
          id: itemId,
          todoListId: listId
        }
      });

      if (!existingItem) {
        throw new NotFoundError('Item')
          .addContext('listId', listId)
          .addContext('itemId', itemId)
          .addContext('operation', 'updateItem')
          .addContext('requestId', requestId)
          .addHint('Vérifiez que l\'item existe dans cette liste')
          .addHint('L\'item appartient peut-être à une autre liste')
          .addHint('Consultez GET /api/todolists/:id pour voir les items');
      }

      logger.debug('🔄 Updating item in database', {
        listId,
        itemId,
        itemData,
        requestId
      });

      const item = await prisma.todoItem.update({
        where: { id: itemId },
        data: itemData
      });

      // Mettre à jour la date de modification de la liste
      await prisma.todoList.update({
        where: { id: listId },
        data: { updatedAt: new Date() }
      });

      logger.info(`✅ Updated item ${itemId} in list ${listId}`, {
        requestId
      });
      
      return item;
    } catch (error) {
      if (error.isOperational) throw error;
      
      logger.error(`💥 Error updating item ${itemId}:`, {
        error: error.message,
        requestId
      });
      throw error;
    }
  }

  /**
   * Supprimer un item d'une liste
   */
  async removeItemFromList(listId, itemId, requestId = null) {
    try {
      logger.debug('🔍 Checking if item exists in list for deletion', {
        listId,
        itemId,
        requestId
      });

      const existingItem = await prisma.todoItem.findFirst({
        where: {
          id: itemId,
          todoListId: listId
        }
      });

      if (!existingItem) {
        throw new NotFoundError('Item')
          .addContext('listId', listId)
          .addContext('itemId', itemId)
          .addContext('operation', 'removeItem')
          .addContext('requestId', requestId)
          .addHint('L\'item n\'existe pas dans cette liste')
          .addHint('L\'item a peut-être déjà été supprimé')
          .addHint('Vérifiez l\'ID de l\'item et de la liste');
      }

      logger.debug('🗑️ Deleting item from database', {
        listId,
        itemId,
        requestId
      });

      await prisma.todoItem.delete({
        where: { id: itemId }
      });

      // Mettre à jour la date de modification de la liste
      await prisma.todoList.update({
        where: { id: listId },
        data: { updatedAt: new Date() }
      });

      logger.info(`✅ Removed item ${itemId} from list ${listId}`, {
        requestId
      });
      
      return { message: 'Item supprimé avec succès' };
    } catch (error) {
      if (error.isOperational) throw error;
      
      logger.error(`💥 Error removing item ${itemId}:`, {
        error: error.message,
        requestId
      });
      throw error;
    }
  }

  /**
   * Basculer le statut d'un item
   */
  async toggleItemStatus(listId, itemId, requestId = null) {
    try {
      logger.debug('🔍 Finding item to toggle status', {
        listId,
        itemId,
        requestId
      });

      const item = await prisma.todoItem.findFirst({
        where: {
          id: itemId,
          todoListId: listId
        }
      });

      if (!item) {
        throw new NotFoundError('Item')
          .addContext('listId', listId)
          .addContext('itemId', itemId)
          .addContext('operation', 'toggleStatus')
          .addContext('requestId', requestId)
          .addHint('L\'item n\'existe pas dans cette liste')
          .addHint('Vérifiez l\'ID de l\'item et de la liste')
          .addHint('Consultez GET /api/todolists/:id pour voir les items');
      }

      const newStatus = item.status === 'COMPLETED' ? 'NOT_COMPLETED' : 'COMPLETED';

      logger.debug('🔄 Toggling item status in database', {
        listId,
        itemId,
        currentStatus: item.status,
        newStatus,
        requestId
      });

      const updatedItem = await prisma.todoItem.update({
        where: { id: itemId },
        data: { status: newStatus }
      });

      // Mettre à jour la date de modification de la liste
      await prisma.todoList.update({
        where: { id: listId },
        data: { updatedAt: new Date() }
      });

      logger.info(`✅ Toggled status for item ${itemId}`, { 
        newStatus,
        requestId 
      });
      
      return updatedItem;
    } catch (error) {
      if (error.isOperational) throw error;
      
      logger.error(`💥 Error toggling item status ${itemId}:`, {
        error: error.message,
        requestId
      });
      throw error;
    }
  }
}

export default new TodoListService();