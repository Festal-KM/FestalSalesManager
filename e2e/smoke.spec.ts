import { test, expect, type Page } from "@playwright/test";

function currentYm(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function login(page: Page, id: string, pw: string) {
  await page.goto("/login");
  await page.getByLabel(/ログインID/).fill(id);
  await page.getByLabel(/パスワード/).fill(pw);
  await page.getByRole("button", { name: "ログイン" }).click();
  await page.waitForURL("**/dashboard");
}

test("未ログインで保護画面にアクセスするとログインへ戻る", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/sales");
  await expect(page).toHaveURL(/\/login/);
});

test("Admin通し: 取引先→メンバー→売上→upsert→編集→論理削除", async ({ page }) => {
  const stamp = Date.now().toString().slice(-6);
  const company = `テスト取引先${stamp}`;
  const memberName = `テスト太郎${stamp}`;
  const month = currentYm();

  await login(page, "admin", "Admin1234!");

  // --- 取引先登録（採番される） ---
  await page.goto("/clients/new");
  await page.getByLabel(/会社名/).fill(company);
  await page.getByRole("button", { name: "保存" }).click();
  await page.waitForURL("**/clients");
  await expect(page.getByText(company)).toBeVisible();

  // --- メンバー登録（採番される） ---
  await page.goto("/members/new");
  await page.getByLabel(/氏名/).fill(memberName);
  await page.getByLabel(/雇用区分/).selectOption("Proper");
  await page.getByRole("button", { name: "保存" }).click();
  await page.waitForURL("**/members");
  await expect(page.getByText(memberName)).toBeVisible();

  // --- 売上登録（実績 100,000） ---
  await page.goto("/sales/new");
  const memberVal = await page
    .locator("#member_id option", { hasText: memberName })
    .getAttribute("value");
  const clientVal = await page
    .locator("#client_id option", { hasText: company })
    .getAttribute("value");
  await page.locator("#member_id").selectOption(memberVal!);
  await page.locator("#client_id").selectOption(clientVal!);
  await page.locator("#period_month").fill(month);
  await page.locator("#status").selectOption("Actual");
  await page.locator("#amount").fill("100000");
  await page.getByRole("button", { name: "登録" }).click();
  await page.waitForURL("**/sales");

  // --- 同条件で再登録 200,000 → upsert（新規作成されず更新） ---
  await page.goto("/sales/new");
  await page.locator("#member_id").selectOption(memberVal!);
  await page.locator("#client_id").selectOption(clientVal!);
  await page.locator("#period_month").fill(month);
  await page.locator("#status").selectOption("Actual");
  await page.locator("#amount").fill("200000");
  await page.getByRole("button", { name: "登録" }).click();
  await page.waitForURL("**/sales");

  // 当月一覧で該当取引先の行は1件・金額200,000
  await expect(page.getByRole("row").filter({ hasText: company })).toHaveCount(1);
  await expect(
    page.getByRole("row").filter({ hasText: company }).getByText("¥200,000"),
  ).toBeVisible();

  // --- ダッシュボードKPI表示 ---
  await page.goto("/dashboard");
  await expect(page.getByText("当月売上 実績")).toBeVisible();

  // --- 編集: 300,000 ---
  await page.goto("/sales");
  await page
    .getByRole("row")
    .filter({ hasText: company })
    .getByRole("link", { name: "編集" })
    .click();
  await page.waitForURL("**/edit");
  await page.locator("#amount").fill("300000");
  await page.getByRole("button", { name: "更新" }).click();
  await page.waitForURL("**/sales");
  await expect(
    page.getByRole("row").filter({ hasText: company }).getByText("¥300,000"),
  ).toBeVisible();

  // --- 論理削除 → 一覧から消える ---
  await page
    .getByRole("row")
    .filter({ hasText: company })
    .getByRole("link", { name: "編集" })
    .click();
  await page.waitForURL("**/edit");
  await page.getByRole("button", { name: /削除/ }).click();
  await page.waitForURL("**/sales");
  await expect(page.getByRole("row").filter({ hasText: company })).toHaveCount(0);
});

test("User権限: マスタ登録ボタン非表示・Admin専用URLは弾かれる", async ({ page }) => {
  await login(page, "user1", "User1234!");

  // メンバー一覧に登録ボタンが出ない
  await page.goto("/members");
  await expect(page.getByRole("link", { name: "メンバー登録" })).toHaveCount(0);

  // Admin専用URLへ直接アクセスするとダッシュボードへ戻される
  await page.goto("/members/new");
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/clients/new");
  await expect(page).toHaveURL(/\/dashboard/);
});
