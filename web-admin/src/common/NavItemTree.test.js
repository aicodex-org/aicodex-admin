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
      "中心总览",
      "组织身份",
      "身份认证",
      "应用接入",
      "LLM AI",
      "权限治理",
      "审计运维",
      "管理工具",
      "商业付款",
    ]);
    expect(treeData[0].children.map(group => group.title)).not.toContain("Gateway 投影");
    expect(leafKeys(getGroup(treeData, "身份认证"))).toEqual(
      expect.arrayContaining(["/providers", "/wecom-org-sync", "/feishu-org-sync", "/syncers"])
    );
    expect(leafKeys(getGroup(treeData, "应用接入"))).toEqual(
      expect.arrayContaining(["/applications", "/keys", "/platform-api-mappings", "/webhook-events"])
    );
    expect(leafKeys(getGroup(treeData, "LLM AI"))).toEqual([
      "/agents",
      "/servers",
      "/server-store",
      "/entries",
      "/sites",
      "/rules",
    ]);
    expect(leafKeys(getGroup(treeData, "审计运维"))).toEqual([
      "/sessions",
      "/records",
      "/tokens",
      "/verifications",
    ]);
    expect(getGroup(treeData, "审计运维").children.map(item => item.title)).toEqual([
      "会话核对",
      "审计记录",
      "令牌核对",
      "验证核对",
    ]);
    expect(leafKeys(getGroup(treeData, "管理工具"))).toEqual(
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
      "LLM AI",
      "Authorization Governance",
      "Audit & Operations",
      "System Tools",
      "Business & Payments",
    ]);
    expect(treeData[0].children.map(group => group.title)).not.toContain("Gateway Projection");
    expect(leafKeys(getGroup(treeData, "Identity Sources"))).toEqual(
      expect.arrayContaining(["/providers", "/wecom-org-sync", "/feishu-org-sync", "/syncers"])
    );
    expect(leafKeys(getGroup(treeData, "Audit & Operations"))).toEqual([
      "/sessions",
      "/records",
      "/tokens",
      "/verifications",
    ]);
    expect(getGroup(treeData, "Audit & Operations").children.map(item => item.title)).toEqual([
      "Session Review",
      "Audit Records",
      "Token Review",
      "Verification Review",
    ]);
  });
});
