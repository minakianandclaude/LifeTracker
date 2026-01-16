import { prisma } from "@lifetracker/core";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { verifyApiKey } from "../middleware/auth";
import { checkLLMHealth, parseTaskInput } from "../services/llm";

const voiceInputSchema = z.object({
	input: z.string().min(1).max(1000),
});

export async function voiceRoutes(fastify: FastifyInstance) {
	fastify.addHook("preHandler", verifyApiKey);

	// POST /api/voice - Process voice input
	fastify.post("/voice", async (request, reply) => {
		const parseResult = voiceInputSchema.safeParse(request.body);

		if (!parseResult.success) {
			return reply.status(400).send({
				error: "Validation Error",
				message: "Input is required and must be between 1-1000 characters",
			});
		}

		const { input } = parseResult.data;

		// Parse input with LLM
		const parsed = await parseTaskInput(input);

		// Get Inbox list
		const inbox = await prisma.list.findUnique({
			where: { name: "inbox" },
		});

		if (!inbox) {
			return reply.status(500).send({
				error: "Server Error",
				message: "Inbox list not found",
			});
		}

		// Create task
		const task = await prisma.task.create({
			data: {
				title: parsed.title,
				listId: inbox.id,
				rawInput: input,
				parseWarning: parsed.parseWarning,
				parseErrors: parsed.parseErrors,
			},
			include: { list: true },
		});

		// Return response suitable for iOS Shortcut notification
		return {
			success: true,
			message: `Added: ${task.title}`,
			task,
			parsing: {
				confidence: parsed.confidence,
				warning: parsed.parseWarning,
				errors: parsed.parseErrors,
			},
		};
	});

	// GET /api/voice/health - Check LLM availability
	fastify.get("/voice/health", async () => {
		const llmHealthy = await checkLLMHealth();
		return {
			status: llmHealthy ? "ok" : "degraded",
			llm: llmHealthy ? "available" : "unavailable",
			message: llmHealthy
				? "LLM is ready"
				: "LLM unavailable, will use fallback parsing",
		};
	});
}
