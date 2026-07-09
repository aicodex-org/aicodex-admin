/* eslint-env jest */
import React from "react";
import {afterEach, beforeAll, describe, expect, jest, test} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import i18next from "i18next";
import "./i18n";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";

jest.mock("./common/Editor", () => () => <pre data-testid="editor" />);
jest.mock("./common/theme/ThemeEditor", () => () => <span data-testid="theme-editor" />);
jest.mock("./common/CustomGithubCorner", () => () => null);
jest.mock("./common/select/LanguageSelect", () => () => <span data-testid="language-select" />);
jest.mock("./common/select/CountryCodeSelect", () => () => <span data-testid="country-code-select" />);
jest.mock("./common/select/RegionSelect", () => () => <span data-testid="region-select" />);
jest.mock("./common/select/AffiliationSelect", () => () => <span data-testid="affiliation-select" />);
jest.mock("./common/OAuthWidget", () => () => <span data-testid="oauth-widget" />);
jest.mock("./common/SendCodeInput", () => ({SendCodeInput: () => <span data-testid="send-code-input" />}));
jest.mock("./auth/ProviderButton", () => ({renderProviderLogo: () => <span data-testid="provider-logo" />}));
jest.mock("./auth/WeComLoginPanel", () => () => <span data-testid="wecom-login-panel" />);
jest.mock("./auth/PromptPage", () => () => <span data-testid="prompt-preview" />);
jest.mock("antd/es/layout/layout", () => ({
  Content: ({children, ...props}: {children?: React.ReactNode}) => <main {...props}>{children}</main>,
  Header: ({children, ...props}: {children?: React.ReactNode}) => <header {...props}>{children}</header>,
}));
jest.mock("antd/es/layout/Sider", () => function SiderMock({children, width, style, ...props}: {children?: React.ReactNode; width?: number; style?: React.CSSProperties}) {
  return <aside {...props} data-width={width} style={style}>{children}</aside>;
});
jest.mock("./auth/AuthBackend", () => ({
  getCaptchaStatus: require("@jest/globals").jest.fn(() => Promise.resolve({status: "ok", data: false})),
  logout: require("@jest/globals").jest.fn(() => Promise.resolve({status: "ok"})),
}));

const createRuntimeApplication = () => ({
  owner: "admin",
  organization: "wecom-wwe7e01c69367e67bf",
  organizationObj: {
    countryCodes: ["CN"],
    languages: ["zh", "en"],
    passwordOptions: [],
  },
  name: "app-aicodex-api-60",
  displayName: "AICodex API 60",
  category: "Default",
  type: "All",
  isShared: false,
  tags: [],
  providers: [
    {name: "provider_captcha_default", canSignIn: true, canSignUp: true, canUnlink: true, provider: {name: "provider_captcha_default", category: "Captcha", type: "Default"}},
    {name: "WeCom", canSignIn: true, canSignUp: true, canUnlink: true, provider: {name: "WeCom", category: "OAuth", type: "WeCom"}},
    {name: "Feishu", canSignIn: true, canSignUp: true, canUnlink: true, provider: {name: "Feishu", category: "OAuth", type: "Lark"}},
  ],
  signinMethods: [
    {name: "Password", rule: "None"},
    {name: "Verification code", rule: "None"},
    {name: "WeCom", rule: "None"},
  ],
  signinItems: [
    {name: "Back button", rule: "None", visible: true, customCss: ""},
    {name: "Languages", rule: "None", visible: true, customCss: ""},
    {name: "Logo", rule: "None", visible: true, customCss: ""},
    {name: "Signin methods", rule: "None", visible: true, customCss: ""},
    {name: "Username", rule: "None", visible: true, customCss: ""},
    {name: "Password", rule: "None", visible: true, customCss: ""},
    {name: "Verification code", rule: "None", visible: true, customCss: ""},
    {name: "Agreement", rule: "None", visible: true, customCss: ""},
    {name: "Forgot password?", rule: "None", visible: true, customCss: ""},
    {name: "Login button", rule: "None", visible: true, customCss: ""},
    {name: "Signup link", rule: "None", visible: true, customCss: ""},
    {name: "Providers", rule: "small", visible: true, customCss: ""},
  ],
  signupItems: null,
  signupHtml: "",
  signinHtml: "",
  signupUrl: "",
  signinUrl: "",
  forgetUrl: "",
  affiliationUrl: "",
  formBackgroundUrl: "",
  formBackgroundUrlMobile: "",
  formCss: "",
  formCssMobile: "",
  formOffset: 2,
  formSideHtml: "",
  themeData: null,
  headerHtml: "",
  footerHtml: "",
  redirectUris: ["https://example.test/callback"],
  grantTypes: ["authorization_code"],
  customScopes: [],
  tokenAttributes: [],
  samlAttributes: [],
  enableSignUp: false,
  enableSamlPostBinding: false,
  orgChoiceMode: "",
});

