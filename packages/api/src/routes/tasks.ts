import { FastifyInstance } from 'fastify';
import { prisma } from '@lifetracker/core';
import { createTaskSchema, updateTaskSchema } from '../schemas/task';
import { verifyApiKey } from '../middleware/auth';

export async function taskRoutes(fastify: FastifyInstance) {
  // Apply auth to all routes in this plugin
  fastify.addHook('preHandler', verifyApiKey);

  // GET /api/tasks - List all tasks
  fastify.get('/tasks', async () => {
    const tasks = await prisma.task.findMany({
      include: { list: true },
      orderBy: { createdAt: 'desc' },
    });
    return { tasks };
  });

  // GET /api/tasks/:id - Get single task
  fastify.get<{ Params: { id: string } }>('/tasks/:id', async (request, reply) => {
    const { id } = request.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: { list: true },
    });

    if (!task) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Task with id ${id} not found`,
      });
    }

    return { task };
  });

  // POST /api/tasks - Create task
  fastify.post('/tasks', async (request, reply) => {
    const parseResult = createTaskSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.issues,
      });
    }

    const data = parseResult.data;

    // Get Inbox ID if no list specified
    let listId = data.listId;
    if (!listId) {
      const inbox = await prisma.list.findUnique({
        where: { name: 'inbox' },
      });
      if (!inbox) {
        return reply.status(500).send({
          error: 'Server Error',
          message: 'Inbox list not found. Please run database seed.',
        });
      }
      listId = inbox.id;
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        notes: data.notes,
        listId,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        rawInput: data.rawInput,
        parseWarning: data.parseWarning ?? false,
        parseErrors: data.parseErrors,
      },
      include: { list: true },
    });

    return reply.status(201).send({ task });
  });

  // PATCH /api/tasks/:id - Update task
  fastify.patch<{ Params: { id: string } }>('/tasks/:id', async (request, reply) => {
    const { id } = request.params;
    const parseResult = updateTaskSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.issues,
      });
    }

    const data = parseResult.data;

    // Check task exists
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Task with id ${id} not found`,
      });
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.listId !== undefined) updateData.listId = data.listId;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }
    if (data.completed !== undefined) {
      updateData.completed = data.completed;
      updateData.completedAt = data.completed ? new Date() : null;
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: { list: true },
    });

    return { task };
  });

  // DELETE /api/tasks/:id - Delete task
  fastify.delete<{ Params: { id: string } }>('/tasks/:id', async (request, reply) => {
    const { id } = request.params;

    // Check task exists
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Task with id ${id} not found`,
      });
    }

    await prisma.task.delete({ where: { id } });

    return reply.status(204).send();
  });

  // POST /api/tasks/:id/complete - Toggle completion
  fastify.post<{ Params: { id: string } }>('/tasks/:id/complete', async (request, reply) => {
    const { id } = request.params;

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Task with id ${id} not found`,
      });
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        completed: !existing.completed,
        completedAt: !existing.completed ? new Date() : null,
      },
      include: { list: true },
    });

    return { task };
  });
}
