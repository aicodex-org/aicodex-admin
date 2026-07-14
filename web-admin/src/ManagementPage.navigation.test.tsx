/* eslint-env jest */
import {beforeEach, describe, expect, test} from "@jest/globals";
import i18next from "i18next";
import {
  buildEnterpriseNavigationConfigTreeData,
  buildEnterpriseNavigationGroups,
  findNavigationSelection,
  shouldRenderNavigationGroupAsSingleLeaf
} from "./enterpriseNavigation";
import {buildWorkspaceRouteItems, openWorkspaceTab} from "./common/workspaceTabState";
import {expectEnterprisePrimaryMenuLabels} from "./enterpriseNavigationLabelRules.testUtils";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";
import type {LegacyAny} from "./types/legacyPage";

interface TestNavigationNodeList extends Array<TestNavigationNode> {
  find(
    predicate: (value: TestNavigationNode, index: number, obj: TestNavigationNode[]) => unknown,
    thisArg?: LegacyAny
  ): TestNavigationNode;
}

interface TestNavigationNode {
  key: string;
  label: LegacyAny;
  title: LegacyAny;
  icon: LegacyAny;
  to?: string;
  href?: string;
  external?: boolean;
  visible?: boolean;
  matchPrefixes: string[];
  matcher?: (uri: string) => boolean;
  children: TestNavigationNodeList;
  [key: string]: LegacyAny;
}

function getTestNavigationGroups(options: LegacyAny): TestNavigationNodeList {
  return buildEnterpriseNavigationGroups(options) as TestNavigationNodeList;
}

function getTestNavigationTree(): TestNavigationNodeList {
  return buildEnterpriseNavigationConfigTreeData() as TestNavigationNodeList;
}

function getNavigationIconName(icon: LegacyAny): string | undefined {
  return icon?.type?.displayName;
}

const localAdminAccount = {
  owner: "built-in",
  isAdmin: true,
  organization: {
    navItems: ["all"],
    userNavItems: [],
  },
};

const nonLocalAdminAccount = {
  owner: "demo",
  isAdmin: false,
  organization: {
    navItems: [],
    userNavItems: ["all"],
  },
};

