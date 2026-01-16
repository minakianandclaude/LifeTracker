import { expect, test } from "@playwright/test";

test("home page loads successfully", async ({ page }) => {
	await page.goto("/");
	await expect(page).toHaveTitle(/LifeTracker/);
});

test("page has main content area", async ({ page }) => {
	await page.goto("/");
	const main = page.locator("main, #root, .app");
	await expect(main).toBeVisible();
});
