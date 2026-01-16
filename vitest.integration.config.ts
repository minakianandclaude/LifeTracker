import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["packages/**/*.integration.ts", "packages/**/__tests__/**/*.ts"],
		exclude: ["**/node_modules/**", "**/e2e/**", "**/*.test.ts"],
		testTimeout: 30000,
		hookTimeout: 30000,
		passWithNoTests: true,
	},
});
