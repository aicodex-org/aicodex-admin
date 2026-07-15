/* eslint-env jest */
import {expect, jest} from "@jest/globals";
import fs from "fs";
import path from "path";
import {readLessWithImports} from "./testUtils/less";

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
const readAppLess = (): string => readLessWithImports(path.join(__dirname, "App.less"));
const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const splitSelectorList = (selector: string): string[] => {
  const selectors: string[] = [];
  let currentSelector = "";
  let parenthesisDepth = 0;

  for (const character of selector) {
    if (character === "(") {
      parenthesisDepth += 1;
    } else if (character === ")") {
      parenthesisDepth = Math.max(0, parenthesisDepth - 1);
    }

    if (character === "," && parenthesisDepth === 0) {
      selectors.push(currentSelector.replace(/\s+/g, " ").trim());
      currentSelector = "";
      continue;
    }

    currentSelector += character;
  }

  selectors.push(currentSelector.replace(/\s+/g, " ").trim());

  return selectors.filter(Boolean);
};

const expectCssRuleContains = (css: string, selector: string, declaration: string): void => {
  splitSelectorList(selector).forEach((currentSelector) => {
    expect(css).toMatch(new RegExp(`${escapeRegExp(currentSelector)}[^{}]*\\{[^{}]*${escapeRegExp(declaration)}`));
  });
};
const expectCssRuleUsesMixin = (css: string, selector: string, mixin: string): void => {
  expectCssRuleContains(css, selector, `${mixin};`);
};

