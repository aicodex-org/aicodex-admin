/* eslint-env jest */

import {getSigninMethodChoiceItems} from "./SigninMethodChoice";

const t = key => {
  const [, value] = key.split(":");
  return value || key;
};

describe("getSigninMethodChoiceItems", () => {
  test("deduplicates methods that resolve to the same tab key", () => {
    const items = getSigninMethodChoiceItems([
      {name: "Password", displayName: "Password", rule: "All"},
      {name: "Password", displayName: "Password", rule: "Non-LDAP"},
      {name: "WeCom", displayName: "WeCom", rule: "Tab"},
      {name: "WeCom", displayName: "WeCom", rule: "None"},
    ], t);

    expect(items).toEqual([
      {label: "Password", key: "password"},
      {label: "WeCom", key: "wecom"},
    ]);
  });

  test("skips hidden password and keeps custom labels", () => {
    const items = getSigninMethodChoiceItems([
      {name: "Password", displayName: "Password", rule: "Hide password"},
      {name: "Verification code", displayName: "Email OTP", rule: "Email only"},
      {name: "LDAP", displayName: "Directory", rule: "None"},
    ], t);

    expect(items).toEqual([
      {label: "Email OTP", key: "verificationCodeEmail"},
      {label: "Directory", key: "ldap"},
    ]);
  });
});
