/* eslint-env jest */
import {expect, jest} from "@jest/globals";
import fs from "fs";
import path from "path";

const mockComponent = (testId: string) => {
  const mockReact = require("react");
  return () => mockReact.createElement("div", {"data-testid": testId});
};

jest.mock("./common/Editor", () => mockComponent("editor"));
jest.mock("./table/SigninMethodTable", () => mockComponent("signin-method-table"));
jest.mock("./table/SigninTable", () => mockComponent("signin-table"));
jest.mock("./table/SignupTable", () => mockComponent("signup-table"));
jest.mock("./common/theme/ThemeEditor", () => mockComponent("theme-editor"));
jest.mock("./auth/SignupPage", () => mockComponent("signup-page"));
jest.mock("./auth/LoginPage", () => mockComponent("login-page"));
jest.mock("./auth/PromptPage", () => mockComponent("prompt-page"));
jest.mock("antd/es/layout/layout", () => ({Content: "div", Header: "div"}));
jest.mock("antd/es/layout/Sider", () => "aside");

const ApplicationEditPage = require("./ApplicationEditPage").default;

const readSrc = (fileName: string): string => fs.readFileSync(path.join(__dirname, fileName), "utf8") as string;

describe("large edit page form layout", () => {
  const editPages = [
    ["OrganizationEditPage.tsx", "organization-edit-page", "organization-edit-card"],
    ["UserEditPage.tsx", "user-edit-page", "user-edit-card"],
    ["ApplicationEditPage.tsx", "application-edit-page", "application-edit-card"],
    ["ProviderEditPage.tsx", "provider-edit-page", "provider-edit-card"],
    ["SyncerEditPage.tsx", "syncer-edit-page", "syncer-edit-card"],
  ];

  editPages.forEach(([fileName, pageClass, cardClass]) => {
    test(`keeps ${fileName} inside the shared large edit layout boundary`, () => {
      const source = readSrc(fileName);

      expect(source).toContain(`admin-large-edit-page ${pageClass}`);
      expect(source).toContain(`admin-large-edit-card ${cardClass}`);
    });
  });

  test("keeps Application edit form rows scoped to its scroll content", () => {
    const source = readSrc("ApplicationEditPage.tsx");

    expect(source).toContain("className=\"application-edit-form-content\"");
    expect(source).toContain("className=\"admin-large-edit-card application-edit-card\"");
  });

  test("keeps Organization edit tabs shell separated from tab business content", () => {
    const source = readSrc("OrganizationEditPage.tsx");
    const appLess = readSrc("App.less");

    expect(source).toContain("className=\"organization-edit-shell\"");
    expect(source).toContain("className=\"organization-edit-tabs\"");
    expect(source).toContain("className=\"organization-edit-scroll-content\"");
    expect(source).toContain("className=\"organization-edit-action-bar\"");
    expect(appLess).toContain("grid-template-columns: repeat(2, minmax(320px, 1fr));");
    expect(appLess).toContain("@media screen and (max-width: 1024px)");
    expect(appLess).toContain("overflow-x: hidden;");
  });

  test("keeps Organization edit shell compatible with dark admin shell theme tokens", () => {
    const appLess = readSrc("App.less");
    const organizationEditCss = appLess.slice(
      appLess.indexOf(".organization-edit-page"),
      appLess.indexOf(".admin-gateway-edit-page")
    );

    expect(organizationEditCss).toContain("background: var(--admin-shell-surface-bg, #fff);");
    expect(organizationEditCss).toContain("flex: 0 0 42px;");
    expect(organizationEditCss).toContain("padding: 8px 0 7px;");
    expect(organizationEditCss).toContain("flex: 0 0 54px;");
    expect(organizationEditCss).toContain("color: var(--admin-shell-text-primary");
    expect(organizationEditCss).toContain("padding: 14px 32px 24px;");
    expect(organizationEditCss).not.toMatch(/\\.organization-edit-page \\.organization-edit-tabs\\.ant-tabs \\{[\s\S]*?border-bottom/);
    expect(organizationEditCss).toContain("body.admin-shell-theme-dark .organization-edit-page .ant-input");
    expect(organizationEditCss).toContain("body.admin-shell-theme-dark .organization-edit-page .ant-table");
    expect(organizationEditCss).toContain("body.admin-shell-theme-dark .organization-edit-page .ant-tree");
    expect(organizationEditCss).toContain("background: var(--admin-shell-surface-soft-bg");
    expect(organizationEditCss).not.toMatch(/--ant-color-(bg|text|border|fill)/);
  });

  test("keeps Organization directory labels localized in Chinese", () => {
    const zhLocale = JSON.parse(readSrc("locales/zh/data.json")) as {organization: Record<string, string>; ldap: Record<string, string>};

    expect(zhLocale.organization["Account fields"]).toBe("账号资料");
    expect(zhLocale.organization["Attribute"]).toBe("属性");
    expect(zhLocale.organization["Navigation and menu"]).toBe("导航菜单");
    expect(zhLocale.organization["Directory integration"]).toBe("目录服务");
    expect(zhLocale.organization["View rule Public"]).toBe("所有人可见");
    expect(zhLocale.organization["View rule Self"]).toBe("仅本人可见");
    expect(zhLocale.organization["Modify rule Admin"]).toBe("管理员可改");
    expect(zhLocale.organization["Modify rule Immutable"]).toBe("不可修改");
    expect(zhLocale.organization["Multi-factor authentication"]).toBe("多因素认证");
    expect(zhLocale.organization["MFA remember duration"]).toBe("认证记住时长");
    expect(zhLocale.organization["Hours"]).toBe("小时");
    expect(zhLocale.organization["LDAP attributes"]).toBe("LDAP 属性");
    expect(zhLocale.ldap["LDAP servers"]).toBe("LDAP 服务器");
    expect(zhLocale.organization["Kerberos realm"]).toBe("Kerberos 域");
    expect(zhLocale.organization["Kerberos KDC host"]).toBe("Kerberos KDC 主机");
    expect(zhLocale.organization["Kerberos service name"]).toBe("Kerberos 服务名");
    expect(zhLocale.organization["Use permanent avatar"]).toBe("使用永久头像");
    expect(zhLocale.organization["LDAP attributes - Tooltip"]).not.toBe("LDAP attributes - Tooltip");
    expect(zhLocale.organization["Use permanent avatar - Tooltip"]).not.toBe("Use permanent avatar - Tooltip");
  });

  test("keeps Organization brand asset labels natural in Chinese", () => {
    const zhLocale = JSON.parse(readSrc("locales/zh/data.json")) as {general: Record<string, string>};

    expect(zhLocale.general["Favicon"]).toBe("组织图标");
    expect(zhLocale.general["Favicon - Tooltip"]).toContain("Favicon");
    expect(zhLocale.general["Favicon - Tooltip"]).toContain("浏览器标签页");
  });

  test("keeps Application provider tab full-width content out of field row layout", () => {
    const source = readSrc("ApplicationEditPage.tsx");
    const appLess = readSrc("App.less");

    expect(source).toContain("className=\"application-edit-full-width-row\"");
    expect(appLess).toContain(".application-edit-card .application-edit-form-content > .ant-row:not(.application-edit-full-width-row)");
    expect(appLess).not.toContain(".application-edit-card .application-edit-form-content > .ant-row,");
  });

  test("renders Application UI customization tab after switching from providers", () => {
    const page = new ApplicationEditPage({
      match: {params: {organizationName: "engineering", applicationName: "portal"}},
      location: {search: ""},
      history: {push: jest.fn()},
      account: {owner: "engineering", name: "admin"},
    } as any) as any;

    page.state = {
      ...page.state,
      application: {
        owner: "engineering",
        organization: "engineering",
        name: "portal",
        displayName: "Portal",
        category: "Default",
        type: "All",
        isShared: false,
        tags: [],
        providers: [],
        signinMethods: [],
        signinItems: [],
        signupItems: [],
        redirectUris: ["https://example.test/callback"],
        grantTypes: ["authorization_code"],
        customScopes: [],
        tokenAttributes: [],
        samlAttributes: [],
        enableSignUp: true,
        enableSamlPostBinding: false,
        orgChoiceMode: ["None"],
        themeData: {isEnabled: false},
      },
      providers: [],
      organizations: [{name: "engineering"}],
      certs: [],
    };

    page.state.activeMenuKey = "providers";
    expect(() => page.renderApplicationForm()).not.toThrow();
    page.state.activeMenuKey = "ui-customization";
    expect(() => page.renderApplicationForm()).not.toThrow();
  });

  test("uses scoped CSS for desktop labels and mobile wrapping", () => {
    const appLess = readSrc("App.less");

    expect(appLess).toContain(".admin-large-edit-card > .ant-card-body > .ant-row");
    expect(appLess).toContain(".application-edit-card .application-edit-form-content > .ant-row:not(.application-edit-full-width-row)");
    expect(appLess).toContain(".user-edit-card .ant-card-body .ant-form-item-control-input-content > .ant-row");
    expect(appLess).toContain("flex: 0 0 184px;");
    expect(appLess).toContain("max-width: calc(100% - 184px);");
    expect(appLess).toContain("@media screen and (max-width: 768px)");
    expect(appLess).toContain("flex: 0 0 100%;");
  });
});
