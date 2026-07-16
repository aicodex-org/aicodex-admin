import {expect, test} from "../fixtures/admin";

test.describe("Test webhooks", () => {
  test("test webhooks", async ({adminPage}) => {
    await adminPage.goto("/webhooks");
    await expect(adminPage).toHaveURL("/webhooks");
    await adminPage.getByRole("button", {name: "Add"}).click();
    await expect(adminPage).toHaveURL(/\/webhooks\//);
  });
});
