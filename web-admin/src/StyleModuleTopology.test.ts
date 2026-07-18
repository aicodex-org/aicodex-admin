import {describe, expect, test} from "vitest";
import fs from "fs";
import path from "path";
import {extractLessImports, readLessWithImports} from "./testUtils/less";
import {fileURLToPath} from "url";
const testFileDirectory = path.dirname(fileURLToPath(import.meta.url));

const readStyle = (fileName: string): string => fs.readFileSync(path.join(testFileDirectory, fileName), "utf8") as string;
const readAppLess = (): string => readLessWithImports(path.join(testFileDirectory, "App.less"));

const stripLessCommentsAndStrings = (source: string): string => {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(["'])(?:\\.|(?!\1)[\s\S])*?\1/g, (match) => " ".repeat(match.length));
};

const splitSelectorList = (selectorList: string): string[] => {
  const selectors: string[] = [];
  let currentSelector = "";
  let parenthesisDepth = 0;

  for (const character of selectorList) {
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

const expectStyleRuleForSelector = (source: string, selector: string): void => {
  const css = stripLessCommentsAndStrings(source);
  const selectorPattern = new RegExp("(^|})\\s*([^{}]+?)\\s*\\{", "g");
  const hasRule = Array.from(css.matchAll(selectorPattern)).some((match) => {
    return splitSelectorList(match[2]).some((currentSelector) => currentSelector === selector);
  });

  expect(hasRule).toBe(true);
};

describe("admin style module topology", () => {
  test("keeps App.less as the ordered top-level style entry", () => {
    expect(extractLessImports(readStyle("App.less"))).toEqual([
      "./styles/admin-shell.less",
      "./styles/identity-console-pages.less",
      "./styles/list-pages.less",
      "./styles/large-edit-pages.less",
      "./styles/admin-responsive.less",
      "./styles/login-pages.less",
    ]);
  });

  test("keeps list, edit, and identity style families behind aggregation entries", () => {
    expect(extractLessImports(readStyle("styles/list-pages.less"))).toEqual([
      "./list/common-list-shell.less",
      "./list/organization-user-list-pages.less",
      "./list/application-provider-list-pages.less",
      "./list/query-toolbar.less",
    ]);
    expect(extractLessImports(readStyle("styles/large-edit-pages.less"))).toEqual([
      "./edit/large-edit-common.less",
      "./edit/organization-edit.less",
      "./edit/identity-object-edit.less",
      "./edit/invitation-edit.less",
      "./edit/permission-edit.less",
      "./edit/provider-edit.less",
      "./edit/syncer-edit.less",
      "./edit/group-edit.less",
      "./edit/user-edit.less",
      "./edit/application-access-edit.less",
      "./edit/credential-edit.less",
      "./edit/large-edit-responsive.less",
    ]);
    expect(extractLessImports(readStyle("styles/identity-console-pages.less"))).toEqual([
      "./identity/enterprise-console-overview.less",
      "./identity/server-store-page.less",
      "./identity/enterprise-console-workflows.less",
      "./identity/application-access-credential.less",
      "./identity/audit-governance-access.less",
      "./identity/organization-sync-page.less",
      "./identity/system-info-page.less",
      "./identity/platform-operations-pages.less",
      "./identity/evidence-chain-pages.less",
    ]);
  });

  test("parses supported project Less import syntax variants", () => {
    expect(extractLessImports("@import \"./a.less\";\n@import './b.less';\n@import (reference) \"./c.less\";")).toEqual([
      "./a.less",
      "./b.less",
      "./c.less",
    ]);
  });

  test("expands imported style modules for existing page contracts", () => {
    const appLess = readAppLess();

    expectStyleRuleForSelector(appLess, ".admin-shell-header");
    expectStyleRuleForSelector(appLess, ".enterprise-identity-console");
    expectStyleRuleForSelector(appLess, ".server-store-page");
    expectStyleRuleForSelector(appLess, ".organization-sync-page");
    expectStyleRuleForSelector(appLess, ".system-info-page");
    expectStyleRuleForSelector(appLess, ".enterprise-list-table-frame");
    expectStyleRuleForSelector(appLess, ".admin-large-edit-shell");
    expectStyleRuleForSelector(appLess, ".organization-edit-page");
    expectStyleRuleForSelector(appLess, ".invitation-edit-default-code-control");
    expectStyleRuleForSelector(appLess, ".provider-edit-page");
    expectStyleRuleForSelector(appLess, ".user-edit-page");
    expectStyleRuleForSelector(appLess, ".login-form");
    expectStyleRuleForSelector(appLess, ".loginBackground");
  });
});
