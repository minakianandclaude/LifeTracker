import { FastifyInstance } from 'fastify';
import { prisma } from '@lifetracker/core';
import { verifyApiKey } from '../middleware/auth';

export async function listRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', verifyApiKey);

  // GET /api/lists - List all lists
  fastify.get('/lists', async () => {
    const lists = await prisma.list.findMany({
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });
    return { lists };
  });

  // GET /api/lists/:id - Get single list with tasks
  fastify.get<{ Params: { id: string } }>('/lists/:id', async (request, reply) => {
    const { id } = request.params;

    const list = await prisma.list.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!list) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `List with id ${id} not found`,
      });
    }

    return { list };
  });
}
