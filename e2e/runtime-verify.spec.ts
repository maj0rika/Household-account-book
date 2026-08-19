import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "Pw!runtime1234";
const NEW_PASSWORD = "Pw!runtime5678";

async function registerUser(page: Page) {
	const email = `runtime+${Date.now()}@household.local`;
	await page.goto("/register", { waitUntil: "domcontentloaded" });
	await page.getByLabel("이름").fill("Runtime QA");
	await page.getByLabel("이메일").fill(email);
	await page.getByLabel("비밀번호").fill(PASSWORD);
	await page.getByRole("button", { name: "회원가입" }).click();
	await page.waitForURL("**/transactions", { timeout: 30_000 });
	return email;
}

async function addAsset(page: Page, name: string, balance: number) {
	await page.getByRole("button", { name: "추가" }).first().click();
	const drawer = page.getByRole("dialog");
	await drawer.getByText("자산 추가").waitFor({ timeout: 10_000 });
	await drawer.getByLabel("이름").fill(name);
	await drawer.getByLabel("잔액 (원)").fill(String(balance));
	await drawer.getByRole("button", { name: "추가" }).click();
	await expect(drawer).toBeHidden({ timeout: 10_000 });
	await expect(page.getByText(name).first()).toBeVisible({ timeout: 10_000 });
}

test("runtime: register, transfer, export, password", async ({ page, request }) => {
	const email = await registerUser(page);
	await expect(page.getByRole("heading", { name: "거래 내역", level: 1 })).toBeVisible();

	const unauthParse = await request.post("/api/parse", {
		data: { input: "스타벅스 4500원" },
		headers: { origin: "http://localhost:3000" },
	});
	expect(unauthParse.status()).toBe(401);
	expect(await unauthParse.json()).toMatchObject({ success: false, error: "인증이 필요합니다." });

	const evilParse = await request.post("/api/parse", {
		data: { input: "스타벅스 4500원" },
		headers: { origin: "https://evil.example" },
	});
	expect(evilParse.status()).toBe(403);
	expect(await evilParse.json()).toMatchObject({
		success: false,
		error: "허용되지 않은 요청 출처입니다.",
	});

	await page.goto("/assets", { waitUntil: "domcontentloaded" });
	await addAsset(page, "검증통장A", 100_000);
	await addAsset(page, "검증통장B", 20_000);

	await page.goto("/transactions", { waitUntil: "domcontentloaded" });
	await page.getByRole("button", { name: "직접 입력" }).click();
	const dialog = page.getByRole("dialog");
	await expect(dialog.getByRole("heading", { name: "직접 입력" })).toBeVisible();
	await dialog.getByRole("button", { name: "이체" }).click();
	await dialog.getByLabel("설명").fill("런타임 이체");
	await dialog.getByLabel("금액 (원)").fill("15000");

	const comboboxes = dialog.getByRole("combobox");
	await comboboxes.nth(0).click();
	await page.getByRole("option", { name: /검증통장A/ }).click();
	await comboboxes.nth(1).click();
	await page.getByRole("option", { name: /검증통장B/ }).click();
	await dialog.getByRole("button", { name: "저장" }).click();
	await expect(dialog).toBeHidden({ timeout: 15_000 });
	await expect(page.getByRole("button", { name: /런타임 이체/ })).toBeVisible({ timeout: 15_000 });
	await expect(page.getByText("이체 ·").first()).toBeVisible();
	await expect(page.getByRole("region", { name: "8월 요약" }).getByText("0원").first()).toBeVisible();

	await page.goto("/assets", { waitUntil: "domcontentloaded" });
	await expect(page.getByText("검증통장A").first()).toBeVisible();
	await expect(page.getByText("85,000원").first()).toBeVisible();
	await expect(page.getByText("검증통장B").first()).toBeVisible();
	await expect(page.getByText("35,000원").first()).toBeVisible();

	await page.goto("/settings", { waitUntil: "domcontentloaded" });
	const downloadPromise = page.waitForEvent("download", { timeout: 20_000 });
	await page.getByRole("button", { name: "내 데이터 다운로드" }).click();
	const download = await downloadPromise;
	expect(download.suggestedFilename()).toMatch(/household-export-.*\.json/);
	const exportPath = await download.path();
	expect(exportPath).toBeTruthy();
	const exported = JSON.parse(await download.createReadStream().then(async (stream) => {
		const chunks: Buffer[] = [];
		for await (const chunk of stream) chunks.push(Buffer.from(chunk));
		return Buffer.concat(chunks).toString("utf8");
	}));
	expect(exported.transactions.some((row: { description: string; type: string }) => (
		row.description === "런타임 이체" && row.type === "transfer"
	))).toBe(true);
	expect(exported.accounts).toEqual(expect.arrayContaining([
		expect.objectContaining({ name: "검증통장A", balance: 85_000 }),
		expect.objectContaining({ name: "검증통장B", balance: 35_000 }),
	]));

	await page.getByLabel("현재 비밀번호").fill(PASSWORD);
	await page.getByLabel("새 비밀번호").fill(NEW_PASSWORD);
	await page.getByRole("button", { name: "비밀번호 변경" }).click();
	await expect(page.getByText("비밀번호를 변경했습니다.")).toBeVisible({ timeout: 15_000 });

	await page.getByRole("button", { name: "로그아웃" }).click();
	await page.waitForURL("**/login", { timeout: 15_000 });
	await page.getByLabel("이메일").fill(email);
	await page.getByLabel("비밀번호").fill(NEW_PASSWORD);
	await page.getByRole("button", { name: "로그인" }).click();
	await page.waitForURL("**/transactions", { timeout: 30_000 });
	await expect(page.getByRole("heading", { name: "거래 내역", level: 1 })).toBeVisible();
});
