import { expect, test, type Page } from "@playwright/test";

const VIEWPORTS = [
	{ name: "desktop", width: 1280, height: 800 },
	{ name: "mobile", width: 390, height: 844 },
] as const;

function attachErrorListeners(page: Page) {
	const consoleErrors: string[] = [];
	const pageErrors: string[] = [];

	page.on("console", (msg) => {
		if (msg.type() === "error") {
			consoleErrors.push(msg.text());
		}
	});

	page.on("pageerror", (error) => {
		pageErrors.push(error.message);
	});

	return { consoleErrors, pageErrors };
}

async function waitForSplashClear(page: Page) {
	const splash = page.locator(".splash-overlay");
	await splash.waitFor({ state: "detached", timeout: 5_000 }).catch(() => undefined);
}

async function assertNoHorizontalOverflow(page: Page) {
	const overflow = await page.evaluate(() => ({
		scrollWidth: document.documentElement.scrollWidth,
		clientWidth: document.documentElement.clientWidth,
	}));
	expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
}

test.describe("public & auth smoke", () => {
	for (const viewport of VIEWPORTS) {
		test(`/login renders cleanly on ${viewport.name}`, async ({ page }) => {
			await page.setViewportSize({ width: viewport.width, height: viewport.height });
			const { consoleErrors, pageErrors } = attachErrorListeners(page);

			const response = await page.goto("/login", { waitUntil: "domcontentloaded" });
			expect(response?.status()).toBe(200);
			await waitForSplashClear(page);

			await expect(page.getByRole("heading", { name: "가계부", level: 1 })).toBeVisible();
			await expect(page.getByLabel("이메일")).toBeVisible();
			await expect(page.getByLabel("비밀번호")).toBeVisible();
			await expect(page.getByRole("button", { name: "로그인" })).toBeVisible();
			await expect(page.getByRole("link", { name: "회원가입" })).toBeVisible();

			await assertNoHorizontalOverflow(page);
			expect(consoleErrors).toEqual([]);
			expect(pageErrors).toEqual([]);
		});

		test(`/register renders cleanly on ${viewport.name}`, async ({ page }) => {
			await page.setViewportSize({ width: viewport.width, height: viewport.height });
			const { consoleErrors, pageErrors } = attachErrorListeners(page);

			const response = await page.goto("/register", { waitUntil: "domcontentloaded" });
			expect(response?.status()).toBe(200);
			await waitForSplashClear(page);

			await expect(page.getByRole("heading", { name: "회원가입", level: 1 })).toBeVisible();
			await expect(page.getByLabel("이름")).toBeVisible();
			await expect(page.getByLabel("이메일")).toBeVisible();
			await expect(page.getByLabel("비밀번호")).toBeVisible();
			await expect(page.getByRole("button", { name: "회원가입" })).toBeVisible();
			await expect(page.getByRole("link", { name: "로그인" })).toBeVisible();

			await assertNoHorizontalOverflow(page);
			expect(consoleErrors).toEqual([]);
			expect(pageErrors).toEqual([]);
		});
	}

	test("/privacy and /terms return 200 with zero errors", async ({ page }) => {
		for (const route of [
			{ path: "/privacy", heading: "개인정보처리방침" },
			{ path: "/terms", heading: "서비스 이용약관" },
		]) {
			const { consoleErrors, pageErrors } = attachErrorListeners(page);
			const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
			expect(response?.status()).toBe(200);
			await waitForSplashClear(page);

			await expect(page.getByRole("heading", { name: route.heading, level: 1 })).toBeVisible();
			await assertNoHorizontalOverflow(page);
			expect(consoleErrors).toEqual([]);
			expect(pageErrors).toEqual([]);
		}
	});

	test("unauthenticated /transactions redirects to /login", async ({ page }) => {
		const { consoleErrors, pageErrors } = attachErrorListeners(page);
		await page.goto("/transactions", { waitUntil: "domcontentloaded" });
		await page.waitForURL("**/login", { timeout: 10_000 });
		await waitForSplashClear(page);

		await expect(page.getByRole("heading", { name: "가계부", level: 1 })).toBeVisible();
		expect(consoleErrors).toEqual([]);
		expect(pageErrors).toEqual([]);
	});

	test("unauthenticated POST /api/parse enforces same-origin 401 and cross-origin 403", async ({
		request,
		baseURL,
	}) => {
		const sameOrigin = new URL(baseURL ?? "http://127.0.0.1:3005").origin;

		const unauthSameOrigin = await request.post("/api/parse", {
			data: { input: "스타벅스 4500원" },
			headers: { origin: sameOrigin },
		});
		expect(unauthSameOrigin.status()).toBe(401);
		expect(await unauthSameOrigin.json()).toMatchObject({
			success: false,
			error: "인증이 필요합니다.",
		});

		const crossOrigin = await request.post("/api/parse", {
			data: { input: "스타벅스 4500원" },
			headers: { origin: "https://evil.example" },
		});
		expect(crossOrigin.status()).toBe(403);
		expect(await crossOrigin.json()).toMatchObject({
			success: false,
			error: "허용되지 않은 요청 출처입니다.",
		});
	});
});
