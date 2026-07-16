/* eslint-env jest */
import React from "react";
import {afterEach, beforeAll, beforeEach, describe, expect, jest, test} from "@jest/globals";
import {act, cleanup, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import i18next from "i18next";
import "./i18n";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";
import {type ConsoleCallSpy, getReactActWarnings} from "./testUtils/reactAsyncWarnings";

let ApplicationEditPage: any;

const {fireEvent} = require("@testing-library/react") as {fireEvent: {
  click: (element: Element) => boolean;
  change: (element: Element, init: {target: Record<string, unknown>}) => boolean;
}};

jest.mock("./common/Editor", () => () => <pre data-testid="editor" />);
jest.mock("./common/theme/ThemeEditor", () => ({onThemeChange}: {onThemeChange?: (_: unknown, themeData: Record<string, unknown>) => void}) => (
  <button type="button" data-testid="theme-editor" onClick={() => onThemeChange?.(undefined, {colorPrimary: "#123456"})}>
    Theme editor
  </button>
));
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

function createPage(applicationOverrides: Record<string, unknown> = {}): any {
  const page = new ApplicationEditPage({
    match: {params: {organizationName: "wecom-wwe7e01c69367e67bf", applicationName: "app-aicodex-api-60"}},
    location: {search: ""},
    history: {push: jest.fn()},
    account: {owner: "wecom-wwe7e01c69367e67bf", name: "admin"},
  } as any) as any;

  page.state = {
    ...page.state,
    activeMenuKey: "ui-customization",
    application: {...createRuntimeApplication(), ...applicationOverrides},
    providers: [],
    organizations: [{name: "wecom-wwe7e01c69367e67bf"}],
    certs: [],
  };
  page.setState = (patch: Record<string, unknown>, callback?: () => void) => {
    page.state = {...page.state, ...patch};
    callback?.();
  };
  return page;
}

function getFieldColumns(container: HTMLElement, label: RegExp): HTMLElement[] {
  const row = Array.from(container.querySelectorAll(".ant-row")).find(element => {
    const columns = Array.from(element.children).filter(child => child.classList.contains("ant-col")) as HTMLElement[];
    return columns.length >= 2 && label.test(columns[0].textContent || "");
  });
  return row ? Array.from(row.children).filter(child => child.classList.contains("ant-col")) as HTMLElement[] : [];
}

function getFieldInput(container: HTMLElement, label: RegExp): HTMLInputElement {
  const columns = getFieldColumns(container, label);
  const input = columns[1]?.querySelector("input") as HTMLInputElement | null;
  if (!input) {
    throw new Error(`未找到字段输入框: ${label}`);
  }
  return input;
}

function getFieldSwitch(container: HTMLElement, label: RegExp): HTMLButtonElement {
  const columns = getFieldColumns(container, label);
  const input = columns[1]?.querySelector("button[role='switch']") as HTMLButtonElement | null;
  if (!input) {
    throw new Error(`未找到字段开关: ${label}`);
  }
  return input;
}

describe("ApplicationEditPage UI customization preview", () => {
  let consoleErrorSpy: ConsoleCallSpy;
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

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error") as unknown as ConsoleCallSpy;
  });

  afterEach(() => {
    cleanup();
    const actWarnings = getReactActWarnings(consoleErrorSpy.mock.calls);
    consoleErrorSpy.mockRestore();
    expect(actWarnings).toEqual([]);
  });

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

  test("updates the signup switch and reflects its enabled state", async() => {
    const page = createPage({enableSignUp: false});
    page.state.activeMenuKey = "authentication";
    const view = render(<MemoryRouter>{page.renderApplication()}</MemoryRouter>);

    const signupSwitch = getFieldSwitch(view.container, /Enable signup|启用注册/);
    expect(signupSwitch.getAttribute("aria-checked")).toBe("false");

    await act(async() => {
      fireEvent.click(signupSwitch);
      await new Promise(resolve => setTimeout(resolve, 0));
      view.rerender(<MemoryRouter>{page.renderApplication()}</MemoryRouter>);
    });

    expect(page.state.application.enableSignUp).toBe(true);
    expect(getFieldSwitch(view.container, /Enable signup|启用注册/).getAttribute("aria-checked")).toBe("true");
  });

  test("shows the side panel HTML field after enabling the side panel and keeps entered content", () => {
    const page = createPage({formOffset: 2, formSideHtml: ""});
    const view = render(<MemoryRouter>{page.renderApplication()}</MemoryRouter>);

    expect(view.queryByText(/Side panel HTML|侧面板HTML/)).toBeNull();
    fireEvent.click(view.getByText(/Enable side panel|启用侧面板/));
    view.rerender(<MemoryRouter>{page.renderApplication()}</MemoryRouter>);

    const sidePanelInput = getFieldInput(view.container, /Side panel HTML|侧面板HTML/);
    fireEvent.change(sidePanelInput, {target: {value: "<aside>Support</aside>"}});
    view.rerender(<MemoryRouter>{page.renderApplication()}</MemoryRouter>);

    expect(page.state.application.formOffset).toBe(4);
    expect(page.state.application.formSideHtml).toBe("<aside>Support</aside>");
    expect(getFieldInput(view.container, /Side panel HTML|侧面板HTML/).value).toBe("<aside>Support</aside>");
  });

  test("enables the custom theme and applies the editor color to the static previews", () => {
    const page = createPage({themeData: null});
    const view = render(<MemoryRouter>{page.renderApplication()}</MemoryRouter>);

    expect(view.queryByTestId("theme-editor")).toBeNull();
    fireEvent.click(view.getByText(/Customize theme|定制主题/));
    view.rerender(<MemoryRouter>{page.renderApplication()}</MemoryRouter>);

    fireEvent.click(view.getByTestId("theme-editor"));
    view.rerender(<MemoryRouter>{page.renderApplication()}</MemoryRouter>);

    expect(page.state.application.themeData).toEqual(expect.objectContaining({isEnabled: true, colorPrimary: "#123456"}));
    expect((view.container.querySelector(".application-edit-static-preview-logo") as HTMLElement).style.backgroundColor).toBe("rgb(18, 52, 86)");
  });

  test("writes custom CSS and header HTML back to the rendered form", () => {
    const page = createPage({formCss: "", headerHtml: ""});
    const view = render(<MemoryRouter>{page.renderApplication()}</MemoryRouter>);

    fireEvent.change(getFieldInput(view.container, /Custom CSS|表单CSS/), {target: {value: ".login { color: red; }"}});
    fireEvent.change(getFieldInput(view.container, /Header HTML|页头 HTML/), {target: {value: "<header>AICodex</header>"}});
    view.rerender(<MemoryRouter>{page.renderApplication()}</MemoryRouter>);

    expect(page.state.application.formCss).toBe(".login { color: red; }");
    expect(page.state.application.headerHtml).toBe("<header>AICodex</header>");
    expect(getFieldInput(view.container, /Custom CSS|表单CSS/).value).toBe(".login { color: red; }");
    expect(getFieldInput(view.container, /Header HTML|页头 HTML/).value).toBe("<header>AICodex</header>");
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
