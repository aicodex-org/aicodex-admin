import {expect, test} from "../fixtures/admin";

test.describe("Test sysinfo", () => {
  test("test sysinfo", async ({adminPage}) => {
    await adminPage.goto("/");
    await adminPage.goto("/sysinfo");
    await expect(adminPage).toHaveURL("/sysinfo");
  });
});
