import { expect, test, type Locator, type Page } from "@playwright/test";

const PASSWORD = "Pw!manual1234";
const PARSE_PROMPT = "카카오뱅크 잔액 10만원, 토스뱅크 잔액 3만원";

function getItemLocators(dialog: Locator, name: string) {
	const summaryButton = dialog.locator(`xpath=.//p[normalize-space()="${name}"]/ancestor::button[1]`).first();
	const item = summaryButton.locator('xpath=ancestor::div[contains(@class,"border-b")][1]');

	return { item, summaryButton };
}

async function setInputValue(locator: Locator, value: string) {
	await locator.evaluate((element, nextValue) => {
		const input = element as HTMLInputElement;
		const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");

		descriptor?.set?.call(input, nextValue);
		input.dispatchEvent(new Event("input", { bubbles: true }));
		input.dispatchEvent(new Event("change", { bubbles: true }));
	}, value);
}

async function registerUser(page: Page) {
	const email = `qa+${Date.now()}@household.local`;

	await page.goto("/register", { waitUntil: "domcontentloaded" });
	await page.getByLabel("이름").fill("QA Manual");
	await page.getByLabel("이메일").fill(email);
	await page.getByLabel("비밀번호").fill(PASSWORD);
	await page.getByRole("button", { name: "회원가입" }).click();
	await page.waitForURL("**/transactions", { timeout: 30_000 });
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

async function openParseSheet(page: Page) {
	const textarea = page.locator("textarea").first();

	await textarea.scrollIntoViewIfNeeded();
	await textarea.fill(PARSE_PROMPT);

	const inputRow = textarea.locator('xpath=ancestor::div[contains(@class,"flex items-center gap-2 px-3 py-2")]');
	await inputRow.getByRole("button").last().click();

	const dialog = page.getByRole("dialog");
	await dialog.getByText("자산/부채 파싱 결과").waitFor({ timeout: 120_000 });

	return dialog;
}

test("방금 만든 자산도 파싱 시트에서 update로 매칭되고 편집 후 다시 update로 복귀한다", async ({ page }) => {
	await registerUser(page);
	await page.goto("/assets", { waitUntil: "domcontentloaded" });

	await addAsset(page, "카카오뱅크", 100_000);
	await addAsset(page, "토스뱅크", 30_000);

	const dialog = await openParseSheet(page);

	await expect(getItemLocators(dialog, "카카오뱅크").item.getByText("업데이트", { exact: true })).toBeVisible();
	await expect(getItemLocators(dialog, "토스뱅크").item.getByText("업데이트", { exact: true })).toBeVisible();

	await getItemLocators(dialog, "카카오뱅크").summaryButton.click();
	await setInputValue(getItemLocators(dialog, "카카오뱅크").item.getByLabel("이름"), "카카오뱅크X");
	await expect(getItemLocators(dialog, "카카오뱅크X").item.getByText("신규", { exact: true })).toBeVisible();

	await getItemLocators(dialog, "카카오뱅크X").summaryButton.click();
	await setInputValue(getItemLocators(dialog, "카카오뱅크X").item.getByLabel("이름"), "카카오뱅크");
	await expect(getItemLocators(dialog, "카카오뱅크").item.getByText("업데이트", { exact: true })).toBeVisible();

	await getItemLocators(dialog, "카카오뱅크").item.getByRole("button", { name: "카카오뱅크 항목 삭제" }).click();
	await expect(getItemLocators(dialog, "카카오뱅크").item).toHaveCount(0);

	await expect(getItemLocators(dialog, "토스뱅크").item.getByText("업데이트", { exact: true })).toBeVisible();
	await getItemLocators(dialog, "토스뱅크").summaryButton.click();
	await setInputValue(getItemLocators(dialog, "토스뱅크").item.getByLabel("이름"), "토스뱅크X");
	await expect(getItemLocators(dialog, "토스뱅크X").item.getByText("신규", { exact: true })).toBeVisible();

	await getItemLocators(dialog, "토스뱅크X").summaryButton.click();
	await setInputValue(getItemLocators(dialog, "토스뱅크X").item.getByLabel("이름"), "토스뱅크");
	await expect(getItemLocators(dialog, "토스뱅크").item.getByText("업데이트", { exact: true })).toBeVisible();
});
