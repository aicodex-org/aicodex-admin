import {expect, test} from "../fixtures/admin";

test.describe("Test syncers", () => {
  test("test syncers", async ({adminPage}) => {
    await adminPage.goto("/syncers");
    await expect(adminPage).toHaveURL("/syncers");
    await adminPage.getByRole("button", {name: "Add"}).click();
    await expect(adminPage).toHaveURL(/\/syncers\//);
  });
});
