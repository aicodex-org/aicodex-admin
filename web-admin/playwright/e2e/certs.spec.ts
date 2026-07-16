import {expect, test} from "../fixtures/admin";

test.describe("Test certs", () => {
  test("test certs", async ({adminPage}) => {
    await adminPage.goto("/");
    await adminPage.goto("/certs");
    await expect(adminPage).toHaveURL("/certs");
    await adminPage.goto("/certs/cert-built-in");
    await expect(adminPage).toHaveURL("/certs/cert-built-in");
  });
});
