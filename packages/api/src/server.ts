import cors from "@fastify/cors";
import Fastify from "fastify";
import { listRoutes } from "./routes/lists";
import { taskRoutes } from "./routes/tasks";
import { voiceRoutes } from "./routes/voice";
import { checkLLMHealth } from "./services/llm";

const server = Fastify({
	logger: true,
});

// Register plugins
server.register(cors, {
	origin: true, // Allow all origins in development
});

// Health check (no auth required)
server.get("/health", async () => {
	const llmHealthy = await checkLLMHealth();
	return {
		status: "ok",
		timestamp: new Date().toISOString(),
		services: {
			api: "healthy",
			llm: llmHealthy ? "healthy" : "degraded",
		},
	};
});

// Register routes
server.register(taskRoutes, { prefix: "/api" });
server.register(listRoutes, { prefix: "/api" });
server.register(voiceRoutes, { prefix: "/api" });

// Error handler
server.setErrorHandler((error, _request, reply) => {
	server.log.error(error);
	reply.status(500).send({
		error: "Internal Server Error",
		message:
			process.env.NODE_ENV === "development"
				? error.message
				: "Something went wrong",
	});
});

const start = async () => {
	try {
		await server.listen({ port: 3000, host: "0.0.0.0" });
	} catch (err) {
		server.log.error(err);
		process.exit(1);
	}
};

start();
