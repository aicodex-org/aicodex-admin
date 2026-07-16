import {expect, test} from "../fixtures/admin";

test.describe("Test providers", () => {
  test("test providers", async ({adminPage}) => {
    await adminPage.goto("/");
    await adminPage.goto("/providers");
    await expect(adminPage).toHaveURL("/providers");
    await adminPage.goto("/providers/admin/provider_captcha_default");
    await expect(adminPage).toHaveURL("/providers/admin/provider_captcha_default");
  });
});
