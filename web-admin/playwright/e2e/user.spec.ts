import {expect, test} from "../fixtures/admin";

test.describe("Test User", () => {
  test("test user", async ({adminPage}) => {
    await adminPage.goto("/");
    await adminPage.goto("/users");
    await expect(adminPage).toHaveURL("/users");
    await adminPage.goto("/users/built-in/admin");
    await expect(adminPage).toHaveURL("/users/built-in/admin");
  });
});
