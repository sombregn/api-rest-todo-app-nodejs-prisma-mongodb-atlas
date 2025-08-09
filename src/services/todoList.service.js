import prisma from '../models/prisma.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';


class TodoListService {
  // Récupérer toutes les listes
  async getAllLists(filters = {}) {
    try {
      const where = {};
      
      if (filters.status) {
        where.status = filters.status;
      }

      const lists = await prisma.todoList.findMany({
        where,
        include: {
          items: true,
          _count: {
            select: { items: true }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      logger.info(`Retrieved ${lists.length} todo lists`);
      return lists;
    } catch (error) {
      logger.error('Error fetching todo lists:', error);
      throw error;
    }
  }

  // Récupérer une liste par ID
  async getListById(id) {
    try {
      const list = await prisma.todoList.findUnique({
        where: { id },
        include: {
          items: {
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });

      if (!list) {
        throw new AppError('Liste non trouvée', 404);
      }

      logger.info(`Retrieved todo list with id: ${id}`);
      return list;
    } catch (error) {
      logger.error(`Error fetching todo list ${id}:`, error);
      throw error;
    }
  }

  // Récupérer une liste par nom
  async getListByName(title) {
    try {
      const list = await prisma.todoList.findFirst({
        where: {
          title: {
            equals: title,
            mode: 'insensitive'
          }
        },
        include: {
          items: true
        }
      });

      if (!list) {
        throw new AppError('Liste non trouvée', 404);
      }

      logger.info(`Retrieved todo list with title: ${title}`);
      return list;
    } catch (error) {
      logger.error(`Error fetching todo list by name ${title}:`, error);
      throw error;
    }
  }

  // Créer une nouvelle liste
  async createList(data) {
    try {
      const list = await prisma.todoList.create({
        data: {
          title: data.title,
          status: data.status || 'TODO',
          items: {
            create: data.items || []
          }
        },
        include: {
          items: true
        }
      });

      logger.info(`Created new todo list: ${list.title}`);
      return list;
    } catch (error) {
      logger.error('Error creating todo list:', error);
      throw error;
    }
  }

  // Mettre à jour une liste
  async updateList(id, data) {
    try {
      const list = await prisma.todoList.update({
        where: { id },
        data: {
          title: data.title,
          status: data.status
        },
        include: {
          items: true
        }
      });

      logger.info(`Updated todo list: ${id}`);
      return list;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new AppError('Liste non trouvée', 404);
      }
      logger.error(`Error updating todo list ${id}:`, error);
      throw error;
    }
  }

  // Supprimer une liste
  async deleteList(id) {
    try {
      await prisma.todoList.delete({
        where: { id }
      });

      logger.info(`Deleted todo list: ${id}`);
      return { message: 'Liste supprimée avec succès' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new AppError('Liste non trouvée', 404);
      }
      logger.error(`Error deleting todo list ${id}:`, error);
      throw error;
    }
  }

  // Récupérer les listes récemment modifiées
  async getRecentLists(limit = 10) {
    try {
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

      logger.info(`Retrieved ${lists.length} recent todo lists`);
      return lists;
    } catch (error) {
      logger.error('Error fetching recent todo lists:', error);
      throw error;
    }
  }

  // --- GESTION DES ITEMS ---

  // Ajouter un item à une liste
  async addItemToList(listId, itemData) {
    try {
      // Vérifier que la liste existe
      const list = await prisma.todoList.findUnique({
        where: { id: listId }
      });

      if (!list) {
        throw new AppError('Liste non trouvée', 404);
      }

      const item = await prisma.todoItem.create({
        data: {
          label: itemData.label,
          status: itemData.status || 'NOT_COMPLETED',
          todoListId: listId
        }
      });

      // Mettre à jour la date de modification de la liste
      await prisma.todoList.update({
        where: { id: listId },
        data: { updatedAt: new Date() }
      });

      logger.info(`Added item to list ${listId}`);
      return item;
    } catch (error) {
      logger.error(`Error adding item to list ${listId}:`, error);
      throw error;
    }
  }

  // Mettre à jour un item
  async updateItem(listId, itemId, itemData) {
    try {
      const item = await prisma.todoItem.update({
        where: {
          id: itemId,
          todoListId: listId
        },
        data: {
          label: itemData.label,
          status: itemData.status
        }
      });

      // Mettre à jour la date de modification de la liste
      await prisma.todoList.update({
        where: { id: listId },
        data: { updatedAt: new Date() }
      });

      logger.info(`Updated item ${itemId} in list ${listId}`);
      return item;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new AppError('Item non trouvé', 404);
      }
      logger.error(`Error updating item ${itemId}:`, error);
      throw error;
    }
  }
//   // Mettre à jour un item
// async updateItem(listId, itemId, itemData) {
//   try {
//     // Vérifier que itemData existe et n'est pas vide
//     if (!itemData || Object.keys(itemData).length === 0) {
//       throw new AppError('Données manquantes pour la mise à jour', 400);
//     }

//     // Construire l'objet de données à mettre à jour dynamiquement
//     const updateData = {};
    
//     // Ne mettre à jour que les champs fournis
//     if (itemData.label !== undefined) {
//       updateData.label = itemData.label;
//     }
    
//     if (itemData.status !== undefined) {
//       updateData.status = itemData.status;
//     }

//     // Vérifier qu'au moins un champ est fourni pour la mise à jour
//     if (Object.keys(updateData).length === 0) {
//       throw new AppError('Aucune donnée valide fournie pour la mise à jour', 400);
//     }

//     const item = await prisma.todoItem.update({
//       where: {
//         id: itemId,
//         todoListId: listId
//       },
//       data: updateData
//     });

//     // Mettre à jour la date de modification de la liste
//     await prisma.todoList.update({
//       where: { id: listId },
//       data: { updatedAt: new Date() }
//     });

//     logger.info(`Updated item ${itemId} in list ${listId}`);
//     return item;
//   } catch (error) {
//     if (error.code === 'P2025') {
//       throw new AppError('Item non trouvé', 404);
//     }
//     logger.error(`Error updating item ${itemId}:`, error);
//     throw error;
//   }
// }

  // Supprimer un item d'une liste
  async removeItemFromList(listId, itemId) {
    try {
      await prisma.todoItem.delete({
        where: {
          id: itemId,
          todoListId: listId
        }
      });

      // Mettre à jour la date de modification de la liste
      await prisma.todoList.update({
        where: { id: listId },
        data: { updatedAt: new Date() }
      });

      logger.info(`Removed item ${itemId} from list ${listId}`);
      return { message: 'Item supprimé avec succès' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new AppError('Item non trouvé', 404);
      }
      logger.error(`Error removing item ${itemId}:`, error);
      throw error;
    }
  }

  // Changer le statut d'un item
  async toggleItemStatus(listId, itemId) {
    try {
      const item = await prisma.todoItem.findUnique({
        where: {
          id: itemId,
          todoListId: listId
        }
      });

      if (!item) {
        throw new AppError('Item non trouvé', 404);
      }

      const newStatus = item.status === 'COMPLETED' ? 'NOT_COMPLETED' : 'COMPLETED';

      const updatedItem = await prisma.todoItem.update({
        where: {
          id: itemId
        },
        data: {
          status: newStatus
        }
      });

      // Mettre à jour la date de modification de la liste
      await prisma.todoList.update({
        where: { id: listId },
        data: { updatedAt: new Date() }
      });

      logger.info(`Toggled status for item ${itemId}`);
      return updatedItem;
    } catch (error) {
      logger.error(`Error toggling item status ${itemId}:`, error);
      throw error;
    }
  }
}

export default new TodoListService();