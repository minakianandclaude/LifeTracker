import { FastifyRequest, FastifyReply } from 'fastify';

const API_KEY = process.env.API_KEY || 'dev-api-key-change-in-production';

export async function verifyApiKey(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const apiKey = request.headers['x-api-key'];

  if (!apiKey || apiKey !== API_KEY) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid or missing API key',
    });
  }
}
