import {expect, test} from "../fixtures/admin";

test.describe("Test resource", () => {
  test("test resource", async ({adminPage}) => {
    await adminPage.goto("/");
    await adminPage.goto("/resources");
    await expect(adminPage).toHaveURL("/resources");
  });
});
