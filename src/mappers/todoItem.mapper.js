/**
 * Mapper pour transformer les données TodoItem
 */
class TodoItemMapper {
  /**
   * Transforme un TodoItem de la DB vers l'API
   */
  toAPI(item) {
    if (!item) return null;

    return {
      id: item.id,
      label: item.label,
      status: item.status,
      completed: item.status === 'COMPLETED',
      listId: item.todoListId,
      createdAt: item.createdAt?.toISOString(),
      updatedAt: item.updatedAt?.toISOString()
    };
  }

  /**
   * Transforme plusieurs TodoItems
   */
  toAPIList(items) {
    return items.map(item => this.toAPI(item));
  }

  /**
   * Transforme les données de création depuis l'API vers la DB
   */
  toDBCreate(data, listId) {
    return {
      label: data.label,
      status: data.status || 'NOT_COMPLETED',
      todoListId: listId
    };
  }

  /**
   * Transforme les données de mise à jour depuis l'API vers la DB
   */
  toDBUpdate(data) {
    const updateData = {};
    
    if (data.label !== undefined) updateData.label = data.label;
    if (data.status !== undefined) updateData.status = data.status;
    
    return updateData;
  }

  /**
   * Groupe les items par statut
   */
  groupByStatus(items) {
    return {
      completed: items.filter(item => item.status === 'COMPLETED').map(item => this.toAPI(item)),
      notCompleted: items.filter(item => item.status === 'NOT_COMPLETED').map(item => this.toAPI(item))
    };
  }

  /**
   * Statistiques sur les items
   */
  toStatistics(items) {
    const total = items.length;
    const completed = items.filter(item => item.status === 'COMPLETED').length;
    const notCompleted = total - completed;

    return {
      total,
      completed,
      notCompleted,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      items: this.groupByStatus(items)
    };
  }

  /**
   * Tri intelligent des items
   */
  sortItems(items, sortBy = 'createdAt', order = 'desc') {
    const sortedItems = [...items].sort((a, b) => {
      if (sortBy === 'status') {
        if (a.status === 'NOT_COMPLETED' && b.status === 'COMPLETED') return -1;
        if (a.status === 'COMPLETED' && b.status === 'NOT_COMPLETED') return 1;
        return 0;
      }
      
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      
      if (order === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
    
    return this.toAPIList(sortedItems);
  }

  /**
   * Statistiques avancées
   */
  toAdvancedStatistics(items) {
    const today = new Date();
    
    const completedToday = items.filter(item => 
      item.status === 'COMPLETED' && 
      new Date(item.updatedAt).toDateString() === today.toDateString()
    ).length;
    
    return {
      ...this.toStatistics(items),
      completedToday,
      oldestIncomplete: items
        .filter(item => item.status === 'NOT_COMPLETED')
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0],
      productivity: {
        daily: completedToday,
        trend: this.calculateTrend(items)
      }
    };
  }

  /**
   * Calcul de tendance
   */
  calculateTrend(items) {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const count = items.filter(item => 
        item.status === 'COMPLETED' && 
        new Date(item.updatedAt).toDateString() === date.toDateString()
      ).length;
      last7Days.push(count);
    }
    
    const firstHalf = last7Days.slice(0, 3).reduce((a, b) => a + b, 0);
    const secondHalf = last7Days.slice(4, 7).reduce((a, b) => a + b, 0);
    
    if (secondHalf > firstHalf) return 'improving';
    if (secondHalf < firstHalf) return 'declining'; 
    return 'stable';
  }
}

export default new TodoItemMapper();