/* eslint-env jest */

import {LoginPage} from "./LoginPage";

function createLoginPage(loginMethod) {
  const page = new LoginPage({
    location: {search: ""},
    match: {params: {}},
  });
  page.state.loginMethod = loginMethod;
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
