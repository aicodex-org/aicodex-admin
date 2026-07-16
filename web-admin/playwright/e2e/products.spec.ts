import {expect, test} from "../fixtures/admin";

test.describe("Test products", () => {
  test("test products", async ({adminPage}) => {
    await adminPage.goto("/products");
    await expect(adminPage).toHaveURL("/products");
    await adminPage.getByRole("button", {name: "Add"}).click();
    await expect(adminPage).toHaveURL(/\/products\//);
  });
});
