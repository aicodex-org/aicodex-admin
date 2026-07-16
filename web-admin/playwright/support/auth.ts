import {expect, type Page} from "@playwright/test";

export const loginSelectors = {
  username: "#input",
  password: "#normal_login_password",
  submit: ".ant-btn",
} as const;

/** 只允许在一次性 built-in seed 环境中使用的确定性测试身份。 */
export const fixtureIdentity = {
  application: "app-built-in",
  organization: "built-in",
  username: "admin",
  password: "123",
} as const;

/** 通过真实登录表单提交一次性 fixture 身份，不创建 API mock。 */
export async function submitLogin(page: Page, password: string): Promise<void> {
  await page.goto("/");
  await page.locator(loginSelectors.username).fill(fixtureIdentity.username);
  await page.locator(loginSelectors.password).fill(password);
  await page.locator(loginSelectors.submit).click();
}

/** 保持原 `cy.login()` 的逐测试 UI 登录和根路由断言。 */
export async function loginAsFixtureAdmin(page: Page): Promise<void> {
  await submitLogin(page, fixtureIdentity.password);
  await expect(page).toHaveURL("/");
}
