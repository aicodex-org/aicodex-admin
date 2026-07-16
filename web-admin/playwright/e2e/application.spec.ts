import {expect, test} from "../fixtures/admin";

test.describe("Test aplication", () => {
  test("test aplication", async ({adminPage}) => {
    await adminPage.goto("/");
    await adminPage.goto("/applications");
    await expect(adminPage).toHaveURL("/applications");
    await adminPage.goto("/applications/built-in/app-built-in");
    await expect(adminPage).toHaveURL("/applications/built-in/app-built-in");
  });
});
