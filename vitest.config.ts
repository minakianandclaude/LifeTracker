import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["packages/**/*.test.ts"],
		exclude: ["**/node_modules/**", "**/e2e/**"],
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov"],
			exclude: ["**/node_modules/**", "**/*.test.ts", "**/dist/**"],
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 80,
				statements: 80,
			},
		},
	},
});
