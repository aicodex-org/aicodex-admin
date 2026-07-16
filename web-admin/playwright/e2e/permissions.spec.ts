import {expect, test} from "../fixtures/admin";

test.describe("Test permissions", () => {
  test("test permissions", async ({adminPage}) => {
    await adminPage.goto("/");
    await adminPage.goto("/permissions");
    await expect(adminPage).toHaveURL("/permissions");
    await adminPage.goto("/permissions/built-in/permission-built-in");
    await expect(adminPage).toHaveURL("/permissions/built-in/permission-built-in");
  });
});
