import {expect, test} from "../fixtures/admin";
import {fixtureIdentity, submitLogin} from "../support/auth";

const loginPayload = (password: string) => ({
  application: fixtureIdentity.application,
  organization: fixtureIdentity.organization,
  username: fixtureIdentity.username,
  password,
  autoSignin: true,
  type: "login",
});

test.describe("Login test", () => {
  test("Login succeeded", async ({request}) => {
    const response = await request.post("/api/login", {
      data: loginPayload(fixtureIdentity.password),
    });
    expect(response.ok()).toBe(true);
    await expect(response.json()).resolves.toMatchObject({status: "ok"});
  });

  test("ui Login succeeded", async ({page}) => {
    await submitLogin(page, fixtureIdentity.password);
    await expect(page).toHaveURL("/");
  });

  test("Login failed", async ({request}) => {
    const response = await request.post("/api/login", {
      data: loginPayload("1234"),
    });
    expect(response.ok()).toBe(true);
    await expect(response.json()).resolves.toMatchObject({status: "error"});
  });

  test("ui Login failed", async ({page}) => {
    await submitLogin(page, "1234");
    await expect(page).toHaveURL("/login");
  });
});
