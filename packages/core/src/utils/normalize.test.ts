import { describe, expect, it } from "vitest";
import { displayListName, normalizeListName } from "./normalize";

describe("normalizeListName", () => {
	it("should lowercase and trim input", () => {
		expect(normalizeListName("  Groceries  ")).toBe("groceries");
	});

	it("should handle already lowercase names", () => {
		expect(normalizeListName("inbox")).toBe("inbox");
	});

	it("should handle names with multiple spaces", () => {
		expect(normalizeListName("  My  List  ")).toBe("my  list");
	});

	it("should handle empty string", () => {
		expect(normalizeListName("")).toBe("");
	});
});

describe("displayListName", () => {
	it("should convert to title case", () => {
		expect(displayListName("grocery list")).toBe("Grocery List");
	});

	it("should handle single word", () => {
		expect(displayListName("inbox")).toBe("Inbox");
	});

	it("should handle already title case", () => {
		expect(displayListName("My List")).toBe("My List");
	});

	it("should handle empty string", () => {
		expect(displayListName("")).toBe("");
	});
});
