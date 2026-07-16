/* eslint-env jest */
import React from "react";
import {expect, jest, test} from "@jest/globals";
import {render} from "@testing-library/react";

interface JestDomMatchers {
  toHaveAttribute(name: string, value?: unknown): void;
  toBeInTheDocument(): void;
}

const expectElement = (element: Element): JestDomMatchers => expect(element) as unknown as JestDomMatchers;

jest.mock("i18next", () => {
  const mockI18next = {
    t: (key: string): string => {
      const [, value] = key.split(":");
      return value || key;
    },
    init: () => Promise.resolve(),
    use: () => mockI18next,
  };

  return {
    __esModule: true,
    default: mockI18next,
    ...mockI18next,
  };
});

jest.mock("./Provider", () => ({
  getAuthUrl: () => "https://auth.example.com/callback-start",
}));

import {renderProviderLogo} from "./ProviderButton";

describe("renderProviderLogo Lark/Feishu branding", () => {
  const application = {name: "app-built-in"};
  const location = {search: ""};

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("renders domestic Feishu branding in the small provider icon entry", () => {
    const provider = {
      category: "OAuth",
      type: "Lark",
      name: "feishu",
      displayName: "",
      disableSsl: false,
    };

    const {getByAltText} = render(renderProviderLogo(provider, application, 24, 0, "small", location) as React.ReactElement);
    const image = getByAltText("Sign in with Feishu");

    expectElement(image).toHaveAttribute("src", expect.stringContaining("/img/social_lark.png"));
  });

  test("renders global Lark branding in the small provider icon entry", () => {
    const provider = {
      category: "OAuth",
      type: "Lark",
      name: "lark",
      displayName: "",
      disableSsl: true,
    };

    const {getByAltText} = render(renderProviderLogo(provider, application, 24, 0, "small", location) as React.ReactElement);

    expectElement(getByAltText("Sign in with Lark")).toHaveAttribute("src", expect.stringContaining("/img/social_lark.png"));
  });

  test("renders domestic Feishu branding in the large provider button entry", () => {
    const provider = {
      category: "OAuth",
      type: "Lark",
      name: "feishu",
      displayName: "",
      disableSsl: false,
    };

    const {getByAltText, getByText} = render(renderProviderLogo(provider, application, null, null, "large", location) as React.ReactElement);

    expectElement(getByAltText("Sign in with Feishu")).toBeInTheDocument();
    expectElement(getByText("Sign in with Feishu")).toBeInTheDocument();
  });

  test.each([
    {category: "Web3", type: "Custom"},
    {category: "OAuth", type: "MetaMask"},
    {category: "SAML", type: "Web3Onboard"},
  ])("does not render retired wallet provider $category/$type", (provider) => {
    expect(renderProviderLogo({...provider, name: "retired", displayName: ""}, application, null, null, "large", location)).toBeNull();
  });
});
