import {beforeEach, describe, expect, test} from "vitest";
import {getAdminLoginRedirectPath} from "./adminLoginRouting";

describe("getAdminLoginRedirectPath", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("ignores lastLoginOrg for admin shell login redirect", () => {
    localStorage.setItem("lastLoginOrg", "wecom-wwe7e01c69367e67bf");

    expect(getAdminLoginRedirectPath()).toBe("/login");
  });
});