describe("ApplicationEditPage UI customization preview", () => {
  let ApplicationEditPage: any;
  let SigninMethodTable: any;
  let SigninTable: any;
  let SignupTable: any;

  beforeAll(async() => {
    if (!i18next.isInitialized) {
      await i18next.init({
        lng: "zh",
        fallbackLng: "en",
        resources: {
          en: {translation: en},
          zh: {translation: zh},
        },
        interpolation: {escapeValue: false},
      });
    }
    ApplicationEditPage = require("./ApplicationEditPage").default;
    SigninMethodTable = require("./table/SigninMethodTable").default;
    SigninTable = require("./table/SigninTable").default;
    SignupTable = require("./table/SignupTable").default;
  });

  afterEach(() => cleanup());

  test("renders runtime-shaped UI customization tab without a white screen", () => {
    window.location.hash = "#ui-customization";
    const page = new ApplicationEditPage({
      match: {params: {organizationName: "wecom-wwe7e01c69367e67bf", applicationName: "app-aicodex-api-60"}},
      location: {search: ""},
      history: {push: jest.fn()},
      account: {owner: "wecom-wwe7e01c69367e67bf", name: "admin"},
    } as any) as any;

    page.state = {
      ...page.state,
      activeMenuKey: "ui-customization",
      application: createRuntimeApplication(),
      providers: [],
      organizations: [{name: "wecom-wwe7e01c69367e67bf"}],
      certs: [],
    };

    expect(() => render(<MemoryRouter>{page.renderApplication()}</MemoryRouter>)).not.toThrow();
  });

  test("keeps UI customization table columns content-aware instead of stretching the first column", () => {
    const onUpdateTable = jest.fn();
    const methodTable = new SigninMethodTable({title: "登录方式", onUpdateTable}) as any;
    const signinTable = new SigninTable({title: "登录项", onUpdateTable}) as any;
    const signupTable = new SignupTable({title: "注册项", onUpdateTable}) as any;

    const methodElement = methodTable.renderTable(createRuntimeApplication().signinMethods);
    const signinElement = signinTable.renderTable(createRuntimeApplication().signinItems);
    const signupElement = signupTable.renderTable([]);

    expect(methodElement.props.tableLayout).toBe("fixed");
    expect(methodElement.props.className).toContain("application-edit-ui-table-control");
    expect(methodElement.props.className).toContain("application-edit-ui-table-signin-method");
    expect(methodElement.props.scroll?.x).toBe(900);
    expect(methodElement.props.columns.map((column: any) => [column.key, column.width])).toEqual([
      ["name", 300],
      ["displayName", 300],
      ["rule", 160],
      ["action", 112],
    ]);

    expect(signinElement.props.tableLayout).toBe("fixed");
    expect(signinElement.props.className).toContain("application-edit-ui-table-control");
    expect(signinElement.props.className).toContain("application-edit-ui-table-signin-items");
    expect(signinElement.props.scroll?.x).toBe(1220);
    expect(signinElement.props.columns.find((column: any) => column.key === "name")?.width).toBe(240);

    expect(signupElement.props.tableLayout).toBe("fixed");
    expect(signupElement.props.className).toContain("application-edit-ui-table-wide");
    expect(signupElement.props.className).toContain("application-edit-ui-table-signup-items");
    expect(signupElement.props.scroll?.x).toBe(1660);
    expect(signupElement.props.columns.find((column: any) => column.key === "name")?.width).toBe(220);
  });
});
