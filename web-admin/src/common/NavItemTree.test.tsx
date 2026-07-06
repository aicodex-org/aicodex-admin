/* eslint-env jest */
import i18next from "i18next";
import {buildEnterpriseNavigationConfigTreeData} from "../enterpriseNavigation";
import {expectEnterprisePrimaryMenuLabels} from "../enterpriseNavigationLabelRules.testUtils";
import en from "../locales/en/data.json";
import zh from "../locales/zh/data.json";
import {NavItemTree} from "./NavItemTree";
type LegacyAny = import("../types/legacyPage").LegacyAny;

declare const expect: LegacyAny;

function getGroup(treeData: LegacyAny, title: string): LegacyAny {
  return treeData[0].children.find((group: LegacyAny) => group.title === title);
}

function leafKeys(group: LegacyAny): string[] {
  return group.children.map((item: LegacyAny) => item.key);
}

async function useTestLanguage(language: string): Promise<void> {
  if (!i18next.isInitialized) {
    await i18next.init({
      lng: language,
      fallbackLng: "en",
      resources: {en, zh},
      ns: Object.keys(en),
      keySeparator: false,
    });
    return;
  }

  i18next.addResourceBundle("en", "general", en.general, true, true);
  i18next.addResourceBundle("zh", "general", zh.general, true, true);
  await i18next.changeLanguage(language);
}

describe("NavItemTree enterprise identity configuration", () => {
  beforeEach(async() => {
    await useTestLanguage("zh");
  });

  test("uses the same enterprise identity information architecture as the runtime sidebar", () => {
    const treeData = buildEnterpriseNavigationConfigTreeData();

    expect(treeData[0].children.map((group: LegacyAny) => group.title)).toEqual([
      "身份总览",
      "组织账号",
      "应用接入",
      "身份来源",
      "权限角色",
      "审计运维",
      "AI 网关",
      "管理工具",
      "商业付款",
    ]);
    expectEnterprisePrimaryMenuLabels(treeData[0].children.map((group: LegacyAny) => group.title));
    expect(treeData[0].children.map((group: LegacyAny) => group.title)).not.toContain("Gateway 投影");
    expect(leafKeys(getGroup(treeData, "身份总览"))).toEqual(["/"]);
    expect(leafKeys(getGroup(treeData, "身份总览"))).not.toContain("/apps");
    expect(leafKeys(getGroup(treeData, "身份总览"))).not.toContain("/shortcuts");
    expect(leafKeys(getGroup(treeData, "身份来源"))).toEqual(
      expect.arrayContaining(["/providers", "/wecom-org-sync", "/feishu-org-sync", "/syncers"])
    );
    expect(leafKeys(getGroup(treeData, "应用接入"))).toEqual(
      expect.arrayContaining(["/applications", "/access-wizard", "/keys", "/platform-api-mappings", "/webhook-events"])
    );
    expect(leafKeys(getGroup(treeData, "权限角色"))).toEqual(
      expect.arrayContaining(["/roles", "/permissions", "/identity-assets", "/models", "/adapters", "/enforcers"])
    );
    expect(leafKeys(getGroup(treeData, "审计运维"))).toEqual([
      "/sessions",
      "/records",
      "/tokens",
      "/verifications",
      "/governance-tasks",
    ]);
    expect(getGroup(treeData, "审计运维").children.map((item: LegacyAny) => item.title)).toEqual([
      "登录会话",
      "操作日志",
      "令牌管理",
      "验证码记录",
      "风险处理",
    ]);
    expect(leafKeys(getGroup(treeData, "AI 网关"))).toEqual([
      "/agents",
      "/servers",
      "/server-store",
      "/entries",
      "/sites",
      "/rules",
    ]);
    expect(getGroup(treeData, "AI 网关").children.map((item: LegacyAny) => item.title)).toEqual([
      "AI Agent 入口",
      "MCP Server",
      "MCP Store",
      "入口配置",
      "站点范围",
      "治理规则",
    ]);
    expect(leafKeys(getGroup(treeData, "管理工具"))).toEqual(
      expect.arrayContaining(["/sysinfo", "/forms", "/tickets", "/swagger"])
    );
  });

  test("passes enterprise navigation tree data through the shared tree wrapper", () => {
    const onCheck = () => undefined;
    const navTree = NavItemTree({
      disabled: true,
      checkedKeys: ["/providers"],
      defaultExpandedKeys: ["all"],
      onCheck,
    });

    expect(navTree.props.disabled).toBe(true);
    expect(navTree.props.checkable).toBe(true);
    expect(navTree.props.checkedKeys).toEqual(["/providers"]);
    expect(navTree.props.defaultExpandedKeys).toEqual(["all"]);
    expect(navTree.props.onCheck).toBe(onCheck);
    expect(getGroup(navTree.props.treeData, "组织账号")).toBeTruthy();
    expect(navTree.props.virtual).toBe(false);
  });

  test("localizes the configuration tree for non-Chinese language modes", async() => {
    await useTestLanguage("en");

    const treeData = buildEnterpriseNavigationConfigTreeData();

    expect(treeData[0].children.map((group: LegacyAny) => group.title)).toEqual([
      "Overview",
      "Organization & Accounts",
      "Application Access",
      "Identity Sources",
      "Permissions & Roles",
      "Audit & Operations",
      "AI Gateway",
      "System Tools",
      "Business & Payments",
    ]);
    expect(treeData[0].children.map((group: LegacyAny) => group.title)).not.toContain("Gateway Projection");
    expect(leafKeys(getGroup(treeData, "Overview"))).toEqual(["/"]);
    expect(leafKeys(getGroup(treeData, "Overview"))).not.toContain("/apps");
    expect(leafKeys(getGroup(treeData, "Overview"))).not.toContain("/shortcuts");
    expect(leafKeys(getGroup(treeData, "Identity Sources"))).toEqual(
      expect.arrayContaining(["/providers", "/wecom-org-sync", "/feishu-org-sync", "/syncers"])
    );
    expect(leafKeys(getGroup(treeData, "Application Access"))).toEqual(
      expect.arrayContaining(["/applications", "/access-wizard", "/platform-api-mappings"])
    );
    expect(leafKeys(getGroup(treeData, "Permissions & Roles"))).toEqual(
      expect.arrayContaining(["/roles", "/permissions", "/identity-assets"])
    );
    expect(leafKeys(getGroup(treeData, "Audit & Operations"))).toEqual([
      "/sessions",
      "/records",
      "/tokens",
      "/verifications",
      "/governance-tasks",
    ]);
    expect(getGroup(treeData, "Audit & Operations").children.map((item: LegacyAny) => item.title)).toEqual([
      "Login Sessions",
      "Operation Logs",
      "Token Management",
      "Verification Code Records",
      "Risk Actions",
    ]);
  });
});
