import {describe, expect, test} from "vitest";
import fs from "fs";
import path from "path";
import {readLessWithImports} from "./testUtils/less";
import {fileURLToPath} from "url";
const testFileDirectory = path.dirname(fileURLToPath(import.meta.url));

const readSrc = (fileName: string): string => fs.readFileSync(path.join(testFileDirectory, fileName), "utf8") as string;
const readAppLess = (): string => readLessWithImports(path.join(testFileDirectory, "App.less"));

describe("identity object edit form layout", () => {
  const editPages = [
    ["GroupEditPage.tsx", "group-edit-page", "group-edit-card"],
    ["RoleEditPage.tsx", "role-edit-page", "role-edit-card"],
    ["PermissionEditPage.tsx", "permission-edit-page", "permission-edit-card"],
    ["InvitationEditPage.tsx", "invitation-edit-page", "invitation-edit-card"],
    ["FormEditPage.tsx", "form-edit-page", "form-edit-card"],
    ["ModelEditPage.tsx", "model-edit-page", "model-edit-card"],
  ];

  editPages.forEach(([fileName, pageClass, cardClass]) => {
    test(`keeps ${fileName} inside the shared identity object edit layout boundary`, () => {
      const source = readSrc(fileName);

      expect(
        source.includes(`admin-identity-object-edit-page ${pageClass}`) ||
        source.includes(`identity-object-edit-page ${pageClass}`) ||
        source.includes(`admin-large-edit-page ${pageClass}`)
      ).toBe(true);
      expect(
        source.includes(`admin-identity-object-edit-card ${cardClass}`) ||
        source.includes(`identity-object-edit-card ${cardClass}`) ||
        source.includes(`admin-large-edit-card ${cardClass}`) ||
        source.includes(`className="${cardClass}"`)
      ).toBe(true);
      expect(
        source.includes("admin-identity-object-edit-field-row") ||
        source.includes("identity-object-edit-field-row") ||
        source.includes("admin-large-edit-field-row") ||
        source.includes("LargeEditFieldRow")
      ).toBe(true);
    });
  });

  test("uses scoped CSS for identity object labels and mobile wrapping", () => {
    const appLess = readAppLess();

    expect(appLess).toContain(".admin-identity-object-edit-page");
    expect(appLess).toContain(".identity-object-edit-page");
    expect(appLess).toContain(".admin-identity-object-edit-card > .ant-card-body > .admin-identity-object-edit-field-row");
    expect(appLess).toContain(".identity-object-edit-field-row");
    expect(appLess).toContain(".admin-identity-object-edit-card > .ant-card-body > .admin-identity-object-edit-field-row > .ant-col:first-child");
    expect(appLess).toContain("flex: 0 0 184px;");
    expect(appLess).toContain("max-width: calc(100% - 184px);");
    expect(appLess).toContain("@media screen and (max-width: 768px)");
    expect(appLess).toContain("flex: 0 0 100%;");
  });
});
