/* eslint-env jest */

import React from "react";
import {expect} from "@jest/globals";
import {Space} from "antd";
import SignupPageWithRouter from "./SignupPage";

type SignupPageHarness = React.Component<Record<string, unknown>, Record<string, unknown>> & {
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

test("keeps signup phone controls in a full-width compact group", () => {
  const application = {
    name: "app-built-in",
    organizationObj: {countryCodes: ["US", "CN"]},
  };
  const page = new SignupPage({
    application,
    location: {search: ""},
    match: {params: {}},
  });
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
