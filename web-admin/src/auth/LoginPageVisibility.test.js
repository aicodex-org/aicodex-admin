/* eslint-env jest */

import {shouldHidePasswordRecoveryForLoginMethod} from "./LoginPageVisibility";

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
