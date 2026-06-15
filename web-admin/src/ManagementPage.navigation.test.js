import {buildEnterpriseNavigationGroups, findNavigationSelection} from "./enterpriseNavigation";

const localAdminAccount = {
  owner: "built-in",
  isAdmin: true,
  organization: {
    navItems: ["all"],
    userNavItems: [],
  },
};

describe("enterprise identity navigation", () => {
  test("groups existing routes by enterprise identity console information architecture", () => {
    const groups = buildEnterpriseNavigationGroups({
      account: localAdminAccount,
      themeData: {colorPrimary: "#1677ff"},
    });

    expect(groups.map(group => group.label)).toEqual([
      "总览",
      "组织与身份",
      "认证源",
      "应用接入",
      "Gateway 投影",
      "审计与运维",
    ]);
    expect(groups.find(group => group.key === "/identity-sources").children.map(item => item.key))
      .toEqual(expect.arrayContaining(["/providers", "/wecom-org-sync", "/feishu-org-sync", "/syncers"]));
    expect(groups.find(group => group.key === "/application-access").children.map(item => item.key))
      .toEqual(expect.arrayContaining(["/applications", "/platform-api-mappings", "/webhooks"]));
  });

  test("keeps leaf route keys compatible with navItems filtering and selection", () => {
    const groups = buildEnterpriseNavigationGroups({
      account: {
        ...localAdminAccount,
        organization: {
          navItems: ["/", "/providers", "/platform-api-mappings"],
        },
      },
      themeData: {colorPrimary: "#1677ff"},
    });

    expect(groups.map(group => group.children.map(item => item.key)).flat()).toEqual([
      "/",
      "/providers",
      "/platform-api-mappings",
    ]);
    expect(findNavigationSelection("/platform-api-mappings", groups)).toEqual({
      groupKey: "/application-access",
      itemKey: "/platform-api-mappings",
    });
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
