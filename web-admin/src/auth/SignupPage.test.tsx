import {expect, test, vi} from "vitest";

import React from "react";
import {Form, Radio, Space} from "antd";
import SignupPageWithRouter from "./SignupPage";
import * as Setting from "../Setting";

type SignupPageHarness = React.Component<Record<string, unknown>, Record<string, unknown>> & {
  render: () => React.ReactNode;
  renderForm: (application: Record<string, unknown>) => React.ReactNode;
  renderFormItem: (application: Record<string, unknown>, signupItem: Record<string, unknown>) => React.ReactNode;
};

type SignupPageConstructor = new (props: Record<string, unknown>) => SignupPageHarness;

const SignupPage = (SignupPageWithRouter as unknown as {WrappedComponent: SignupPageConstructor}).WrappedComponent;

function findReactElement(node: React.ReactNode, predicate: (element: React.ReactElement<Record<string, unknown>>) => boolean): React.ReactElement<Record<string, unknown>> | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findReactElement(child, predicate);
      if (found !== null) {
        return found;
      }
    }
    return null;
  }

  if (!React.isValidElement<Record<string, unknown>>(node)) {
    return null;
  }

  if (predicate(node)) {
    return node;
  }

  return findReactElement(node.props.children as React.ReactNode, predicate);
}

function findReactElements(node: React.ReactNode, predicate: (element: React.ReactElement<Record<string, unknown>>) => boolean): React.ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) {
    return node.flatMap(child => findReactElements(child, predicate));
  }

  if (!React.isValidElement<Record<string, unknown>>(node)) {
    return [];
  }

  const matches = predicate(node) ? [node] : [];
  return matches.concat(findReactElements(node.props.children as React.ReactNode, predicate));
}

function hasClass(element: React.ReactElement<Record<string, unknown>>, className: string) {
  return String(element.props.className ?? "").split(/\s+/).includes(className);
}

function createApplication() {
  return {
    name: "app-built-in",
    organization: "built-in",
    organizationObj: {
      countryCodes: ["US", "CN"],
      languages: ["en", "zh"],
      passwordOptions: [],
    },
    enableSignUp: true,
    formOffset: 2,
    formCss: "",
    formCssMobile: "",
    formSideHtml: "",
    homepageUrl: "",
    signinUrl: "",
    signupHtml: "",
    signinItems: [{name: "Languages", rule: ""}],
    signupItems: [],
    providers: [],
  };
}

function createPage(application = createApplication(), history: Record<string, unknown> = {push: vi.fn()}) {
  return new SignupPage({
    application,
    history,
    location: {search: ""},
    match: {params: {}},
    themeAlgorithm: [],
  });
}

test("scopes the signup shell and form for viewport-constrained sizing", () => {
  const page = createPage();
  const tree = page.render();
  const loginForm = findReactElement(tree, element => hasClass(element, "login-form"));
  const form = findReactElement(tree, element => element.type === Form);

  expect(loginForm).not.toBeNull();
  expect(hasClass(loginForm!, "signup-login-form")).toBe(true);
  expect(form).not.toBeNull();
  expect(hasClass(form!, "signup-form")).toBe(true);
  expect(form?.props.labelWrap).toBe(true);
});

test("keeps signup mode controls fluid and account actions wrappable", () => {
  const application = createApplication();
  const historyPush = vi.fn();
  const page = createPage(application, {push: historyPush});
  const modeNode = page.renderFormItem(application, {
    name: "Email or Phone",
    visible: true,
    required: true,
    rule: "No verification",
    placeholder: "Contact",
  });
  const modeGroup = findReactElement(modeNode, element => element.type === Radio.Group);
  const actionNode = page.renderFormItem(application, {
    name: "Signup button",
    visible: true,
  });
  const actionSpace = findReactElement(actionNode, element => element.type === Space);
  const loginLink = findReactElement(actionNode, element => element.props.className === "signup-link");

  expect(modeGroup).not.toBeNull();
  expect(hasClass(modeGroup!, "signup-mode-selector")).toBe(true);
  expect((modeGroup?.props.style as React.CSSProperties | undefined)?.width).toBeUndefined();
  expect(actionSpace).not.toBeNull();
  expect(actionSpace?.props.wrap).toBe(true);
  expect(loginLink?.props.href).toBe("/login");

  const preventDefault = vi.fn();
  (loginLink?.props.onClick as (event: {preventDefault: () => void}) => void)({preventDefault});
  expect(preventDefault).toHaveBeenCalledTimes(1);
  expect(historyPush).toHaveBeenCalledWith("/login");
});

test("preserves email and phone mode order while switching responsive content", () => {
  const application = createApplication();
  const page = createPage(application);
  const signupItem = {
    name: "Email or Phone",
    visible: true,
    required: true,
    rule: "No verification",
    placeholder: "Contact",
  };
  const emailNode = page.renderFormItem(application, signupItem);
  const modeButtons = findReactElements(emailNode, element => element.type === Radio.Button);

  expect(modeButtons.map(button => button.props.value)).toEqual(["Email", "Phone"]);
  expect(findReactElement(emailNode, element => element.props.className === "signup-email-input")).not.toBeNull();
  expect(findReactElement(emailNode, element => element.type === Space.Compact)).toBeNull();

  (page as unknown as {state: Record<string, unknown>}).state.emailOrPhoneMode = "Phone";
  const phoneNode = page.renderFormItem(application, signupItem);
  expect(findReactElement(phoneNode, element => element.props.className === "signup-phone-input")).not.toBeNull();
  expect(findReactElement(phoneNode, element => element.type === Space.Compact)).not.toBeNull();
});

test("preserves the stored OAuth sign-in link for keyboard and pointer activation", () => {
  const application = createApplication();
  const page = createPage(application);
  const storedLink = "/login/oauth/authorize?client_id=fixture";
  const goToLinkSoft = vi.spyOn(Setting, "goToLinkSoft").mockImplementation(() => undefined);
  sessionStorage.setItem("signinUrl", storedLink);

  try {
    const actionNode = page.renderFormItem(application, {
      name: "Signup button",
      visible: true,
    });
    const loginLink = findReactElement(actionNode, element => element.props.className === "signup-link");
    const preventDefault = vi.fn();

    expect(loginLink?.props.href).toBe(storedLink);
    (loginLink?.props.onClick as (event: {preventDefault: () => void}) => void)({preventDefault});
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(goToLinkSoft).toHaveBeenCalledWith(page, storedLink);
  } finally {
    sessionStorage.removeItem("signinUrl");
    goToLinkSoft.mockRestore();
  }
});

test("keeps signup phone controls in a full-width compact group", () => {
  const application = createApplication();
  const page = createPage(application);
  const phoneNode = page.renderFormItem(application, {
    name: "Phone",
    visible: true,
    required: true,
    rule: "No verification",
    placeholder: "Phone",
  });
  const compact = findReactElement(phoneNode, element => element.type === Space.Compact);
  const countryCode = findReactElement(phoneNode, element => (element.props.style as React.CSSProperties | undefined)?.width === "35%");
  const phone = findReactElement(phoneNode, element => element.props.className === "signup-phone-input");

  expect(compact).not.toBeNull();
  expect(compact?.props.block).toBe(true);
  expect((countryCode?.props.style as React.CSSProperties).width).toBe("35%");
  expect((phone?.props.style as React.CSSProperties).width).toBe("65%");
});
