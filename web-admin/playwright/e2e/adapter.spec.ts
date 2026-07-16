import {expect, test} from "../fixtures/admin";

test.describe("Test adapter", () => {
  test("test adapter", async ({adminPage}) => {
    await adminPage.goto("/adapters");
    await expect(adminPage).toHaveURL("/adapters");
    await adminPage.getByRole("button", {name: "Add"}).click();
    await expect(adminPage).toHaveURL(/\/adapters\/built-in\//);
  });
});
