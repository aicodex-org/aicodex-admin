/* eslint-env jest */

import {expect} from "@jest/globals";
import {LoginPage} from "./LoginPage";
// eslint-disable-next-line unused-imports/no-unused-imports
import type {LegacyAny} from "./AuthCoreTypes";

function createLoginPage(loginMethod: string) {
  const page = new LoginPage({
    location: {search: ""},
    match: {params: {}},
  });
  (page.state as LegacyAny).loginMethod = loginMethod;
  return page;
}

describe("LoginPage renderFormItem", () => {
  const application = {
    organization: "built-in",
    name: "app-built-in",
  };
  const forgotPasswordItem = {
    name: "Forgot password?",
    visible: true,
  };

  test("does not render password recovery in QR code login modes", () => {
    expect(createLoginPage("wecom").renderFormItem(application, forgotPasswordItem)).toBeNull();
    expect(createLoginPage("wechat").renderFormItem(application, forgotPasswordItem)).toBeNull();
  });
});

describe("LoginPage authorization errors", () => {
  test("renders an OAuth authorization error without losing the i18next translator context", () => {
    const page = new LoginPage({
      application: null,
      location: {search: "?client_id=aicodex-insight-60"},
      match: {params: {}},
    });
    page.setState = (nextState: LegacyAny) => {
      page.state = {...page.state, ...nextState};
    };
    page.setState({msg: "invalid client"});

    expect(() => page.render()).not.toThrow();
  });
});
