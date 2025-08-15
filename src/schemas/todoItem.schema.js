import { z } from 'zod';

// Enum pour les statuts d'item
export const TodoItemStatusEnum = z.enum(['COMPLETED', 'NOT_COMPLETED']);

// Schéma de base pour TodoItem
const todoItemBase = {
  label: z.string({
    required_error: "Le libellé est requis",
    invalid_type_error: "Le libellé doit être une chaîne de caractères"
  })
    .min(1, "Le libellé ne peut pas être vide")
    .max(200, "Le libellé ne peut pas dépasser 200 caractères")
    .trim(),
  
  status: TodoItemStatusEnum
    .optional()
    .default('NOT_COMPLETED')
};

// Schémas pour les opérations sur les items
export const createTodoItemSchema = z.object({
  params: z.object({
    listId: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID de liste invalide")
  }),
  body: z.object(todoItemBase)
});

export const updateTodoItemSchema = z.object({
  params: z.object({
    listId: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID de liste invalide"),
    itemId: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID d'item invalide")
  }),
  body: z.object({
    label: todoItemBase.label.optional(),
    status: TodoItemStatusEnum.optional()
  }).refine(
    data => Object.keys(data).length > 0,
    { message: "Au moins un champ doit être fourni pour la mise à jour" }
  )
});

export const deleteTodoItemSchema = z.object({
  params: z.object({
    listId: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID de liste invalide"),
    itemId: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID d'item invalide")
  })
});

export const toggleTodoItemSchema = z.object({
  params: z.object({
    listId: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID de liste invalide"),
    itemId: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID d'item invalide")
  })
});

// Validation pour les opérations batch
export const batchUpdateItemsSchema = z.object({
  params: z.object({
    listId: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID de liste invalide")
  }),
  body: z.object({
    itemIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/))
      .min(1, "Au moins un ID d'item est requis")
      .max(100, "Trop d'items à mettre à jour"),
    status: TodoItemStatusEnum
  })
});