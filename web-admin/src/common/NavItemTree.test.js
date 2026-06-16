/* eslint-env jest */
import i18next from "i18next";
import {buildEnterpriseNavigationConfigTreeData} from "../enterpriseNavigation";
import en from "../locales/en/data.json";
import zh from "../locales/zh/data.json";

function getGroup(treeData, title) {
  return treeData[0].children.find(group => group.title === title);
}

function leafKeys(group) {
  return group.children.map(item => item.key);
}

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

describe("NavItemTree enterprise identity configuration", () => {
  beforeEach(async() => {
    await useTestLanguage("zh");
  });

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

  test("localizes the configuration tree for non-Chinese language modes", async() => {
    await useTestLanguage("en");

    const treeData = buildEnterpriseNavigationConfigTreeData();

    expect(treeData[0].children.map(group => group.title)).toEqual([
      "Overview",
      "Organization & Identity",
      "Identity Sources",
      "Application Access",
      "Gateway Projection",
      "Authorization Governance",
      "Audit & Operations",
      "System Tools",
      "Commerce & Billing",
    ]);
    expect(leafKeys(getGroup(treeData, "Identity Sources"))).toEqual(
      expect.arrayContaining(["/providers", "/wecom-org-sync", "/feishu-org-sync", "/syncers"])
    );
    expect(leafKeys(getGroup(treeData, "Audit & Operations"))).toEqual([
      "/sessions",
      "/records",
      "/tokens",
      "/verifications",
    ]);
  });
});
