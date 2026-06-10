/* eslint-env jest */

import {getLoginPanelClassName, shouldHidePasswordRecoveryForLoginMethod} from "./LoginPageVisibility";

describe("shouldHidePasswordRecoveryForLoginMethod", () => {
  test("hides password recovery for QR code login methods", () => {
    expect(shouldHidePasswordRecoveryForLoginMethod("wecom")).toBe(true);
    expect(shouldHidePasswordRecoveryForLoginMethod("wechat")).toBe(true);
  });

  test("keeps password recovery available for non-QR login methods", () => {
    expect(shouldHidePasswordRecoveryForLoginMethod("password")).toBe(false);
    expect(shouldHidePasswordRecoveryForLoginMethod("verificationCode")).toBe(false);
    expect(shouldHidePasswordRecoveryForLoginMethod(null)).toBe(false);
  });
});

describe("getLoginPanelClassName", () => {
  test("uses compact login panel only for WeCom QR login", () => {
    expect(getLoginPanelClassName(false, "wecom")).toBe("login-panel login-panel-wecom-compact");
    expect(getLoginPanelClassName(true, "wecom")).toBe("login-panel-dark login-panel-wecom-compact");
    expect(getLoginPanelClassName(false, "password")).toBe("login-panel");
  });
});