async function useTestLanguage(language: string) {
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

describe("enterprise identity navigation", () => {
  beforeEach(async() => {
    await useTestLanguage("zh");
  });

  test("groups existing routes by enterprise identity console information architecture", () => {
    const groups = getTestNavigationGroups({
      account: localAdminAccount,
      themeData: {colorPrimary: "#1677ff"},
    });

    expect(groups.map(group => group.label)).toEqual([
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
    expect(groups.map(group => getNavigationIconName(group.icon))).toEqual([
      "HomeOutlined",
      "TeamOutlined",
      "AppstoreOutlined",
      "SafetyCertificateOutlined",
      "KeyOutlined",
      "AuditOutlined",
      "DeploymentUnitOutlined",
      "ToolOutlined",
      "CreditCardOutlined",
    ]);
    expectEnterprisePrimaryMenuLabels(groups.map(group => group.label));
    expect(groups.map(group => group.label)).not.toContain("Gateway 投影");
    expect(groups.find(group => group.key === "/overview").children.map(item => item.key))
      .toEqual(["/"]);
    expect(groups.find(group => group.key === "/overview").children.map(item => item.key))
      .not.toEqual(expect.arrayContaining(["/identity-assets", "/access-wizard", "/governance-tasks"]));
    expect(groups.find(group => group.key === "/overview").children.map(item => item.key))
      .not.toContain("/apps");
    expect(groups.find(group => group.key === "/overview").children.map(item => item.key))
      .not.toContain("/shortcuts");
    expect(groups.find(group => group.key === "/overview").children.find(item => item.key === "/").label)
      .toBe("身份总览");
    expect(shouldRenderNavigationGroupAsSingleLeaf(groups.find(group => group.key === "/overview"))).toBe(true);
    expect(groups.find(group => group.key === "/identity-sources").children.map(item => item.key))
      .toEqual(expect.arrayContaining(["/providers", "/wecom-org-sync", "/feishu-org-sync", "/dingtalk-org-sync", "/syncers"]));
    expect(groups.find(group => group.key === "/identity-sources").children.find(item => item.key === "/providers").label)
      .toBe("身份源中心");
    expect(groups.find(group => group.key === "/application-access").children.map(item => item.key))
      .toEqual(expect.arrayContaining(["/applications", "/application-usage-access", "/access-wizard", "/platform-api-mappings", "/webhooks"]));
    expect(groups.find(group => group.key === "/application-access").children.find(item => item.key === "/application-usage-access").label)
      .toBe("Admin Provider 交接");
    expect(groups.find(group => group.key === "/application-access").children.find(item => item.key === "/access-wizard").label)
      .toBe("接入预检");
    expect(groups.find(group => group.key === "/authorization-governance").children.map(item => item.key))
      .toEqual(expect.arrayContaining(["/roles", "/permissions", "/identity-assets", "/models", "/adapters", "/enforcers"]));
    expect(groups.find(group => group.key === "/authorization-governance").children.find(item => item.key === "/identity-assets").label)
      .toBe("授权关系与证据");
    expect(groups.find(group => group.key === "/audit-operations").children.map(item => item.key))
      .toEqual(["/sessions", "/records", "/tokens", "/verifications", "/governance-tasks"]);
    expect(groups.find(group => group.key === "/audit-operations").children.map(item => item.label))
      .toEqual(["登录会话", "操作日志", "令牌管理", "验证码记录", "风险处理"]);
    expect(groups.find(group => group.key === "/llm-ai-gateway").children.map(item => item.key))
      .toEqual(["/agents", "/servers", "/server-store", "/entries", "/sites", "/rules"]);
    expect(groups.find(group => group.key === "/llm-ai-gateway").children.map(item => item.label))
      .toEqual(["AI Agent 入口", "MCP Server", "MCP Store", "入口配置", "站点范围", "治理规则"]);
    expect(groups.find(group => group.key === "/llm-ai-gateway").children.find(item => item.key === "/agents").label)
      .toBe("AI Agent 入口");
    expect(groups.find(group => group.key === "/commerce-billing").children.map(item => item.key))
      .toEqual(expect.arrayContaining(["/product-store", "/orders", "/payments"]));
  });

  test("localizes enterprise identity console labels instead of hard-coding Chinese", async() => {
    await useTestLanguage("en");

    const groups = getTestNavigationGroups({
      account: localAdminAccount,
      themeData: {colorPrimary: "#1677ff"},
    });

    expect(groups.map(group => group.label)).toEqual([
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
    expect(groups.map(group => group.label)).not.toContain("Gateway Projection");
    expect(groups.find(group => group.key === "/overview").children.find(item => item.key === "/").label)
      .toBe("Identity Overview");
    expect(groups.find(group => group.key === "/overview").children.map(item => item.key))
      .toEqual(["/"]);
    expect(groups.find(group => group.key === "/overview").children.map(item => item.key))
      .not.toContain("/apps");
    expect(groups.find(group => group.key === "/overview").children.map(item => item.key))
      .not.toContain("/shortcuts");
    expect(groups.find(group => group.key === "/identity-sources").children.find(item => item.key === "/providers").label)
      .toBe("Identity Source Center");
    expect(groups.find(group => group.key === "/identity-sources").children.find(item => item.key === "/wecom-org-sync").label)
      .toBe("WeCom Sync");
    expect(groups.find(group => group.key === "/identity-sources").children.find(item => item.key === "/feishu-org-sync").label)
      .toBe("Feishu Sync");
    expect(groups.find(group => group.key === "/identity-sources").children.find(item => item.key === "/dingtalk-org-sync").label)
      .toBe("DingTalk Sync");
    expect(groups.find(group => group.key === "/application-access").children.find(item => item.key === "/applications").label)
      .toBe("Access Center");
    expect(groups.find(group => group.key === "/application-access").children.find(item => item.key === "/application-usage-access").label)
      .toBe("Admin Provider Handoff");
    expect(groups.find(group => group.key === "/application-access").children.find(item => item.key === "/access-wizard").label)
      .toBe("Access Preflight");
    expect(groups.find(group => group.key === "/application-access").children.find(item => item.key === "/platform-api-mappings").label)
      .toBe("API Gateway Mappings");
    expect(groups.find(group => group.key === "/authorization-governance").children.find(item => item.key === "/identity-assets").label)
      .toBe("Relationship Evidence");
    expect(groups.find(group => group.key === "/llm-ai-gateway").children.find(item => item.key === "/agents").label)
      .toBe("AI Agent Entry Points");
    expect(groups.find(group => group.key === "/audit-operations").children.map(item => item.label))
      .toEqual(["Login Sessions", "Operation Logs", "Token Management", "Verification Code Records", "Risk Actions"]);
    expect(groups.map(group => group.label).join("")).not.toMatch(/[\u4e00-\u9fff]/);
  });

  test("keeps legacy app portal available for non-local-admin fallback with explicit portal wording", () => {
    const groups = getTestNavigationGroups({
      account: nonLocalAdminAccount,
      themeData: {colorPrimary: "#1677ff"},
    });
    const overviewItems = groups.find(group => group.key === "/overview").children;

    expect(overviewItems.map(item => item.key)).toEqual(["/", "/apps"]);
    expect(overviewItems.find(item => item.key === "/apps").label).toBe("应用门户");
    expect(findNavigationSelection("/apps", groups)).toEqual({
      groupKey: "/overview",
      itemKey: "/apps",
    });
  });

  test("localizes the legacy app portal fallback label for non-local-admin users", async() => {
    await useTestLanguage("en");

    const groups = getTestNavigationGroups({
      account: nonLocalAdminAccount,
      themeData: {colorPrimary: "#1677ff"},
    });
    const overviewItems = groups.find(group => group.key === "/overview").children;

    expect(overviewItems.find(item => item.key === "/apps").label).toBe("Application Portal");
  });

  test("keeps leaf route keys compatible with navItems filtering and selection", () => {
    const groups = getTestNavigationGroups({
      account: {
        ...localAdminAccount,
        organization: {
          navItems: ["/", "/identity-assets", "/application-usage-access", "/access-wizard", "/providers", "/platform-api-mappings", "/governance-tasks"],
        },
      },
      themeData: {colorPrimary: "#1677ff"},
    });

    expect(groups.map(group => group.children.map(item => item.key)).flat()).toEqual([
      "/",
      "/application-usage-access",
      "/access-wizard",
      "/platform-api-mappings",
      "/providers",
      "/identity-assets",
      "/governance-tasks",
    ]);
    expect(findNavigationSelection("/access-wizard", groups)).toEqual({
      groupKey: "/application-access",
      itemKey: "/access-wizard",
    });
    expect(findNavigationSelection("/application-usage-access", groups)).toEqual({
      groupKey: "/application-access",
      itemKey: "/application-usage-access",
    });
    expect(findNavigationSelection("/identity-assets", groups)).toEqual({
      groupKey: "/authorization-governance",
      itemKey: "/identity-assets",
    });
    expect(findNavigationSelection("/governance-tasks", groups)).toEqual({
      groupKey: "/audit-operations",
      itemKey: "/governance-tasks",
    });
    expect(findNavigationSelection("/platform-api-mappings", groups)).toEqual({
      groupKey: "/application-access",
      itemKey: "/platform-api-mappings",
    });
  });

  test("reuses runtime IA in organization navigation configuration tree", () => {
    const tree = getTestNavigationTree();
    const rootChildren = tree[0].children;
    const overview = rootChildren.find(node => node.key === "/overview-top");
    const organizationIdentity = rootChildren.find(node => node.key === "/organization-identity-top");
    const identitySources = rootChildren.find(node => node.key === "/identity-sources-top");
    const authorizationGovernance = rootChildren.find(node => node.key === "/authorization-governance-top");

    expect(rootChildren.map(node => node.title)).toEqual([
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
    expectEnterprisePrimaryMenuLabels(rootChildren.map(node => node.title));
    expect(overview.children.map(item => item.key)).toEqual(["/"]);
    expect(overview.children.map(item => item.key)).not.toContain("/apps");
    expect(overview.children.map(item => item.key)).not.toContain("/shortcuts");
    expect(organizationIdentity.children.map(item => item.key)).toEqual([
      "/organizations",
      "/groups",
      "/users",
      "/invitations",
      "/organization-tree-operations",
      "/organization-directory-quality",
    ]);
    expect(identitySources.children.map(item => item.key)).toEqual([
      "/providers",
      "/wecom-org-sync",
      "/feishu-org-sync",
      "/dingtalk-org-sync",
      "/organization-sync-api-keys",
      "/syncers",
    ]);
    expect(rootChildren.find(node => node.key === "/application-access-top").children.map(item => item.key)).toEqual([
      "/applications",
      "/application-usage-access",
      "/access-wizard",
      "/resources",
      "/certs",
      "/keys",
      "/platform-api-mappings",
      "/webhooks",
      "/webhook-events",
    ]);
    expect(authorizationGovernance.children.map(item => item.key)).toEqual([
      "/roles",
      "/permissions",
      "/identity-assets",
      "/models",
      "/adapters",
      "/enforcers",
    ]);
  });

  test("uses enterprise navigation labels as route-driven workspace tabs", () => {
    const groups = getTestNavigationGroups({
      account: localAdminAccount,
      themeData: {colorPrimary: "#1677ff"},
    });
    const routes = buildWorkspaceRouteItems(groups);

    expect(routes.find(route => route.path === "/")?.label).toBe("身份总览");
    expect(routes.find(route => route.path === "/applications")?.label).toBe("接入中心");
    expect(routes.find(route => route.path === "/application-usage-access")?.label).toBe("Admin Provider 交接");
    expect(routes.find(route => route.path === "/agents")?.label).toBe("AI Agent 入口");
    expect(routes.find(route => route.path === "/dingtalk-org-sync")?.label).toBe("钉钉同步");

    const tabs = openWorkspaceTab([], "/agents/built-in/support-agent", routes);

    expect(tabs.map(tab => tab.path)).toEqual(["/", "/agents/built-in/support-agent"]);
    expect(tabs[1].label).toBe("编辑：support-agent");
  });

  test("covers matcher routes, empty state, and hidden admin-only entries", () => {
    expect(getTestNavigationGroups({account: null, themeData: {colorPrimary: "#1677ff"}})).toEqual([]);

    const groups = getTestNavigationGroups({
      account: localAdminAccount,
      themeData: {},
    });
    expect(findNavigationSelection("/organizations/demo", groups)).toEqual({
      groupKey: "/organization-identity",
      itemKey: "/organizations",
    });
    expect(findNavigationSelection("/users/demo/alice", groups)).toEqual({
      groupKey: "/organization-identity",
      itemKey: "/users",
    });
    expect(findNavigationSelection("/unknown", groups)).toEqual({
      groupKey: undefined,
      itemKey: undefined,
    });

    const userGroups = getTestNavigationGroups({
      account: {
        owner: "demo",
        isAdmin: false,
        organization: {
          userNavItems: ["/providers", "/platform-api-mappings"],
        },
      },
      themeData: {colorPrimary: "#1677ff"},
    });
    expect(userGroups.map(group => group.children.map(item => item.key)).flat()).toEqual(["/providers"]);
  });
});
