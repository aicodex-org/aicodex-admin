/* eslint-env jest */
import {expect} from "@jest/globals";
import fs from "fs";
import path from "path";

const readSrc = (fileName: string): string => fs.readFileSync(path.join(__dirname, fileName), "utf8") as string;

describe("access and credential edit page form layout", () => {
  const editPages = [
    ["CertEditPage.tsx", "cert-edit-page"],
    ["KeyEditPage.tsx", "key-edit-page"],
    ["WebhookEditPage.tsx", "webhook-edit-page"],
    ["TokenEditPage.tsx", "token-edit-page"],
    ["LdapEditPage.tsx", "ldap-edit-page"],
    ["AdapterEditPage.tsx", "adapter-edit-page"],
    ["EnforcerEditPage.tsx", "enforcer-edit-page"],
  ];

  editPages.forEach(([fileName, pageClass]) => {
    test(`keeps ${fileName} inside the scoped access edit layout boundary`, () => {
      const source = readSrc(fileName);

      expect(source).toContain(`admin-access-edit-page ${pageClass}`);
      expect(source).toContain("admin-access-edit-card");
      expect(source).toContain("admin-access-edit-field-row");
    });
  });

  test("keeps access edit layout CSS scoped to its own pages", () => {
    const appLess = readSrc("App.less");

    expect(appLess).toContain(".admin-access-edit-page");
    expect(appLess).toContain(".admin-access-edit-card > .ant-card-body > .admin-access-edit-field-row");
    expect(appLess).toContain(".admin-access-edit-card > .ant-card-body > .admin-access-edit-field-row > .ant-col:first-child");
    expect(appLess).toContain(".admin-access-edit-card > .ant-card-body > .admin-access-edit-field-row > .ant-col:first-child + .ant-col");
    expect(appLess).toContain("flex: 0 0 184px;");
    expect(appLess).toContain("max-width: calc(100% - 184px);");
    expect(appLess).toContain("@media screen and (max-width: 768px)");
    expect(appLess).toContain("flex: 0 0 100%;");
  });
});
