import * as Setting from "./Setting";

export type OrganizationDirectorySource = "wecom" | "lark" | "dingtalk" | string;
export type OrganizationDirectorySourceState = "available" | "owned" | "occupied" | "ambiguous" | string;

/** 单个通讯录来源的脱敏摘要，只用于展示和候选组织过滤，不包含 Provider 凭据。 */
export interface OrganizationDirectorySourceSummary {
  source?: OrganizationDirectorySource;
  displayName?: string;
  organization?: string;
  configured?: boolean;
  enabled?: boolean;
}

/** 后端统一组织通讯录来源状态契约，供 WeCom、Feishu/Lark 以及后续 Provider 页面复用。 */
export interface OrganizationDirectorySourceStatus {
  organization?: string;
  currentSource?: OrganizationDirectorySource;
  state?: OrganizationDirectorySourceState;
  owningSource?: OrganizationDirectorySourceSummary;
  occupyingSource?: OrganizationDirectorySourceSummary;
  sources?: OrganizationDirectorySourceSummary[];
  candidateSummary?: OrganizationDirectorySourceSummary[];
  statuses?: OrganizationDirectorySourceStatus[];
}

/** 兼容旧 WeCom/Feishu 响应字段的页面状态输入。 */
export interface LegacyOrganizationSyncSourceStatus {
  defaultOrganization?: string;
  defaultOrganizationSource?: string;
  conflictingProvider?: string;
  conflictingOrganization?: string;
  conflictingConfigured?: boolean;
  conflictingEnabled?: boolean;
  conflictingOrganizations?: string[];
  sourceStatus?: OrganizationDirectorySourceStatus;
}

/** 页面渲染用的归一化状态，避免两个同步页重复实现占用和异常分支。 */
export interface OrganizationDirectorySourceUiStatus {
  blocked: boolean;
  abnormal: boolean;
  provider: string;
  organization: string;
  organizations: string[];
  state: OrganizationDirectorySourceState | "";
}

/** 后端 API 标准响应包裹类型。 */
export interface OrganizationDirectorySourceApiResponse<T = unknown> {
  status?: string;
  data?: T;
  msg?: string | null;
}

/** 查询当前来源相对某个组织或候选组织集合的统一通讯录来源状态。 */
export function getOrganizationDirectorySourceStatus(source: OrganizationDirectorySource, organization = ""): Promise<OrganizationDirectorySourceApiResponse<OrganizationDirectorySourceStatus>> {
  const params = new URLSearchParams();
  params.set("source", source || "");
  if (organization) {
    params.set("organization", organization);
  }
  return fetch(`${Setting.ServerUrl}/api/organization-directory-source-status?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => res.json() as Promise<OrganizationDirectorySourceApiResponse<OrganizationDirectorySourceStatus>>);
}

/** 将后端统一状态和旧冲突字段归一化为页面可直接消费的阻断/异常信息。 */
export function getDirectorySourceUiStatus(status?: LegacyOrganizationSyncSourceStatus | null): OrganizationDirectorySourceUiStatus {
  const sourceStatus = status?.sourceStatus;
  const state = sourceStatus?.state || "";
  if (state === "ambiguous") {
    return {
      blocked: true,
      abnormal: true,
      provider: joinSourceDisplayNames(sourceStatus?.sources) || status?.conflictingProvider || "多个通讯录来源",
      organization: sourceStatus?.organization || status?.conflictingOrganization || "",
      organizations: collectSourceOrganizations(status, sourceStatus),
      state,
    };
  }
  if (state === "occupied") {
    return {
      blocked: true,
      abnormal: false,
      provider: sourceStatus?.occupyingSource?.displayName || status?.conflictingProvider || "另一通讯录来源",
      organization: sourceStatus?.occupyingSource?.organization || sourceStatus?.organization || status?.conflictingOrganization || "",
      organizations: collectSourceOrganizations(status, sourceStatus),
      state,
    };
  }
  const legacyBlocked = Boolean(status?.conflictingConfigured || status?.conflictingEnabled);
  return {
    blocked: legacyBlocked,
    abnormal: false,
    provider: status?.conflictingProvider || "另一通讯录来源",
    organization: status?.conflictingOrganization || "",
    organizations: collectSourceOrganizations(status, sourceStatus),
    state,
  };
}

function joinSourceDisplayNames(sources?: OrganizationDirectorySourceSummary[]): string {
  const names = (sources || [])
    .map(source => `${source?.displayName || ""}`.trim())
    .filter(Boolean);
  return Array.from(new Set(names)).join("、");
}

function collectSourceOrganizations(status?: LegacyOrganizationSyncSourceStatus | null, sourceStatus?: OrganizationDirectorySourceStatus): string[] {
  const seen: Record<string, boolean> = {};
  const organizations: string[] = [];
  const append = (value?: string) => {
    const organization = `${value || ""}`.trim();
    if (!organization || seen[organization]) {
      return;
    }
    seen[organization] = true;
    organizations.push(organization);
  };
  (status?.conflictingOrganizations || []).forEach(append);
  append(status?.conflictingOrganization);
  (sourceStatus?.sources || []).forEach(source => append(source?.organization));
  (sourceStatus?.statuses || []).forEach(item => {
    append(item?.organization);
    (item?.sources || []).forEach(source => append(source?.organization));
  });
  return organizations;
}
