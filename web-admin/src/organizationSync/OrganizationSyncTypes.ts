import * as Setting from "../Setting";

export type OrganizationSyncProvider = "wecom" | "feishu";

export type OrganizationSyncRunStatus = "running" | "success" | "failed" | "partial_success" | "cancelled" | string;

export interface OrganizationSyncRunLike {
  status?: OrganizationSyncRunStatus;
}

export interface OrganizationSyncImpactCounts {
  departmentCount?: number;
  userCount?: number;
  membershipCount?: number;
  disabledCount?: number;
}

const providerLogoConfig: Record<OrganizationSyncProvider, {category: "OAuth"; type: string}> = {
  wecom: {category: "OAuth", type: "WeCom"},
  feishu: {category: "OAuth", type: "Lark"},
};

export function getOrganizationSyncProviderLogoUrl(provider: OrganizationSyncProvider): string {
  return Setting.getProviderLogoURL(providerLogoConfig[provider]);
}

export function getOrganizationSyncProviderLogoAlt(provider: OrganizationSyncProvider): string {
  return provider === "wecom" ? "WeCom provider logo" : "Feishu/Lark provider logo";
}

export function hasRunningOrganizationSyncRuns(runs: Array<OrganizationSyncRunLike | null | undefined>): boolean {
  return runs.some(run => run?.status === "running");
}

export function getRunStatusColor(status?: OrganizationSyncRunStatus): string {
  switch (status) {
  case "running":
    return "processing";
  case "success":
    return "success";
  case "failed":
    return "error";
  case "partial_success":
    return "warning";
  case "cancelled":
    return "default";
  default:
    return "default";
  }
}

export function formatImpactCounts(counts: OrganizationSyncImpactCounts = {}): string {
  const parts = [
    ["部门", counts.departmentCount],
    ["用户", counts.userCount],
    ["关系", counts.membershipCount],
    ["禁用", counts.disabledCount],
  ]
    .filter(([, value]) => typeof value === "number")
    .map(([label, value]) => `${label} ${value}`);

  return parts.length > 0 ? parts.join(" / ") : "-";
}

export function formatRunTimestamp(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}
