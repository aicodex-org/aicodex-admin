import {expect, test} from "../fixtures/admin";

test.describe("Test roles", () => {
  test("test role", async ({adminPage}) => {
    await adminPage.goto("/");
    await adminPage.goto("/roles");
    await expect(adminPage).toHaveURL("/roles");
  });
});
