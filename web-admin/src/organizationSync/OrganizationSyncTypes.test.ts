import {expect} from "@jest/globals";
import {
  formatImpactCounts,
  formatRunTimestamp,
  getOrganizationSyncProviderLogoAlt,
  getOrganizationSyncProviderLogoUrl,
  getRunStatusColor,
  hasRunningOrganizationSyncRuns
} from "./OrganizationSyncTypes";

describe("organization sync shared helpers", () => {
  test("resolves provider logo URLs through existing provider logo infrastructure", () => {
    expect(getOrganizationSyncProviderLogoUrl("wecom")).toContain("/img/social_wecom.png");
    expect(getOrganizationSyncProviderLogoUrl("feishu")).toContain("/img/social_lark.png");
    expect(getOrganizationSyncProviderLogoUrl("dingtalk")).toContain("/img/social_dingtalk.png");
  });

  test("provides accessible provider logo alt text", () => {
    expect(getOrganizationSyncProviderLogoAlt("wecom")).toBe("WeCom provider logo");
    expect(getOrganizationSyncProviderLogoAlt("feishu")).toBe("Feishu/Lark provider logo");
    expect(getOrganizationSyncProviderLogoAlt("dingtalk")).toBe("DingTalk provider logo");
  });

  test("detects running sync runs without depending on a provider-specific run shape", () => {
    expect(hasRunningOrganizationSyncRuns([{status: "success"}, {status: "running"}])).toBe(true);
    expect(hasRunningOrganizationSyncRuns([{status: "failed"}, null, {}])).toBe(false);
  });

  test("formats impact counts and timestamps for compact sync summaries", () => {
    expect(formatImpactCounts({departmentCount: 2, userCount: 5, membershipCount: 9, disabledCount: 1})).toBe("部门 2 / 用户 5 / 关系 9 / 禁用 1");
    expect(formatImpactCounts({})).toBe("-");
    expect(formatRunTimestamp("2026-06-18T08:30:00Z")).toContain("2026");
    expect(formatRunTimestamp("")).toBe("-");
  });

  test("maps run status to stable Ant Design tag colors", () => {
    expect(getRunStatusColor("running")).toBe("processing");
    expect(getRunStatusColor("success")).toBe("success");
    expect(getRunStatusColor("failed")).toBe("error");
    expect(getRunStatusColor("unknown")).toBe("default");
  });
});