describe("large edit page form layout", () => {
  const editPages = [
    ["OrganizationEditPage.tsx", "organization-edit-page", "organization-edit-card"],
    ["UserEditPage.tsx", "user-edit-page", "user-edit-card"],
    ["ApplicationEditPage.tsx", "application-edit-page", "application-edit-card"],
    ["ProviderEditPage.tsx", "provider-edit-page", "provider-edit-card"],
    ["SyncerEditPage.tsx", "syncer-edit-page", "syncer-edit-card"],
    ["CertEditPage.tsx", "cert-edit-page", "cert-edit-card"],
    ["KeyEditPage.tsx", "key-edit-page", "key-edit-card"],
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

    expect(source).toContain("className=\"admin-large-edit-form-content application-edit-form-content\"");
    expect(source).toContain("className=\"admin-large-edit-card application-edit-card\"");
  });

  test("keeps shared credential shell labels localized", () => {
    const zhLocale = JSON.parse(readSrc("locales/zh/data.json")) as {general: Record<string, string>; key: Record<string, string>};
    const enLocale = JSON.parse(readSrc("locales/en/data.json")) as {general: Record<string, string>; key: Record<string, string>};

    expect(zhLocale.general["Basic information"]).toBe("基础信息");
    expect(zhLocale.general["Save and return"]).toBe("保存并返回");
    expect(enLocale.general["Basic information"]).toBe("Basic information");
    expect(enLocale.general["Save and return"]).toBe("Save and return");
    expect(zhLocale.key["Access key"]).toBe("访问密钥 ID");
    expect(zhLocale.key["Access key - Tooltip"]).not.toBe("Access key - Tooltip");
    expect(zhLocale.key["Access secret"]).toBe("访问密钥 Secret");
    expect(enLocale.key["Access secret - Tooltip"]).not.toBe("Access secret - Tooltip");
  });

  test("keeps credential tooltips limited to actionable page-specific guidance", () => {
    const keySource = readSrc("KeyEditPage.tsx");
    const certSource = readSrc("CertEditPage.tsx");
    const zhLocale = JSON.parse(readSrc("locales/zh/data.json")) as {cert: Record<string, string>; key: Record<string, string>};
    const enLocale = JSON.parse(readSrc("locales/en/data.json")) as {cert: Record<string, string>; key: Record<string, string>};

    [
      "general:Organization - Tooltip",
      "general:Display name - Tooltip",
      "general:Application - Tooltip",
      "general:User - Tooltip",
      "general:Expire time - Tooltip",
      "general:State - Tooltip",
    ].forEach(tooltipKey => expect(keySource).not.toContain(tooltipKey));
    expect(keySource).not.toContain("general:Name - Tooltip");
    expect(keySource).not.toContain("general:Type - Tooltip");
    expect(keySource).toContain("key:Name - Tooltip");
    expect(keySource).toContain("key:Type - Tooltip");

    expect(certSource).not.toContain("general:Organization - Tooltip");
    expect(certSource).not.toContain("general:Display name - Tooltip");
    expect(certSource).not.toContain("general:Name - Tooltip");
    expect(certSource).not.toContain("general:Type - Tooltip");
    expect(certSource).not.toContain("provider:Scope - Tooltip");
    expect(certSource).toContain("cert:Name - Tooltip");
    expect(certSource).toContain("cert:Type - Tooltip");
    expect(certSource).toContain("cert:Scope - Tooltip");

    [zhLocale.key, enLocale.key].forEach(locale => {
      expect(locale["Name - Tooltip"]).not.toMatch(/Name - Tooltip/);
      expect(locale["Type - Tooltip"]).not.toMatch(/Type - Tooltip/);
    });
    [zhLocale.cert, enLocale.cert].forEach(locale => {
      expect(locale["Name - Tooltip"]).not.toMatch(/Name - Tooltip/);
      expect(locale["Type - Tooltip"]).not.toMatch(/Type - Tooltip/);
      expect(locale["Scope - Tooltip"]).not.toMatch(/Scope - Tooltip/);
    });
  });

  test("keeps certificate material editors aligned to their equal grid tracks", () => {
    const appLess = readAppLess();
    const materialGridStart = appLess.indexOf(".cert-edit-page .admin-large-edit-card .admin-large-edit-form-content {");
    const materialGridEnd = appLess.indexOf(".cert-edit-page .admin-access-edit-editor-grid-row > .ant-col:nth-child(1),", materialGridStart);
    const materialGridRule = appLess.slice(materialGridStart, materialGridEnd);

    expect(materialGridRule).toContain(".admin-access-edit-editor-grid-row > .ant-col:nth-child(2)");
    expect(materialGridRule).toContain(".admin-access-edit-editor-grid-row > .ant-col:nth-child(5)");
    expect(materialGridRule).toContain("flex: none");
    expect(materialGridRule).toContain("width: 100%");
    expect(materialGridRule).toContain("max-width: 100%");

    const firstEditorOverrideStart = appLess.indexOf(
      "> .admin-access-edit-editor-grid-row:not(.admin-large-edit-full-width-row) > .ant-col:first-child + .ant-col {",
      materialGridStart
    );
    const firstEditorOverride = appLess.slice(firstEditorOverrideStart, appLess.indexOf("\n  }", firstEditorOverrideStart));

    expect(firstEditorOverrideStart).toBeGreaterThanOrEqual(0);
    expect(firstEditorOverride).toContain("flex: none");
    expect(firstEditorOverride).toContain("width: 100%");
    expect(firstEditorOverride).toContain("max-width: 100%");
  });

  test("keeps Application edit shell aligned with other multi-tab edit pages", () => {
    const source = readSrc("ApplicationEditPage.tsx");

    expect(source).toContain("import LargeEditShell, {LargeEditTabs} from \"./common/LargeEditShell\";");
    expect(source).toContain("classPrefix=\"application-edit\"");
    expect(source).toContain("<LargeEditTabs");
    expect(source).toContain("tabs={this.renderEditTabs()}");
    expect(source).toContain("actions={this.renderEditFooter()}");
    expect(source).not.toContain("title={\n        <div>\n          {this.state.mode === \"add\" ? i18next.t(\"application:New Application\") : i18next.t(\"application:Edit Application\")}");
  });

  test("keeps Organization edit tabs shell separated from tab business content", () => {
    const source = readSrc("OrganizationEditPage.tsx");
    const shellSource = readSrc("common/LargeEditShell.tsx");
    const appLess = readAppLess();

    expect(source).toContain("classPrefix=\"organization-edit\"");
    expect(source).toContain("className=\"organization-edit-tabs\"");
    expect(source).toContain("tabs={this.renderEditTabs()}");
    expect(source).toContain("actions={this.renderEditFooter()}");
    expect(shellSource).toContain("\"admin-large-edit-shell\", `${classPrefix}-shell`");
    expect(shellSource).toContain("\"admin-large-edit-scroll-content\", `${classPrefix}-scroll-content`");
    expect(shellSource).toContain("\"admin-large-edit-action-bar\", `${classPrefix}-action-bar`");
    expect(appLess).toContain(".admin-large-edit-field-grid-base(@columns: repeat(2, minmax(320px, 1fr)); @max-width: 1060px; @margin-bottom: 28px)");
    expect(appLess).toContain("@media screen and (max-width: 1024px)");
    expect(appLess).toContain("overflow-x: hidden;");
  });

  test("keeps Organization edit shell compatible with dark admin shell theme tokens", () => {
    const appLess = readAppLess();
    const largeEditCss = appLess.slice(
      appLess.indexOf(".admin-large-edit-page"),
      appLess.indexOf(".admin-shell-route-scroll-without-card:has(> .organization-edit-page)")
    );
    const organizationEditCss = appLess.slice(
      appLess.indexOf(".organization-edit-page {"),
      appLess.indexOf(".admin-gateway-edit-page")
    );

    expect(largeEditCss).toContain("background: var(--admin-shell-surface-bg, #fff);");
    expect(largeEditCss).toContain("flex: 0 0 42px;");
    expect(organizationEditCss).toContain("padding: 8px 0 7px;");
    expect(largeEditCss).toContain("flex: 0 0 54px;");
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
    const source = readSrc("ApplicationEditForm.tsx");
    const appLess = readAppLess();

    expect(source).toContain("admin-large-edit-full-width-row application-edit-full-width-row");
    expect(appLess).toContain(".admin-large-edit-card .admin-large-edit-form-content > .ant-row:not(.admin-large-edit-full-width-row)");
    expect(appLess).not.toContain(".application-edit-card .application-edit-form-content > .ant-row,");
  });

  test("keeps shared tab content primitives available to Application edit", () => {
    const source = `${readSrc("ApplicationEditPage.tsx")}\n${readSrc("ApplicationEditForm.tsx")}`;
    const appLess = readAppLess();

    expect(source).toContain("admin-large-edit-content-section-title application-edit-section-title");
    expect(source).toContain("admin-large-edit-required-label application-edit-required-label");
    expect(source).toContain("admin-large-edit-field-error application-edit-field-error");
    expect(source).toContain("renderApplicationAssetField");
    expect(source).toContain("application-edit-asset-row");
    expect(source).toContain("application-edit-asset-preview");
    expect(readSrc("table/SigninMethodTable.tsx")).toContain("application-edit-ui-table-control application-edit-ui-table-signin-method");
    expect(readSrc("table/SigninTable.tsx")).toContain("application-edit-ui-table-control application-edit-ui-table-signin-items");
    expect(appLess).toContain(".admin-large-edit-content-section-title");
    expect(appLess).toContain(".admin-large-edit-form-content .ant-table-title");
    expect(appLess).toContain(".admin-large-edit-form-content .ant-btn-sm");
    expect(appLess).toContain(".application-edit-page .application-edit-asset-control");
    expect(appLess).toContain(".application-edit-page .application-edit-asset-preview");
    expect(appLess).toContain(".application-edit-page .application-edit-ui-table-control");
    expect(appLess).toContain("margin-left: clamp(0px, calc(100% - var(--application-edit-ui-table-max-width)), var(--application-edit-label-width));");
    expect(appLess).toContain("--application-edit-ui-table-max-width: 1221px;");
    expect(appLess).toContain("color: var(--admin-shell-text-primary, #333542);");
    expect(appLess).not.toContain(".application-edit-page .application-edit-resource-detail-label");
    expect(appLess).not.toContain(".application-edit-page .application-edit-form-content .ant-table-title");
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
    const appLess = readAppLess();

    expect(appLess).toContain(".admin-large-edit-card > .ant-card-body > .ant-row");
    expect(appLess).toContain(".admin-large-edit-card .admin-large-edit-form-content > .ant-row:not(.admin-large-edit-full-width-row)");
    expect(appLess).toContain(".user-edit-page .user-edit-form-item .ant-form-item-control-input-content > .ant-row");
    expect(appLess).toContain(".user-edit-section-password-authentication .user-edit-section-body");
    expect(appLess).toContain("flex: 0 0 184px;");
    expect(appLess).toContain("max-width: calc(100% - 184px);");
    expect(appLess).toContain("@media screen and (max-width: 768px)");
    expect(appLess).toContain("flex: 0 0 100%;");
  });

  test("keeps migrated edit page field labels on the shared label color token", () => {
    const appLess = readAppLess();
    const labelColorDeclaration = "color: var(--admin-large-edit-label-color);";

    expect(appLess).toContain("--admin-large-edit-label-color: var(--admin-shell-text-primary, #333542);");
    expectCssRuleContains(appLess, ".admin-large-edit-field-label-base()", labelColorDeclaration);
    expectCssRuleContains(appLess, ".admin-large-edit-switch-label-base()", labelColorDeclaration);
    expectCssRuleContains(appLess, ".admin-large-edit-legacy-row-label-base()", labelColorDeclaration);
    expectCssRuleUsesMixin(appLess, ".admin-large-edit-field-label", ".admin-large-edit-field-label-base()");
    expectCssRuleUsesMixin(
      appLess,
      ".admin-large-edit-card .admin-large-edit-form-content > .ant-row:not(.admin-large-edit-full-width-row) > .ant-col:first-child",
      ".admin-large-edit-legacy-row-label-base()"
    );
    expectCssRuleUsesMixin(appLess, ".organization-edit-switch-label", ".admin-large-edit-switch-label-base()");
    expectCssRuleUsesMixin(appLess, ".organization-edit-field-label,\n.organization-edit-full-width-label", ".admin-large-edit-field-label-base()");
    expectCssRuleUsesMixin(appLess, ".identity-object-edit-field-label", ".admin-large-edit-field-label-base()");
    expectCssRuleUsesMixin(appLess, ".group-edit-field-label", ".admin-large-edit-field-label-base()");
    expectCssRuleContains(
      appLess,
      ".user-edit-page .user-edit-form-item .ant-form-item-control-input-content > .ant-row > .ant-col:first-child",
      labelColorDeclaration
    );
    expectCssRuleContains(appLess, ".user-edit-page .user-edit-form-item-address .user-edit-address-line-label", labelColorDeclaration);
    expectCssRuleUsesMixin(appLess, ".application-edit-page .application-edit-preview-row > .ant-col:first-child", ".admin-large-edit-legacy-row-label-base()");
    expectCssRuleUsesMixin(
      appLess,
      ".admin-gateway-edit-card > .ant-card-body > .admin-gateway-edit-field-row > .ant-col:first-child,\n.admin-identity-object-edit-card > .ant-card-body > .admin-identity-object-edit-field-row > .ant-col:first-child",
      ".admin-large-edit-legacy-row-label-base()"
    );
  });

  test("keeps repeated edit page form primitives on shared Less mixins", () => {
    const appLess = readAppLess();

    expectCssRuleUsesMixin(appLess, ".admin-large-edit-field-grid", ".admin-large-edit-field-grid-base()");
    expectCssRuleUsesMixin(appLess, ".organization-edit-field-grid", ".admin-large-edit-field-grid-base()");
    expectCssRuleUsesMixin(appLess, ".identity-object-edit-field-grid", ".admin-large-edit-field-grid-base()");
    expectCssRuleUsesMixin(appLess, ".group-edit-field-grid", ".admin-large-edit-field-grid-base(repeat(2, minmax(280px, 420px)); 900px; 0)");
    expectCssRuleUsesMixin(appLess, ".admin-large-edit-field-row", ".admin-large-edit-field-row-base(var(--admin-large-edit-label-width, 160px))");
    expectCssRuleUsesMixin(appLess, ".organization-edit-field-row,\n.organization-edit-asset-row", ".admin-large-edit-field-row-base(var(--organization-edit-label-width))");
    expectCssRuleUsesMixin(appLess, ".identity-object-edit-field-row", ".admin-large-edit-field-row-base(var(--identity-object-edit-label-width))");
    expectCssRuleUsesMixin(appLess, ".group-edit-field-row", ".admin-large-edit-field-row-base(var(--group-edit-label-width))");
    expectCssRuleUsesMixin(appLess, ".admin-large-edit-field-row-wide", ".admin-large-edit-field-row-wide-base()");
    expectCssRuleUsesMixin(appLess, ".organization-edit-field-row-wide", ".admin-large-edit-field-row-wide-base()");
    expectCssRuleUsesMixin(appLess, ".identity-object-edit-field-row-wide", ".admin-large-edit-field-row-wide-base()");
    expectCssRuleUsesMixin(appLess, ".group-edit-field-row-wide,\n.group-edit-directory-alert", ".admin-large-edit-field-row-wide-base()");
    expectCssRuleUsesMixin(appLess, ".organization-edit-page", ".admin-large-edit-page-root-base()");
    expectCssRuleUsesMixin(appLess, ".identity-object-edit-page", ".admin-large-edit-page-root-base()");
    expectCssRuleUsesMixin(appLess, ".permission-edit-page", ".admin-large-edit-page-root-base()");
    expectCssRuleUsesMixin(appLess, ".group-edit-page", ".admin-large-edit-page-root-base()");
    expectCssRuleUsesMixin(appLess, ".user-edit-page", ".admin-large-edit-page-root-base()");
    expectCssRuleUsesMixin(appLess, ".application-edit-page", ".admin-large-edit-page-root-base()");
    expectCssRuleUsesMixin(appLess, ".syncer-edit-page", ".admin-large-edit-page-root-base()");
    expectCssRuleUsesMixin(appLess, ".cert-edit-page,\n.key-edit-page", ".admin-large-edit-page-root-base()");
    expectCssRuleUsesMixin(appLess, ".organization-edit-card", ".admin-large-edit-card-base()");
    expectCssRuleUsesMixin(appLess, ".identity-object-edit-card", ".admin-large-edit-card-base()");
    expectCssRuleUsesMixin(appLess, ".permission-edit-card", ".admin-large-edit-card-base()");
    expectCssRuleUsesMixin(appLess, ".group-edit-card", ".admin-large-edit-card-base()");
    expectCssRuleUsesMixin(appLess, ".user-edit-card-wrap", ".admin-large-edit-card-frame-base()");
    expectCssRuleUsesMixin(appLess, ".user-edit-card", ".admin-large-edit-card-base()");
    expectCssRuleUsesMixin(appLess, ".application-edit-card", ".admin-large-edit-card-base()");
    expectCssRuleUsesMixin(appLess, ".syncer-edit-card", ".admin-large-edit-card-base()");
    expectCssRuleUsesMixin(appLess, ".cert-edit-card,\n.key-edit-card", ".admin-large-edit-card-base()");
    expectCssRuleUsesMixin(appLess, ".organization-edit-card > .ant-card-body", ".admin-large-edit-card-body-base()");
    expectCssRuleUsesMixin(appLess, ".identity-object-edit-card > .ant-card-body", ".admin-large-edit-card-body-base()");
    expectCssRuleUsesMixin(appLess, ".permission-edit-card > .ant-card-body", ".admin-large-edit-card-body-base()");
    expectCssRuleUsesMixin(appLess, ".group-edit-card > .ant-card-body", ".admin-large-edit-card-body-base()");
    expectCssRuleUsesMixin(appLess, ".user-edit-card > .ant-card-body", ".admin-large-edit-card-body-base()");
    expectCssRuleUsesMixin(appLess, ".application-edit-card > .ant-card-body", ".admin-large-edit-card-body-base()");
    expectCssRuleUsesMixin(appLess, ".syncer-edit-card > .ant-card-body", ".admin-large-edit-card-body-base()");
    expectCssRuleUsesMixin(
      appLess,
      ".cert-edit-card > .ant-card-body,\n.key-edit-card > .ant-card-body",
      ".admin-large-edit-card-body-base()"
    );
    const mobilePageMixinCount = (appLess.match(/\.admin-large-edit-mobile-page-base\(\);/g) ?? []).length;
    const mobileCardMixinCount = (appLess.match(/\.admin-large-edit-mobile-card-base\(\);/g) ?? []).length;
    expect(mobilePageMixinCount).toBe(mobileCardMixinCount);
    expect(mobilePageMixinCount).toBeGreaterThanOrEqual(7);
    expectCssRuleUsesMixin(
      appLess,
      "body.admin-shell-theme-dark .identity-object-edit-page .ant-input,\nbody.admin-shell-theme-dark .identity-object-edit-page .ant-select .ant-select-selector",
      ".admin-large-edit-dark-control-base()"
    );
    expectCssRuleUsesMixin(
      appLess,
      "body.admin-shell-theme-dark .permission-edit-page .ant-input:hover,\nbody.admin-shell-theme-dark .permission-edit-page .ant-input:focus,\nbody.admin-shell-theme-dark .permission-edit-page .ant-select:hover .ant-select-selector,\nbody.admin-shell-theme-dark .permission-edit-page .ant-select-focused .ant-select-selector,\nbody.admin-shell-theme-dark .permission-edit-page .ant-select-open .ant-select-selector",
      ".admin-large-edit-dark-control-focus-base()"
    );
    expectCssRuleUsesMixin(
      appLess,
      "body.admin-shell-theme-dark .group-edit-page .ant-input[disabled],\nbody.admin-shell-theme-dark .group-edit-page .ant-select-disabled .ant-select-selector",
      ".admin-large-edit-dark-control-disabled-base()"
    );
    expectCssRuleUsesMixin(
      appLess,
      "body.admin-shell-theme-dark .organization-edit-page .ant-input-affix-wrapper .ant-input,\nbody.admin-shell-theme-dark .organization-edit-page .ant-input-number-input",
      ".admin-large-edit-dark-transparent-control-base()"
    );
    expectCssRuleUsesMixin(
      appLess,
      "body.admin-shell-theme-dark .user-edit-page .ant-select-selection-item,\nbody.admin-shell-theme-dark .user-edit-page .ant-select-arrow,\nbody.admin-shell-theme-dark .user-edit-page .ant-input-number-input",
      ".admin-large-edit-dark-control-text-base()"
    );
    expectCssRuleUsesMixin(
      appLess,
      "body.admin-shell-theme-dark .admin-large-edit-page .admin-large-edit-form-content .ant-input,\nbody.admin-shell-theme-dark .admin-large-edit-page .admin-large-edit-form-content .ant-input-affix-wrapper,\nbody.admin-shell-theme-dark .admin-large-edit-page .admin-large-edit-form-content .ant-input-number,\nbody.admin-shell-theme-dark .admin-large-edit-page .admin-large-edit-form-content .ant-select .ant-select-selector,\nbody.admin-shell-theme-dark .admin-large-edit-page .admin-large-edit-form-content textarea.ant-input",
      ".admin-large-edit-dark-control-base()"
    );
    expectCssRuleUsesMixin(
      appLess,
      "body.admin-shell-theme-dark .admin-large-edit-page .admin-large-edit-form-content .ant-input-affix-wrapper .ant-input,\nbody.admin-shell-theme-dark .admin-large-edit-page .admin-large-edit-form-content .ant-input-number-input",
      ".admin-large-edit-dark-transparent-control-base()"
    );
    expectCssRuleUsesMixin(
      appLess,
      "body.admin-shell-theme-dark .admin-large-edit-page .admin-large-edit-form-content .ant-input[disabled],\nbody.admin-shell-theme-dark .admin-large-edit-page .admin-large-edit-form-content .ant-input-disabled,\nbody.admin-shell-theme-dark .admin-large-edit-page .admin-large-edit-form-content .ant-input-number-disabled,\nbody.admin-shell-theme-dark .admin-large-edit-page .admin-large-edit-form-content .ant-select-disabled .ant-select-selector",
      ".admin-large-edit-dark-control-disabled-base()"
    );
    expectCssRuleUsesMixin(
      appLess,
      "body.admin-shell-theme-dark .admin-large-edit-page .admin-large-edit-form-content .ant-table-wrapper,\nbody.admin-shell-theme-dark .admin-large-edit-page .admin-large-edit-form-content .ant-table,\nbody.admin-shell-theme-dark .admin-large-edit-page .admin-large-edit-form-content .ant-table-container,\nbody.admin-shell-theme-dark .admin-large-edit-page .admin-large-edit-form-content .ant-table-content,\nbody.admin-shell-theme-dark .admin-large-edit-page .admin-large-edit-form-content .ant-table-header,\nbody.admin-shell-theme-dark .admin-large-edit-page .admin-large-edit-form-content .ant-table-body",
      ".admin-large-edit-dark-table-surface-base()"
    );
    expectCssRuleUsesMixin(
      appLess,
      "body.admin-shell-theme-dark .admin-large-edit-page .admin-large-edit-form-content .ant-table-thead > tr > th",
      ".admin-large-edit-dark-table-header-cell-base()"
    );
    expectCssRuleUsesMixin(
      appLess,
      "body.admin-shell-theme-dark .admin-large-edit-page .admin-large-edit-form-content .ant-table-tbody > tr > td",
      ".admin-large-edit-dark-table-body-cell-base()"
    );
    expectCssRuleUsesMixin(appLess, "body.admin-shell-theme-dark .user-edit-page .ant-table-thead > tr > th", ".admin-large-edit-dark-table-header-cell-base()");
    expectCssRuleUsesMixin(
      appLess,
      "body.admin-shell-theme-dark .organization-edit-page .ant-table-thead > tr > th,\nbody.admin-shell-theme-dark .organization-edit-page .ant-table.ant-table-small .ant-table-thead > tr > th,\nbody.admin-shell-theme-dark .organization-edit-page .ant-table.ant-table-middle .ant-table-thead > tr > th",
      ".admin-large-edit-dark-table-header-cell-base()"
    );
    expectCssRuleUsesMixin(appLess, "body.admin-shell-theme-dark .identity-object-edit-card", ".admin-large-edit-dark-card-base()");
    expectCssRuleUsesMixin(appLess, ".admin-large-edit-section-title", ".admin-large-edit-section-title-base()");
    expectCssRuleUsesMixin(appLess, ".organization-edit-section-title", ".admin-large-edit-section-title-base()");
    expectCssRuleUsesMixin(appLess, ".identity-object-edit-section-title", ".admin-large-edit-section-title-base()");
    expectCssRuleUsesMixin(appLess, ".group-edit-section-title", ".admin-large-edit-section-title-base()");
    expectCssRuleUsesMixin(appLess, ".user-edit-section-title", ".admin-large-edit-section-title-base()");
    expectCssRuleUsesMixin(appLess, ".admin-large-edit-field-error", ".admin-large-edit-field-error-base()");
    expectCssRuleUsesMixin(appLess, ".organization-edit-field-error", ".admin-large-edit-field-error-base()");
    expectCssRuleUsesMixin(appLess, ".identity-object-edit-field-error", ".admin-large-edit-field-error-base()");
    expectCssRuleUsesMixin(appLess, ".group-edit-field-error", ".admin-large-edit-field-error-base()");
    expectCssRuleUsesMixin(appLess, ".admin-large-edit-form-content .ant-btn-sm", ".admin-large-edit-inline-action-button-base()");
    expectCssRuleUsesMixin(appLess, ".admin-large-edit-form-content .organization-config-table-toolbar", ".admin-large-edit-table-toolbar-base()");
    expectCssRuleUsesMixin(appLess, ".admin-large-edit-form-content .organization-config-table-title", ".admin-large-edit-table-title-text-base()");
    expectCssRuleUsesMixin(appLess, ".admin-large-edit-form-content .organization-config-table-toolbar .ant-btn-sm", ".admin-large-edit-table-toolbar-action-button-base()");
    expectCssRuleUsesMixin(
      appLess,
      ".organization-edit-page .organization-config-table-toolbar,\n.organization-edit-page .ldap-table-toolbar",
      ".admin-large-edit-table-toolbar-base()"
    );
    expectCssRuleUsesMixin(
      appLess,
      ".user-edit-page .user-edit-table-toolbar,\n.user-edit-page .organization-config-table-toolbar",
      ".admin-large-edit-table-toolbar-base()"
    );
    expectCssRuleUsesMixin(
      appLess,
      ".organization-edit-page .organization-config-table-title,\n.organization-edit-page .ldap-table-title",
      ".admin-large-edit-table-title-text-base()"
    );
    expectCssRuleUsesMixin(
      appLess,
      ".user-edit-page .user-edit-table-title,\n.user-edit-page .organization-config-table-title",
      ".admin-large-edit-table-title-text-base()"
    );
    expectCssRuleUsesMixin(appLess, ".organization-edit-page .organization-config-table-title-help-icon", ".admin-large-edit-help-icon-base()");
    expectCssRuleUsesMixin(
      appLess,
      ".user-edit-page .user-edit-account-item-label-help-icon,\n.user-edit-page .organization-config-table-title-help-icon",
      ".admin-large-edit-help-icon-base()"
    );
    expectCssRuleUsesMixin(
      appLess,
      ".organization-edit-page .organization-config-table-title-help-icon:focus-visible,\n.organization-edit-page .organization-config-table-add-trigger:focus-visible,\n.organization-edit-page .organization-config-table-action-trigger:focus-visible",
      ".admin-large-edit-focus-ring-base()"
    );
    expectCssRuleUsesMixin(
      appLess,
      ".organization-edit-page .organization-config-table-toolbar .ant-btn-sm,\n.organization-edit-page .ldap-table-toolbar .ant-btn-sm",
      ".admin-large-edit-table-toolbar-action-button-base()"
    );
    expectCssRuleUsesMixin(
      appLess,
      ".user-edit-page .user-edit-table-toolbar .ant-btn-sm,\n.user-edit-page .organization-config-table-toolbar .ant-btn-sm",
      ".admin-large-edit-table-toolbar-action-button-base()"
    );
    expectCssRuleUsesMixin(
      appLess,
      ".organization-edit-page .organization-config-table-row-actions,\n.organization-edit-page .ldap-table-row-actions",
      ".admin-large-edit-row-actions-base()"
    );
    expectCssRuleUsesMixin(appLess, ".user-edit-page .organization-config-table-row-actions", ".admin-large-edit-row-actions-base()");
    expectCssRuleUsesMixin(
      appLess,
      ".organization-edit-page .organization-config-table-row-actions .ant-btn-sm,\n.organization-edit-page .ldap-table-row-actions .ant-btn-sm",
      ".admin-large-edit-inline-action-button-base()"
    );
    expectCssRuleUsesMixin(appLess, ".user-edit-page .organization-config-table-row-actions .ant-btn-sm", ".admin-large-edit-inline-action-button-base()");
    expectCssRuleUsesMixin(appLess, ".organization-edit-page .organization-config-table-row-actions-icons .ant-btn-sm", ".admin-large-edit-icon-action-button-base()");
    expectCssRuleUsesMixin(appLess, ".user-edit-page .organization-config-table-row-actions-icons .ant-btn-sm", ".admin-large-edit-icon-action-button-base()");
  });

  test("keeps migrated edit pages on the shared no-card route container contract", () => {
    const appLess = readAppLess();

    expectCssRuleContains(
      appLess,
      ".admin-shell-route-scroll-without-card:has(> .organization-edit-page),\n.admin-shell-route-scroll-without-card:has(> .identity-object-edit-page),\n.admin-shell-route-scroll-without-card:has(> .permission-edit-page),\n.admin-shell-route-scroll-without-card:has(> .group-edit-page),\n.admin-shell-route-scroll-without-card:has(> .user-edit-page),\n.admin-shell-route-scroll-without-card:has(> .application-edit-page)",
      "padding: 0;"
    );
    expectCssRuleContains(
      appLess,
      ".admin-shell-route-scroll-without-card > .organization-edit-page,\n.admin-shell-route-scroll-without-card > .identity-object-edit-page,\n.admin-shell-route-scroll-without-card > .permission-edit-page,\n.admin-shell-route-scroll-without-card > .group-edit-page,\n.admin-shell-route-scroll-without-card > .user-edit-page,\n.admin-shell-route-scroll-without-card > .application-edit-page",
      "flex: 1 1 auto;"
    );

    expect(appLess).toContain(".admin-shell-route-scroll-without-card:has(> .cert-edit-page)");
    expect(appLess).toContain(".admin-shell-route-scroll-without-card:has(> .key-edit-page)");
    expect(appLess).toContain(".admin-shell-route-scroll-without-card > .cert-edit-page");
    expect(appLess).toContain(".admin-shell-route-scroll-without-card > .key-edit-page");
  });
});
