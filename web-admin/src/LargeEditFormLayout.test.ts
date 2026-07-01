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
