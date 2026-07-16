import {expect, test} from "../fixtures/admin";

test.describe("Test records", () => {
  test("test records", async ({adminPage}) => {
    await adminPage.goto("/");
    await adminPage.goto("/records");
    await expect(adminPage).toHaveURL("/records");
  });
});
