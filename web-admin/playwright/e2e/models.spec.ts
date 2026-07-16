import {expect, test} from "../fixtures/admin";

test.describe("Test models", () => {
  test("test org", async ({adminPage}) => {
    await adminPage.goto("/");
    await adminPage.goto("/models");
    await expect(adminPage).toHaveURL("/models");
    await adminPage.goto("/models/built-in/model-built-in");
    await expect(adminPage).toHaveURL("/models/built-in/model-built-in");
  });
});
