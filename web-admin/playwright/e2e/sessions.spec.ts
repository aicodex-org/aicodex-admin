import {expect, test} from "../fixtures/admin";

test.describe("Test sessions", () => {
  test("test sessions", async ({adminPage}) => {
    await adminPage.goto("/");
    await adminPage.goto("/sessions");
    await expect(adminPage).toHaveURL("/sessions");
  });
});
