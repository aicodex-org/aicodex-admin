/* eslint-env jest */
import i18next from "i18next";
import {
  buildEnterpriseNavigationConfigTreeData,
  buildEnterpriseNavigationGroups,
  findNavigationSelection
} from "./enterpriseNavigation";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";

const localAdminAccount = {
  owner: "built-in",
  isAdmin: true,
  organization: {
    navItems: ["all"],
    userNavItems: [],
  },
};

async function useTestLanguage(language) {
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
    const groups = buildEnterpriseNavigationGroups({
      account: localAdminAccount,
      themeData: {colorPrimary: "#1677ff"},
    });

    expect(groups.map(group => group.label)).toEqual([
      "中心总览",
      "组织身份",
      "身份认证",
      "应用接入",
      "LLM AI 网关",
      "权限治理",
      "审计运维",
      "管理工具",
      "商业付款",
    ]);
    expect(groups.map(group => group.label)).not.toContain("Gateway 投影");
    expect(groups.find(group => group.key === "/overview").children.map(item => item.key))
      .toEqual(["/", "/access-wizard", "/governance-tasks", "/shortcuts", "/apps"]);
    expect(groups.find(group => group.key === "/overview").children.find(item => item.key === "/access-wizard").label)
      .toBe("接入预检中心");
    expect(groups.find(group => group.key === "/identity-sources").children.map(item => item.key))
      .toEqual(expect.arrayContaining(["/providers", "/wecom-org-sync", "/feishu-org-sync", "/syncers"]));
    expect(groups.find(group => group.key === "/identity-sources").children.find(item => item.key === "/providers").label)
      .toBe("认证源中心");
    expect(groups.find(group => group.key === "/application-access").children.map(item => item.key))
      .toEqual(expect.arrayContaining(["/applications", "/platform-api-mappings", "/webhooks"]));
    expect(groups.find(group => group.label === "LLM AI 网关").children.map(item => item.key))
      .toEqual(["/agents", "/servers", "/server-store", "/entries", "/sites", "/rules"]);
    expect(groups.find(group => group.label === "LLM AI 网关").children.find(item => item.key === "/agents").label)
      .toBe("LLM AI 网关中心");
    expect(groups.find(group => group.key === "/audit-operations").children.map(item => item.key))
      .toEqual(["/sessions", "/records", "/tokens", "/verifications"]);
    expect(groups.find(group => group.key === "/audit-operations").children.map(item => item.label))
      .toEqual(["会话核对", "审计记录", "令牌核对", "验证核对"]);
    expect(groups.find(group => group.key === "/authorization-governance").children.map(item => item.key))
      .toEqual(expect.arrayContaining(["/roles", "/permissions", "/models", "/adapters", "/enforcers"]));
    expect(groups.find(group => group.key === "/commerce-billing").children.map(item => item.key))
      .toEqual(expect.arrayContaining(["/product-store", "/orders", "/payments"]));
  });

  test("localizes enterprise identity console labels instead of hard-coding Chinese", async() => {
    await useTestLanguage("en");

    const groups = buildEnterpriseNavigationGroups({
      account: localAdminAccount,
      themeData: {colorPrimary: "#1677ff"},
    });

    expect(groups.map(group => group.label)).toEqual([
      "Overview",
      "Organization & Identity",
      "Identity Sources",
      "Application Access",
      "LLM AI Gateway",
      "Authorization Governance",
      "Audit & Operations",
      "System Tools",
      "Business & Payments",
    ]);
    expect(groups.map(group => group.label)).not.toContain("Gateway Projection");
    expect(groups.find(group => group.key === "/overview").children.find(item => item.key === "/").label)
      .toBe("Identity Governance Overview");
    expect(groups.find(group => group.key === "/overview").children.find(item => item.key === "/governance-tasks").label)
      .toBe("Governance Task Center");
    expect(groups.find(group => group.key === "/overview").children.find(item => item.key === "/access-wizard").label)
      .toBe("Access Preflight Center");
    expect(groups.find(group => group.key === "/identity-sources").children.find(item => item.key === "/providers").label)
      .toBe("Authentication Source Center");
    expect(groups.find(group => group.key === "/identity-sources").children.find(item => item.key === "/wecom-org-sync").label)
      .toBe("WeCom Sync");
    expect(groups.find(group => group.key === "/identity-sources").children.find(item => item.key === "/feishu-org-sync").label)
      .toBe("Feishu Sync");
    expect(groups.find(group => group.key === "/application-access").children.find(item => item.key === "/applications").label)
      .toBe("Application Access Center");
    expect(groups.find(group => group.key === "/application-access").children.find(item => item.key === "/platform-api-mappings").label)
      .toBe("API Gateway Mappings");
    expect(groups.find(group => group.key === "/llm-ai-gateway").children.find(item => item.key === "/agents").label)
      .toBe("LLM AI Gateway Center");
    expect(groups.find(group => group.key === "/audit-operations").children.map(item => item.label))
      .toEqual(["Session Review", "Audit Records", "Token Review", "Verification Review"]);
    expect(groups.map(group => group.label).join("")).not.toMatch(/[\u4e00-\u9fff]/);
  });

  test("keeps leaf route keys compatible with navItems filtering and selection", () => {
    const groups = buildEnterpriseNavigationGroups({
      account: {
        ...localAdminAccount,
        organization: {
          navItems: ["/", "/access-wizard", "/providers", "/platform-api-mappings"],
        },
      },
      themeData: {colorPrimary: "#1677ff"},
    });

    expect(groups.map(group => group.children.map(item => item.key)).flat()).toEqual([
      "/",
      "/access-wizard",
      "/providers",
      "/platform-api-mappings",
    ]);
    expect(findNavigationSelection("/access-wizard", groups)).toEqual({
      groupKey: "/overview",
      itemKey: "/access-wizard",
    });
    expect(findNavigationSelection("/platform-api-mappings", groups)).toEqual({
      groupKey: "/application-access",
      itemKey: "/platform-api-mappings",
    });
  });

  test("reuses runtime IA in organization navigation configuration tree", () => {
    const tree = buildEnterpriseNavigationConfigTreeData();
    const rootChildren = tree[0].children;
    const organizationIdentity = rootChildren.find(node => node.key === "/organization-identity-top");
    const identitySources = rootChildren.find(node => node.key === "/identity-sources-top");
    const authorizationGovernance = rootChildren.find(node => node.key === "/authorization-governance-top");

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
      "/syncers",
    ]);
    expect(authorizationGovernance.children.map(item => item.key)).toEqual([
      "/roles",
      "/permissions",
      "/models",
      "/adapters",
      "/enforcers",
    ]);
  });

  test("covers matcher routes, empty state, and hidden admin-only entries", () => {
    expect(buildEnterpriseNavigationGroups({account: null, themeData: {colorPrimary: "#1677ff"}})).toEqual([]);

    const groups = buildEnterpriseNavigationGroups({
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

    const userGroups = buildEnterpriseNavigationGroups({
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
