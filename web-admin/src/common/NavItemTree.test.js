/* eslint-env jest */
import {buildEnterpriseNavigationConfigTreeData} from "../enterpriseNavigation";

function getGroup(treeData, title) {
  return treeData[0].children.find(group => group.title === title);
}

function leafKeys(group) {
  return group.children.map(item => item.key);
}

describe("NavItemTree enterprise identity configuration", () => {
  test("uses the same enterprise identity information architecture as the runtime sidebar", () => {
    const treeData = buildEnterpriseNavigationConfigTreeData();

    expect(treeData[0].children.map(group => group.title)).toEqual([
      "总览",
      "组织与身份",
      "认证源",
      "应用接入",
      "Gateway 投影",
      "权限治理",
      "审计与运维",
      "系统工具",
      "商业与计费",
    ]);
    expect(leafKeys(getGroup(treeData, "认证源"))).toEqual(
      expect.arrayContaining(["/providers", "/wecom-org-sync", "/feishu-org-sync", "/syncers"])
    );
    expect(leafKeys(getGroup(treeData, "应用接入"))).toEqual(
      expect.arrayContaining(["/applications", "/keys", "/platform-api-mappings", "/webhook-events"])
    );
    expect(leafKeys(getGroup(treeData, "审计与运维"))).toEqual([
      "/sessions",
      "/records",
      "/tokens",
      "/verifications",
    ]);
    expect(leafKeys(getGroup(treeData, "系统工具"))).toEqual(
      expect.arrayContaining(["/sysinfo", "/forms", "/tickets", "/swagger"])
    );
  });
});
