// 파일 역할:
// - 브라우저 관점 사용자 흐름을 검증하는 E2E 테스트 파일이다.
// 사용 위치:
// - Playwright 테스트 러너가 실제 브라우저 흐름을 재현할 때 사용된다;
// 흐름:
// - 테스트 시작 -> 페이지 이동/사용자 동작 재현 -> UI 상태 검증 -> 회귀 여부 판단 순서로 흐른다;
import { expect, test, type Locator, type Page } from "@playwright/test";

const PASSWORD = "Pw!manual1234";
const PARSE_PROMPT = "카카오뱅크 잔액 10만원, 토스뱅크 잔액 3만원";

// 파싱 결과 시트는 요약 버튼과 상세 폼이 같은 카드 안에 섞여 있어
// 이름으로 항목을 다시 찾을 수 있는 locator 묶음을 헬퍼로 분리했다.
function getItemLocators(dialog: Locator, name: string) {
	const summaryButton = dialog.locator(`xpath=.//p[normalize-space()="${name}"]/ancestor::button[1]`).first();
	const item = summaryButton.locator('xpath=ancestor::div[contains(@class,"border-b")][1]');

	return { item, summaryButton };
}

// 일부 입력은 React controlled input이라 단순 fill보다 DOM value setter를 직접 건드려야
// onChange 흐름이 정확히 재현된다.
async function setInputValue(locator: Locator, value: string) {
	await locator.evaluate((element, nextValue) => {
		const input = element as HTMLInputElement;
		const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");

		descriptor?.set?.call(input, nextValue);
		input.dispatchEvent(new Event("input", { bubbles: true }));
		input.dispatchEvent(new Event("change", { bubbles: true }));
	}, value);
}

// 테스트마다 고유 이메일을 써야 병렬 실행과 재실행 시 사용자 충돌이 없다.
async function registerUser(page: Page) {
	const email = `qa+${Date.now()}@household.local`;

	await page.goto("/register", { waitUntil: "domcontentloaded" });
	await page.getByLabel("이름").fill("QA Manual");
	await page.getByLabel("이메일").fill(email);
	await page.getByLabel("비밀번호").fill(PASSWORD);
	await page.getByRole("button", { name: "회원가입" }).click();
	await page.waitForURL("**/transactions", { timeout: 30_000 });
}

// 자산 추가 drawer를 실제 사용자처럼 통과해
// 파싱 결과가 "기존 자산 update"로 매칭될 기준 데이터를 먼저 만든다.
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

// 자연어 입력 -> 파싱 요청 -> 자산/부채 파싱 결과 dialog 오픈까지의 공통 흐름이다.
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

	// 첫 진입에서는 방금 만든 두 자산 모두 기존 계정과 매칭되어 "업데이트" 상태여야 한다.
	await expect(getItemLocators(dialog, "카카오뱅크").item.getByText("업데이트", { exact: true })).toBeVisible();
	await expect(getItemLocators(dialog, "토스뱅크").item.getByText("업데이트", { exact: true })).toBeVisible();

	await getItemLocators(dialog, "카카오뱅크").summaryButton.click();
	await setInputValue(getItemLocators(dialog, "카카오뱅크").item.getByLabel("이름"), "카카오뱅크X");
	// 이름을 바꾸면 기존 매칭 키가 깨지므로 즉시 신규 항목으로 전환돼야 한다.
	await expect(getItemLocators(dialog, "카카오뱅크X").item.getByText("신규", { exact: true })).toBeVisible();

	await getItemLocators(dialog, "카카오뱅크X").summaryButton.click();
	await setInputValue(getItemLocators(dialog, "카카오뱅크X").item.getByLabel("이름"), "카카오뱅크");
	// 원래 이름으로 되돌리면 다시 기존 계정 update 매칭으로 복귀해야 한다.
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
