/* eslint-env jest */
import {expect} from "@jest/globals";
import fs from "fs";
import path from "path";

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

  test("uses scoped CSS for desktop labels and mobile wrapping", () => {
    const appLess = readSrc("App.less");

    expect(appLess).toContain(".admin-large-edit-card > .ant-card-body > .ant-row");
    expect(appLess).toContain(".application-edit-card .application-edit-form-content > .ant-row");
    expect(appLess).toContain(".user-edit-card .ant-card-body .ant-form-item-control-input-content > .ant-row");
    expect(appLess).toContain("flex: 0 0 184px;");
    expect(appLess).toContain("max-width: calc(100% - 184px);");
    expect(appLess).toContain("@media screen and (max-width: 768px)");
    expect(appLess).toContain("flex: 0 0 100%;");
  });
});
