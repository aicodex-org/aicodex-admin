import {expect, test} from "../fixtures/admin";

test.describe("Test payments", () => {
  test("test payments", async ({adminPage}) => {
    await adminPage.goto("/payments");
    await expect(adminPage).toHaveURL("/payments");
    await adminPage.getByRole("button", {name: "Add"}).click();
    await expect(adminPage).toHaveURL(/\/payments\//);
  });
});
