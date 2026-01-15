import { z } from "zod";

export const createTaskSchema = z.object({
	title: z.string().min(1).max(500),
	notes: z.string().max(5000).optional(),
	listId: z.string().uuid().optional(), // Defaults to Inbox
	priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
	dueDate: z.string().datetime().optional(),
	rawInput: z.string().optional(),
	parseWarning: z.boolean().optional(),
	parseErrors: z.string().optional(),
});

export const updateTaskSchema = z.object({
	title: z.string().min(1).max(500).optional(),
	notes: z.string().max(5000).nullable().optional(),
	listId: z.string().uuid().optional(),
	priority: z.enum(["HIGH", "MEDIUM", "LOW"]).nullable().optional(),
	dueDate: z.string().datetime().nullable().optional(),
	completed: z.boolean().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
