/**
 * Mapper pour transformer les données TodoList
 */
class TodoListMapper {
  /**
   * ✅ MÉTHODE PRINCIPALE - Transforme une TodoList de la DB vers l'API
   */
  toAPI(todoList) {
    if (!todoList) return null;

    // Validation des données essentielles
    if (!todoList.id || !todoList.title) {
      console.warn('TodoList incomplete:', todoList);
      return null;
    }

    return {
      id: todoList.id,
      title: todoList.title,
      status: todoList.status,
      itemsCount: this.getItemsCount(todoList),
      completionRate: this.calculateCompletionRate(todoList),
      items: todoList.items ? todoList.items.map(item => this.itemToAPI(item)) : undefined,
      metadata: this.generateMetadata(todoList),
      createdAt: todoList.createdAt?.toISOString(),
      updatedAt: todoList.updatedAt?.toISOString()
    };
  }

  /**
   * Transforme plusieurs TodoLists
   */
  toAPIList(todoLists) {
    return todoLists.map(list => this.toAPI(list));
  }

  /**
   * ✅ Compte le nombre d'items
   */
  getItemsCount(todoList) {
    return todoList._count?.items || todoList.items?.length || 0;
  }

  /**
   * ✅ Calcule le taux de completion
   */
  calculateCompletionRate(todoList) {
    const items = todoList.items || [];
    if (items.length === 0) return 0;
    
    const completedItems = items.filter(item => item.status === 'COMPLETED').length;
    return Math.round((completedItems / items.length) * 100);
  }

  /**
   * Transforme un TodoItem de la DB vers l'API
   */
  itemToAPI(item) {
    if (!item) return null;

    return {
      id: item.id,
      label: item.label,
      status: item.status,
      completed: item.status === 'COMPLETED',
      createdAt: item.createdAt?.toISOString(),
      updatedAt: item.updatedAt?.toISOString()
    };
  }

  /**
   * Transforme les données de création depuis l'API vers la DB
   */
  toDBCreate(data) {
    return {
      title: data.title,
      status: data.status || 'TODO',
      items: data.items ? {
        create: data.items.map(item => ({
          label: item.label,
          status: item.status || 'NOT_COMPLETED'
        }))
      } : undefined
    };
  }

  /**
   * Transforme les données de mise à jour depuis l'API vers la DB
   */
  toDBUpdate(data) {
    const updateData = {};
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.status !== undefined) updateData.status = data.status;
    
    return updateData;
  }

  /**
   * Formate une liste pour l'affichage résumé
   */
  toSummary(todoList) {
    if (!todoList) return null;

    const totalItems = this.getItemsCount(todoList);
    const completedItems = todoList.items?.filter(item => 
      item.status === 'COMPLETED'
    ).length || 0;

    return {
      id: todoList.id,
      title: todoList.title,
      status: todoList.status,
      progress: {
        total: totalItems,
        completed: completedItems,
        percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
      },
      lastUpdate: todoList.updatedAt?.toISOString()
    };
  }

  /**
   * ✅ Génère des métadonnées enrichies
   */
  generateMetadata(todoList) {
    const items = todoList.items || [];
    const completedItems = items.filter(item => item.status === 'COMPLETED');
    
    return {
      totalItems: items.length,
      completedItems: completedItems.length,
      pendingItems: items.length - completedItems.length,
      lastActivity: this.getLastActivity(todoList),
      estimatedCompletion: this.estimateCompletion(todoList),
      tags: this.extractTags(todoList.title)
    };
  }

  /**
   * ✅ Obtient la dernière activité
   */
  getLastActivity(todoList) {
    if (!todoList.items || todoList.items.length === 0) {
      return todoList.updatedAt?.toISOString();
    }
    
    const lastItemUpdate = todoList.items
      .map(item => new Date(item.updatedAt))
      .sort((a, b) => b - a)[0];
    
    const listUpdate = new Date(todoList.updatedAt);
    
    return (lastItemUpdate > listUpdate ? lastItemUpdate : listUpdate).toISOString();
  }

  /**
   * ✅ Extraction de tags automatique
   */
  extractTags(title) {
    const tags = [];
    const keywords = {
      'courses': 'shopping',
      'marché': 'shopping',
      'travail': 'work',
      'maison': 'home',
      'urgent': 'priority-high',
      'important': 'priority-medium'
    };
    
    Object.entries(keywords).forEach(([keyword, tag]) => {
      if (title.toLowerCase().includes(keyword)) {
        tags.push(tag);
      }
    });
    
    return tags;
  }

  /**
   * ✅ Estimation intelligente de completion
   */
  estimateCompletion(todoList) {
    const items = todoList.items || [];
    if (items.length === 0) return null;
    
    const pendingItems = items.filter(item => item.status === 'NOT_COMPLETED').length;
    const completedItems = items.filter(item => item.status === 'COMPLETED');
    
    if (completedItems.length === 0) return 'unknown';
    
    // Calcul simple basé sur la vitesse moyenne
    const avgCompletionTime = this.calculateAvgCompletionTime(completedItems);
    const estimatedDays = Math.ceil(pendingItems * avgCompletionTime);
    
    return {
      remainingItems: pendingItems,
      estimatedDays,
      estimatedDate: new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  /**
   * ✅ Calcule le temps moyen de completion
   */
  calculateAvgCompletionTime(completedItems) {
    if (completedItems.length === 0) return 1;
    
    const totalTime = completedItems.reduce((total, item) => {
      const created = new Date(item.createdAt);
      const updated = new Date(item.updatedAt);
      const days = (updated - created) / (1000 * 60 * 60 * 24);
      return total + Math.max(days, 0.1); // Minimum 0.1 jour
    }, 0);
    
    return totalTime / completedItems.length;
  }

  /**
   * Formate pour l'export
   */
  toExport(todoList) {
    return {
      ID: todoList.id,
      Titre: todoList.title,
      Statut: this.translateStatus(todoList.status),
      'Nombre d\'items': this.getItemsCount(todoList),
      'Date de création': this.formatDate(todoList.createdAt),
      'Dernière modification': this.formatDate(todoList.updatedAt)
    };
  }

  /**
   * Export enrichi
   */
  toEnrichedExport(todoList) {
    return {
      ...this.toExport(todoList),
      'Items détails': todoList.items?.map(item => ({
        label: item.label,
        statut: item.status,
        créé: this.formatDate(item.createdAt),
        modifié: this.formatDate(item.updatedAt)
      })) || [],
      'Métadonnées': this.generateMetadata(todoList),
      'Export généré le': this.formatDate(new Date())
    };
  }

  /**
   * Helpers privés
   */
  translateStatus(status) {
    const translations = {
      'TODO': 'À faire',
      'IN_PROGRESS': 'En cours',
      'DONE': 'Terminé'
    };
    return translations[status] || status;
  }

  formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

export default new TodoListMapper();