import {expect, test} from "../fixtures/admin";

test.describe("Test Orgnazition", () => {
  test("test org", async ({adminPage}) => {
    await adminPage.goto("/");
    await adminPage.goto("/organizations");
    await expect(adminPage).toHaveURL("/organizations");
    await adminPage.goto("/organizations/built-in");
    await expect(adminPage).toHaveURL("/organizations/built-in");
    await adminPage.goto("/organizations/built-in/users");
    await expect(adminPage).toHaveURL("/organizations/built-in/users");
  });
});
