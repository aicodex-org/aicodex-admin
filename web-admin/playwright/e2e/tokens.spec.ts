import {expect, test} from "../fixtures/admin";

test.describe("Test tokens", () => {
  test("test records", async ({adminPage}) => {
    await adminPage.goto("/tokens");
    await expect(adminPage).toHaveURL("/tokens");
    await adminPage.getByRole("button", {name: "Add"}).click();
    await expect(adminPage).toHaveURL(/\/tokens\//);
  });
});
