/* eslint-env jest */

import React from "react";
import {expect} from "@jest/globals";
import {Space} from "antd";
import {LoginPage} from "./LoginPage";
// eslint-disable-next-line unused-imports/no-unused-imports
import type {LegacyAny} from "./AuthCoreTypes";

function createLoginPage(loginMethod: string, application?: LegacyAny) {
  const page = new LoginPage({
    application,
    location: {search: ""},
    match: {params: {}},
  });
  (page.state as LegacyAny).loginMethod = loginMethod;
  return page;
}

function findReactElement(node: React.ReactNode, predicate: (element: React.ReactElement<LegacyAny>) => boolean): React.ReactElement<LegacyAny> | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findReactElement(child, predicate);
      if (found !== null) {
        return found;
      }
    }
    return null;
  }

  if (!React.isValidElement<LegacyAny>(node)) {
    return null;
  }

  if (predicate(node)) {
    return node;
  }

  return findReactElement(node.props.children, predicate);
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

  test("keeps the verification phone controls in a full-width compact group", () => {
    const application = {
      organizationObj: {countryCodes: ["US", "CN"]},
    };
    const page = createLoginPage("verificationCodePhone", application);
    const phoneNode = page.renderFormItem(application, {name: "Username", visible: true, placeholder: "Phone"});
    const compact = findReactElement(phoneNode, element => element.type === Space.Compact);
    const countryCode = findReactElement(phoneNode, element => element.props.style?.width === "35%");
    const phone = findReactElement(phoneNode, element => element.props.className === "signup-phone-input");

    expect(compact).not.toBeNull();
    expect(compact?.props.block).toBe(true);
    expect(countryCode?.props.style.width).toBe("35%");
    expect(phone?.props.style.width).toBe("65%");
  });

  test("passes open through captcha and both face-recognition wrapper paths", () => {
    const captchaApplication = {
      providers: [{rule: "Always", provider: {owner: "built-in", name: "captcha", category: "Captcha"}}],
    };
    const captchaPage = createLoginPage("password", captchaApplication);
    (captchaPage.state as LegacyAny).openCaptchaModal = true;
    const captchaModal = captchaPage.renderCaptchaModal(captchaApplication, false) as React.ReactElement<LegacyAny>;
    expect(captchaModal.props.open).toBe(true);
    expect(captchaModal.props.visible).toBeUndefined();

    const faceApplication = {signinItems: [], providers: []};
    const facePage = createLoginPage("faceId", faceApplication);
    (facePage.state as LegacyAny).openFaceRecognitionModal = true;
    (facePage.state as LegacyAny).haveFaceIdProvider = true;
    const commonModal = findReactElement(
      facePage.renderFormItem(faceApplication, {name: "Login button", visible: true}),
      element => typeof element.props.onOk === "function" && typeof element.props.onCancel === "function" && element.props.withImage === undefined
    );
    expect(commonModal?.props.open).toBe(true);
    expect(commonModal?.props.visible).toBeUndefined();

    (facePage.state as LegacyAny).haveFaceIdProvider = false;
    const faceModal = findReactElement(
      facePage.renderFormItem(faceApplication, {name: "Login button", visible: true}),
      element => typeof element.props.onOk === "function" && typeof element.props.onCancel === "function" && element.props.owner === undefined
    );
    expect(faceModal?.props.open).toBe(true);
    expect(faceModal?.props.visible).toBeUndefined();
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

describe("LoginPage renderForm", () => {
  test("keeps i18n translation callable when rendering signup-disabled result", () => {
    const page = createLoginPage("password");
    (page.state as LegacyAny).mode = "signup";

    expect(() => page.renderForm({
      organization: "built-in",
      name: "app-built-in",
      enableSignUp: false,
    })).not.toThrow();
  });
});
