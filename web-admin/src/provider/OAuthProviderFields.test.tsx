/* eslint-env jest */
// eslint-disable-next-line unused-imports/no-unused-imports
import type {ReactElement} from "react";
import {jest, expect as jestExpect} from "@jest/globals";
import {render} from "@testing-library/react";
import {renderOAuthProviderFields} from "./OAuthProviderFields";
// eslint-disable-next-line unused-imports/no-unused-imports
import type {ProviderConfig} from "./ProviderFieldTypes";

type DomMatcherResult = ReturnType<typeof jestExpect> & {
  toBeInTheDocument: () => void;
};

const expect = jestExpect as unknown as (actual: unknown) => DomMatcherResult;

const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    change: (element: Element, event: {target: {value: string}}) => void;
    click: (element: Element) => void;
  };
};

jest.mock("i18next", () => {
  const mockI18next = {
    t: (key: string) => {
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

describe("renderOAuthProviderFields Lark endpoint mode guidance", () => {
  beforeEach(() => {
    window.matchMedia = ((query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    } as unknown as MediaQueryList)) as typeof window.matchMedia;
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("renders domestic Feishu endpoint mode details", () => {
    const provider: ProviderConfig = {
      category: "OAuth",
      type: "Lark",
      clientId: "cli_xxx",
      disableSsl: false,
    };

    const {container, getByText} = render(renderOAuthProviderFields(provider, jest.fn(), () => null) as ReactElement);

    expect(getByText("Endpoint mode")).toBeInTheDocument();
    expect(container.querySelector(".provider-edit-endpoint-mode-control")).toBeInTheDocument();
    expect(container.querySelector(".provider-edit-endpoint-mode-panel")).toBeInTheDocument();
    expect(container.querySelector(".provider-edit-endpoint-mode-badge")).toBeInTheDocument();
    expect(container.querySelectorAll(".provider-edit-endpoint-mode-code")).toHaveLength(2);
    expect(getByText(/Domestic Feishu/)).toBeInTheDocument();
    expect(getByText(/accounts\.feishu\.cn/)).toBeInTheDocument();
    expect(getByText(/open\.feishu\.cn/)).toBeInTheDocument();
    expect(getByText(/Feishu open platform/)).toBeInTheDocument();
  });

  test("renders global Lark endpoint mode details", () => {
    const provider: ProviderConfig = {
      category: "OAuth",
      type: "Lark",
      clientId: "cli_xxx",
      disableSsl: true,
    };

    const {getByText} = render(renderOAuthProviderFields(provider, jest.fn(), () => null) as ReactElement);

    expect(getByText(/Global Lark/)).toBeInTheDocument();
    expect(getByText(/accounts\.larksuite\.com/)).toBeInTheDocument();
    expect(getByText(/open\.larksuite\.com/)).toBeInTheDocument();
    expect(getByText(/Lark open platform/)).toBeInTheDocument();
  });

  test("updates the Google phone-number mode from the visible switch", () => {
    const updateProviderField = jest.fn();
    const {getByRole, getByText} = render(renderOAuthProviderFields({
      category: "OAuth",
      type: "Google",
      clientId: "google-client",
      disableSsl: false,
    }, updateProviderField, () => null) as ReactElement);

    expect(getByText("Get phone number")).toBeInTheDocument();
    fireEvent.click(getByRole("switch"));

    expect(updateProviderField).toHaveBeenCalledWith("disableSsl", true);
  });

  test("shows Azure tenant identity and updates its domain", () => {
    const updateProviderField = jest.fn();
    const {getByDisplayValue, getByText} = render(renderOAuthProviderFields({
      category: "OAuth",
      type: "AzureAD",
      domain: "tenant-old",
    }, updateProviderField, () => null) as ReactElement);

    expect(getByText("Tenant ID")).toBeInTheDocument();
    fireEvent.change(getByDisplayValue("tenant-old"), {target: {value: "tenant-new"}});

    expect(updateProviderField).toHaveBeenCalledWith("domain", "tenant-new");
  });

  test("edits the complete custom OAuth contract and keeps mapping and logo preview visible", () => {
    const updateProviderField = jest.fn();
    const {getByAltText, getByDisplayValue, getByRole, getByText} = render(renderOAuthProviderFields({
      category: "OAuth",
      type: "Custom OAuth",
      emailRegex: "@old.example$",
      customAuthUrl: "https://id.example/auth",
      customTokenUrl: "https://id.example/token",
      scopes: "openid",
      customUserInfoUrl: "https://id.example/userinfo",
      enablePkce: false,
      customLogo: "https://id.example/logo.png",
    }, updateProviderField, () => <span>Mapping editor</span>) as ReactElement);

    expect(getByText("Mapping editor")).toBeInTheDocument();
    expect(getByAltText("https://id.example/logo.png")).toBeInTheDocument();

    fireEvent.change(getByDisplayValue("@old.example$"), {target: {value: "@new.example$"}});
    fireEvent.change(getByDisplayValue("https://id.example/auth"), {target: {value: "https://new.example/auth"}});
    fireEvent.change(getByDisplayValue("https://id.example/token"), {target: {value: "https://new.example/token"}});
    fireEvent.change(getByDisplayValue("openid"), {target: {value: "openid profile"}});
    fireEvent.change(getByDisplayValue("https://id.example/userinfo"), {target: {value: "https://new.example/userinfo"}});
    fireEvent.change(getByDisplayValue("https://id.example/logo.png"), {target: {value: "https://new.example/logo.png"}});
    fireEvent.click(getByRole("switch"));

    expect(updateProviderField.mock.calls).toEqual(jestExpect.arrayContaining([
      ["emailRegex", "@new.example$"],
      ["customAuthUrl", "https://new.example/auth"],
      ["customTokenUrl", "https://new.example/token"],
      ["scopes", "openid profile"],
      ["customUserInfoUrl", "https://new.example/userinfo"],
      ["customLogo", "https://new.example/logo.png"],
      ["enablePkce", true],
    ]));
  });

  test("keeps WeChat media controls usable only with the required credentials", () => {
    const updateProviderField = jest.fn();
    const {getAllByRole, getByDisplayValue, getByRole} = render(renderOAuthProviderFields({
      category: "OAuth",
      type: "WeChat",
      clientId: "media-app",
      clientId2: "open-app",
      disableSsl: true,
      content: "access-token",
      signName: "open",
    }, updateProviderField, () => null) as ReactElement);

    fireEvent.click(getByRole("switch"));
    fireEvent.change(getByDisplayValue("access-token"), {target: {value: "token-updated"}});
    fireEvent.click(getAllByRole("radio")[1]);

    expect(updateProviderField.mock.calls).toEqual(jestExpect.arrayContaining([
      ["disableSsl", false],
      ["content", "token-updated"],
      ["signName", "media"],
    ]));
  });
});
