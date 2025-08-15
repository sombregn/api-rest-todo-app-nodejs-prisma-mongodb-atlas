import { z } from 'zod';

// Enum pour les statuts de liste
export const TodoListStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'DONE']);

// Schéma de base pour TodoList
const todoListBase = {
  title: z.string({
    required_error: "Le titre est requis",
    invalid_type_error: "Le titre doit être une chaîne de caractères"
  })
    .min(3, "Le titre doit contenir au moins 3 caractères")
    .max(100, "Le titre ne peut pas dépasser 100 caractères")
    .trim(),
  
  status: TodoListStatusEnum
    .optional()
    .default('TODO')
};

// Schémas pour les différentes opérations
export const createTodoListSchema = z.object({
  body: z.object({
    ...todoListBase,
    items: z.array(z.object({
      label: z.string().min(1).max(200),
      status: z.enum(['COMPLETED', 'NOT_COMPLETED']).optional()
    })).optional()
  })
});

export const updateTodoListSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID MongoDB invalide")
  }),
  body: z.object({
    title: todoListBase.title.optional(),
    status: TodoListStatusEnum.optional()
  }).refine(
    data => Object.keys(data).length > 0,
    { message: "Au moins un champ doit être fourni pour la mise à jour" }
  )
});

export const patchTodoListSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID MongoDB invalide")
  }),
  body: z.object({
    title: todoListBase.title.optional(),
    status: TodoListStatusEnum.optional()
  }).refine(
    data => Object.keys(data).length > 0,
    { message: "Au moins un champ doit être fourni pour la mise à jour" }
  )
});

export const getTodoListByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID MongoDB invalide")
  })
});

export const getTodoListByNameSchema = z.object({
  params: z.object({
    name: z.string()
      .min(1, "Le nom ne peut pas être vide")
      .max(100, "Le nom est trop long")
  })
});

export const getAllTodoListsSchema = z.object({
  query: z.object({
    status: TodoListStatusEnum.optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'title']).optional(),
    order: z.enum(['asc', 'desc']).optional()
  }).optional()
});

export const deleteTodoListSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID MongoDB invalide")
  })
});