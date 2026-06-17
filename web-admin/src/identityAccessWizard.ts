import type {RedactionSummary, SourceScope, SourceScopeKind} from "./identityAssetRelationship";

export const ACCESS_WIZARD_STEP_IDS = [
  "object_selection",
  "configuration_review",
  "preflight_check",
  "read_only_evidence",
  "enable_review",
  "result_summary",
] as const;

export type AccessWizardStepId = typeof ACCESS_WIZARD_STEP_IDS[number];
export type AccessWizardDomain = "auth_source" | "application_access" | "llm_ai_gateway";
export type AccessWizardStepStatus = "wait" | "process" | "finish" | "error";
export type AccessWizardResultStatus = "ready" | "blocked" | "cannot_infer";
export type AccessWizardBlockerKind = "configuration_gap" | "evidence_gap" | "cannot_infer";
export type AccessWizardActionKind = "configure" | "evidence" | "detail" | "wait_for_aggregation";

export interface AccessWizardSourceDataset {
  pagePath: string;
  rows?: unknown[];
  totalRows?: number;
  filterSummary?: string;
  errorMessage?: string;
}

export interface AccessWizardObject {
  type: string;
  id: string;
  displayName: string;
  owner?: string;
  organization?: string;
  to: string;
}

export interface AccessWizardStep {
  id: AccessWizardStepId;
  labelKey: string;
  defaultLabel: string;
  descriptionKey: string;
  defaultDescription: string;
  status: AccessWizardStepStatus;
}

export interface AccessWizardBlocker {
  key: string;
  kind: AccessWizardBlockerKind;
  severity: "high" | "medium" | "low" | "info";
  labelKey: string;
  defaultLabel: string;
  descriptionKey: string;
  defaultDescription: string;
  evidenceTo: string;
}

export interface AccessWizardEvidenceEntry {
  key: string;
  labelKey: string;
  defaultLabel: string;
  descriptionKey: string;
  defaultDescription: string;
  to: string;
  source: SourceScope;
}

export interface AccessWizardAction {
  key: string;
  labelKey: string;
  defaultLabel: string;
  to: string;
  kind: AccessWizardActionKind;
}

export interface AccessWizardPreflightSummary {
  checkedCount: number;
  blockedCount: number;
  cannotInferCount: number;
  scopeLabelKey: string;
  defaultScopeLabel: string;
}

export interface AccessWizardSafetyBoundary {
  labelKey: string;
  defaultLabel: string;
  forbiddenExecutions: string[];
}

export interface AccessWizardPlan {
  key: string;
  domain: AccessWizardDomain;
  titleKey: string;
  defaultTitle: string;
  descriptionKey: string;
  defaultDescription: string;
  object: AccessWizardObject;
  source: SourceScope;
  sourceOfTruth: string;
  steps: AccessWizardStep[];
  blockers: AccessWizardBlocker[];
  evidenceEntries: AccessWizardEvidenceEntry[];
  safeNextActions: AccessWizardAction[];
  redactionSummary: RedactionSummary;
  preflightSummary: AccessWizardPreflightSummary;
  resultStatus: AccessWizardResultStatus;
  returnTo: string;
  safetyBoundary: AccessWizardSafetyBoundary;
}

export interface AccessWizardBuilderInput {
  providers?: AccessWizardSourceDataset;
  applications?: AccessWizardSourceDataset;
  agents?: AccessWizardSourceDataset;
}

export interface AccessWizardFilter {
  domain?: AccessWizardDomain | "all";
  resultStatus?: AccessWizardResultStatus | "all";
  sourceScope?: SourceScopeKind | "all";
  keyword?: string;
}

type UnknownRecord = Record<string, unknown>;

const sensitiveFieldPattern = /(secret|token|cookie|private|password|clientsecret|client_secret|accessToken|refreshToken|idToken)/i;
const privateUrlPattern = /^https?:\/\//i;
const authSourceRequiresClientPattern = /(OAuth|OIDC|SAML|Web3)/i;

function normalizeText(value: unknown): string {
  return `${value ?? ""}`.trim();
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function rows(dataset?: AccessWizardSourceDataset): UnknownRecord[] {
  return Array.isArray(dataset?.rows) ? dataset.rows.map(asRecord) : [];
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined || value === null || value === "") {
    return [];
  }

  return [value];
}

function hasValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0 && value.some(item => hasValue(item));
  }

  if (typeof value === "object" && value !== null) {
    const record = asRecord(value);
    return hasValue(record.name) || hasValue(record.value) || hasValue(record.scope);
  }

  return normalizeText(value) !== "";
}

function encoded(value: string): string {
  return encodeURIComponent(value);
}

function sourceForDataset(dataset: AccessWizardSourceDataset, object?: {type: string; id: string}): SourceScope {
  if (dataset.errorMessage) {
    return {
      kind: "read_only_review",
      pagePath: dataset.pagePath,
      filterSummary: dataset.filterSummary,
      loadedRows: 0,
      totalRows: dataset.totalRows,
      objectType: object?.type,
      objectId: object?.id,
    };
  }

  return {
    kind: object ? "current_object" : dataset.filterSummary ? "current_filter" : "current_view",
    pagePath: dataset.pagePath,
    filterSummary: dataset.filterSummary,
    loadedRows: rows(dataset).length,
    totalRows: dataset.totalRows,
    objectType: object?.type,
    objectId: object?.id,
  };
}

function redactionSummary(record: UnknownRecord, extraHiddenFields: string[] = []): RedactionSummary {
  const hiddenFields = new Set(extraHiddenFields);

  Object.entries(record).forEach(([field, value]) => {
    if (sensitiveFieldPattern.test(field) && hasValue(value)) {
      hiddenFields.add(field);
    }

    if (typeof value === "string" && privateUrlPattern.test(value)) {
      hiddenFields.add("privateUrl");
    }

    if (Array.isArray(value) && value.some(item => typeof item === "string" && privateUrlPattern.test(item))) {
      hiddenFields.add("privateUrl");
    }
  });

  return {
    hiddenFields: Array.from(hiddenFields).sort(),
    note: hiddenFields.size > 0 ? "sensitive_values_hidden" : "no_raw_credentials_rendered",
  };
}

function emptyObject(domain: AccessWizardDomain, type: string, to: string): AccessWizardObject {
  return {
    type,
    id: `${domain}/pending`,
    displayName: "待接入对象",
    to,
  };
}

function providerObject(provider: UnknownRecord): AccessWizardObject {
  const owner = normalizeText(provider.owner || "admin");
  const name = normalizeText(provider.name || provider.displayName || "unnamed-provider");
  return {
    type: "Provider",
    id: `${owner}/${name}`,
    displayName: normalizeText(provider.displayName || provider.name || "Provider"),
    owner,
    organization: owner,
    to: `/providers/${encoded(owner)}/${encoded(name)}`,
  };
}

function applicationObject(application: UnknownRecord): AccessWizardObject {
  const organization = normalizeText(application.organization || application.owner || "admin");
  const name = normalizeText(application.name || application.displayName || "unnamed-application");
  return {
    type: "Application",
    id: `${organization}/${name}`,
    displayName: normalizeText(application.displayName || application.name || "Application"),
    owner: normalizeText(application.owner || "admin"),
    organization,
    to: `/applications/${encoded(organization)}/${encoded(name)}`,
  };
}

function agentObject(agent: UnknownRecord): AccessWizardObject {
  const owner = normalizeText(agent.owner || "admin");
  const name = normalizeText(agent.name || agent.displayName || "unnamed-agent");
  return {
    type: "Agent",
    id: `${owner}/${name}`,
    displayName: normalizeText(agent.displayName || agent.name || "Agent"),
    owner,
    organization: owner,
    to: `/agents/${encoded(owner)}/${encoded(name)}`,
  };
}

function blocker(params: Omit<AccessWizardBlocker, "descriptionKey"> & {descriptionKey?: string}): AccessWizardBlocker {
  return {
    ...params,
    descriptionKey: params.descriptionKey || `${params.labelKey}Description`,
  };
}

function evidence(
  key: string,
  labelKey: string,
  defaultLabel: string,
  to: string,
  source: SourceScope,
  defaultDescription: string
): AccessWizardEvidenceEntry {
  return {
    key,
    labelKey,
    defaultLabel,
    descriptionKey: `${labelKey}Description`,
    defaultDescription,
    to,
    source,
  };
}

function action(key: string, labelKey: string, defaultLabel: string, to: string, kind: AccessWizardActionKind): AccessWizardAction {
  return {key, labelKey, defaultLabel, to, kind};
}

function getDomainCopy(domain: AccessWizardDomain): Pick<AccessWizardPlan, "titleKey" | "defaultTitle" | "descriptionKey" | "defaultDescription"> {
  if (domain === "application_access") {
    return {
      titleKey: "domainApplicationTitle",
      defaultTitle: "应用接入",
      descriptionKey: "domainApplicationDescription",
      defaultDescription: "核对 Client、回调、授权范围、Provider 绑定和登录链路证据。",
    };
  }

  if (domain === "llm_ai_gateway") {
    return {
      titleKey: "domainGatewayTitle",
      defaultTitle: "LLM AI / Gateway",
      descriptionKey: "domainGatewayDescription",
      defaultDescription: "核对 AI 入口、MCP/API 资源、网关身份映射和监听入口。",
    };
  }

  return {
    titleKey: "domainAuthSourceTitle",
    defaultTitle: "认证源接入",
    descriptionKey: "domainAuthSourceDescription",
    defaultDescription: "核对基础信息、协议能力、字段映射、连接预检和审计证据。",
  };
}

function buildSteps(resultStatus: AccessWizardResultStatus): AccessWizardStep[] {
  return [
    {
      id: "object_selection",
      labelKey: "stepObjectSelection",
      defaultLabel: "对象选择",
      descriptionKey: "stepObjectSelectionDescription",
      defaultDescription: "确认本次接入预检的对象和来源范围。",
      status: "finish",
    },
    {
      id: "configuration_review",
      labelKey: "stepConfigurationReview",
      defaultLabel: "配置核对",
      descriptionKey: "stepConfigurationReviewDescription",
      defaultDescription: "核对基础信息、字段和绑定关系是否满足接入条件。",
      status: resultStatus === "cannot_infer" ? "error" : "process",
    },
    {
      id: "preflight_check",
      labelKey: "stepPreflightCheck",
      defaultLabel: "预检清单",
      descriptionKey: "stepPreflightCheckDescription",
      defaultDescription: "以当前对象和只读证据生成配置完整度预检。",
      status: resultStatus === "ready" ? "finish" : "error",
    },
    {
      id: "read_only_evidence",
      labelKey: "stepReadOnlyEvidence",
      defaultLabel: "证据入口",
      descriptionKey: "stepReadOnlyEvidenceDescription",
      defaultDescription: "只打开现有页面核对审计、配置或 Gateway 映射证据。",
      status: resultStatus === "cannot_infer" ? "error" : "finish",
    },
    {
      id: "enable_review",
      labelKey: "stepEnableReview",
      defaultLabel: "发布前核对",
      descriptionKey: "stepEnableReviewDescription",
      defaultDescription: "汇总阻塞项、风险项和安全下一步，不标记全局完成。",
      status: resultStatus === "ready" ? "finish" : "error",
    },
    {
      id: "result_summary",
      labelKey: "stepResultSummary",
      defaultLabel: "结果确认",
      descriptionKey: "stepResultSummaryDescription",
      defaultDescription: "展示脱敏摘要、已检查项、未检查项和后续入口。",
      status: resultStatus === "ready" ? "finish" : resultStatus === "blocked" ? "error" : "wait",
    },
  ];
}

function buildPlan(params: {
  domain: AccessWizardDomain;
  object: AccessWizardObject;
  source: SourceScope;
  sourceOfTruth: string;
  blockers: AccessWizardBlocker[];
  evidenceEntries: AccessWizardEvidenceEntry[];
  safeNextActions: AccessWizardAction[];
  redactionSummary: RedactionSummary;
  returnTo: string;
}): AccessWizardPlan {
  const cannotInferCount = params.blockers.filter(item => item.kind === "cannot_infer").length;
  const resultStatus: AccessWizardResultStatus = cannotInferCount > 0 ? "cannot_infer" : params.blockers.length > 0 ? "blocked" : "ready";
  const domainCopy = getDomainCopy(params.domain);

  return {
    key: params.domain,
    domain: params.domain,
    ...domainCopy,
    object: params.object,
    source: params.source,
    sourceOfTruth: params.sourceOfTruth,
    steps: buildSteps(resultStatus),
    blockers: params.blockers,
    evidenceEntries: params.evidenceEntries,
    safeNextActions: params.safeNextActions,
    redactionSummary: params.redactionSummary,
    preflightSummary: {
      checkedCount: ACCESS_WIZARD_STEP_IDS.length,
      blockedCount: params.blockers.filter(item => item.kind !== "cannot_infer").length,
      cannotInferCount,
      scopeLabelKey: params.source.kind === "current_object" ? "scopeCurrentObject" : params.source.kind === "current_filter" ? "scopeCurrentFilter" : "scopeCurrentView",
      defaultScopeLabel: params.source.kind === "current_object" ? "当前对象接入预检" : params.source.kind === "current_filter" ? "当前筛选接入预检" : "当前视图接入预检",
    },
    resultStatus,
    returnTo: params.returnTo,
    safetyBoundary: {
      labelKey: "p0SafetyBoundary",
      defaultLabel: "P0 仅执行配置完整度和只读证据核对。",
      forbiddenExecutions: [
        "oauth_callback",
        "provider_login",
        "sync_execution",
        "gateway_publish",
        "gateway_cleanup",
        "receipt_verification",
      ],
    },
  };
}

function buildUnavailablePlan(domain: AccessWizardDomain, dataset: AccessWizardSourceDataset, objectType: string, returnTo: string): AccessWizardPlan {
  const source = sourceForDataset(dataset);
  return buildPlan({
    domain,
    object: emptyObject(domain, objectType, returnTo),
    source,
    sourceOfTruth: "source_unavailable",
    blockers: [
      blocker({
        key: `${domain}-source-unavailable`,
        kind: "cannot_infer",
        severity: "info",
        labelKey: "sourceUnavailable",
        defaultLabel: "无法推断",
        defaultDescription: "当前证据入口暂不可用，请从既有列表或后续聚合接口核对。",
        evidenceTo: returnTo,
      }),
    ],
    evidenceEntries: [evidence(`${domain}-source`, "sourceEvidence", "证据入口", returnTo, source, "进入现有页面核对可见对象和审计证据。")],
    safeNextActions: [action(`${domain}-return`, "returnToSource", "返回来源页面", returnTo, "wait_for_aggregation")],
    redactionSummary: {hiddenFields: [], note: "no_raw_credentials_rendered"},
    returnTo,
  });
}

export function buildAccessWizardPlans(input: AccessWizardBuilderInput = {}): AccessWizardPlan[] {
  return [
    buildAuthSourcePlan(input.providers || {pagePath: "/providers", rows: [], totalRows: 0}),
    buildApplicationPlan(input.applications || {pagePath: "/applications", rows: [], totalRows: 0}),
    buildGatewayPlan(input.agents || {pagePath: "/agents", rows: [], totalRows: 0}),
  ];
}

function buildAuthSourcePlan(dataset: AccessWizardSourceDataset): AccessWizardPlan {
  if (dataset.errorMessage) {
    return buildUnavailablePlan("auth_source", dataset, "Provider", "/providers");
  }

  const provider = rows(dataset)[0];
  const object = provider ? providerObject(provider) : emptyObject("auth_source", "Provider", "/providers");
  const source = sourceForDataset(dataset, provider ? {type: object.type, id: object.id} : undefined);
  const providerCategory = normalizeText(provider?.category || provider?.type);
  const requiresClient = authSourceRequiresClientPattern.test(providerCategory);
  const blockers: AccessWizardBlocker[] = [];

  if (!provider) {
    blockers.push(blocker({
      key: "auth-source-empty",
      kind: "configuration_gap",
      severity: "medium",
      labelKey: "authSourceEmpty",
      defaultLabel: "待接入认证源",
      defaultDescription: "当前范围未看到可预检的认证源，请先进入认证源中心创建或选择对象。",
      evidenceTo: "/providers",
    }));
  } else {
    if (requiresClient && !hasValue(provider.clientId)) {
      blockers.push(blocker({
        key: "auth-source-client-id",
        kind: "configuration_gap",
        severity: "high",
        labelKey: "authSourceClientIdGap",
        defaultLabel: "缺少 Client 标识",
        defaultDescription: "协议能力预检需要可见 Client ID；密钥原值不会展示。",
        evidenceTo: object.to,
      }));
    }

    if (!hasValue(provider.syncFieldMapping) && !hasValue(provider.fieldMapping) && !hasValue(provider.claimMapping)) {
      blockers.push(blocker({
        key: "auth-source-field-mapping",
        kind: "configuration_gap",
        severity: "medium",
        labelKey: "authSourceFieldMappingGap",
        defaultLabel: "字段 / 同步映射待核对",
        defaultDescription: "P0 只提示字段、组织和账号映射缺口，不执行同步。",
        evidenceTo: object.to,
      }));
    }
  }

  return buildPlan({
    domain: "auth_source",
    object,
    source,
    sourceOfTruth: provider ? "provider.visible_row.configuration" : "provider.visible_scope.empty",
    blockers,
    evidenceEntries: [
      evidence("auth-source-config", "authSourceConfigEvidence", "认证源配置", object.to, source, "打开认证源配置核对基础信息和协议能力。"),
      evidence("auth-source-audit", "auditEvidence", "审计证据", "/records", source, "打开审计记录核对配置变更和登录证据。"),
      evidence("auth-source-verification", "verificationEvidence", "验证记录", "/verifications", source, "进入验证记录核对当前对象可见证据。"),
    ],
    safeNextActions: [
      action("review-auth-source", "reviewAuthSource", "核对认证源配置", object.to, "configure"),
      action("review-audit", "reviewAuditEvidence", "核对审计证据", "/records", "evidence"),
    ],
    redactionSummary: provider ? redactionSummary(provider) : {hiddenFields: [], note: "no_raw_credentials_rendered"},
    returnTo: "/providers",
  });
}

function buildApplicationPlan(dataset: AccessWizardSourceDataset): AccessWizardPlan {
  if (dataset.errorMessage) {
    return buildUnavailablePlan("application_access", dataset, "Application", "/applications");
  }

  const application = rows(dataset)[0];
  const object = application ? applicationObject(application) : emptyObject("application_access", "Application", "/applications");
  const source = sourceForDataset(dataset, application ? {type: object.type, id: object.id} : undefined);
  const blockers: AccessWizardBlocker[] = [];

  if (!application) {
    blockers.push(blocker({
      key: "application-empty",
      kind: "configuration_gap",
      severity: "medium",
      labelKey: "applicationEmpty",
      defaultLabel: "待接入应用",
      defaultDescription: "当前范围未看到可预检的应用，请从应用接入中心创建或选择对象。",
      evidenceTo: "/applications",
    }));
  } else {
    if (!hasValue(application.clientId)) {
      blockers.push(blocker({
        key: "application-client-id",
        kind: "configuration_gap",
        severity: "high",
        labelKey: "applicationClientIdGap",
        defaultLabel: "缺少 Client 标识",
        defaultDescription: "应用接入需要可见 Client ID；密钥原值不会展示。",
        evidenceTo: object.to,
      }));
    }

    if (toArray(application.redirectUris).length === 0) {
      blockers.push(blocker({
        key: "application-callback",
        kind: "configuration_gap",
        severity: "high",
        labelKey: "applicationCallbackGap",
        defaultLabel: "缺少回调地址",
        defaultDescription: "登录链路预检需要至少一个回调地址；完整私有 URL 不展示。",
        evidenceTo: object.to,
      }));
    }

    if (toArray(application.scopes).length === 0 && toArray(application.grantTypes).length === 0) {
      blockers.push(blocker({
        key: "application-scope",
        kind: "configuration_gap",
        severity: "medium",
        labelKey: "applicationScopeGap",
        defaultLabel: "授权范围待核对",
        defaultDescription: "需要核对 scope 或 grant type 才能进入发布前核对。",
        evidenceTo: object.to,
      }));
    }

    if (toArray(application.providers).length === 0) {
      blockers.push(blocker({
        key: "application-provider-binding",
        kind: "configuration_gap",
        severity: "high",
        labelKey: "applicationProviderBindingGap",
        defaultLabel: "Provider 绑定待核对",
        defaultDescription: "当前对象未显示 Provider 绑定，请进入应用或认证源页面核对。",
        evidenceTo: object.to,
      }));
    }
  }

  return buildPlan({
    domain: "application_access",
    object,
    source,
    sourceOfTruth: application ? "application.visible_row.client_callback_scope_provider" : "application.visible_scope.empty",
    blockers,
    evidenceEntries: [
      evidence("application-config", "applicationConfigEvidence", "应用配置", object.to, source, "打开应用配置核对 Client、回调和授权范围。"),
      evidence("application-providers", "providerEvidence", "Provider 证据", "/providers", source, "进入认证源中心核对 Provider 绑定。"),
      evidence("application-audit", "auditEvidence", "审计证据", "/records", source, "打开审计记录核对应用变更。"),
    ],
    safeNextActions: [
      action("review-application", "reviewApplicationConfig", "核对应用配置", object.to, "configure"),
      action("review-provider-binding", "reviewProviderBinding", "核对 Provider 绑定", "/providers", "evidence"),
    ],
    redactionSummary: application ? redactionSummary(application) : {hiddenFields: [], note: "no_raw_credentials_rendered"},
    returnTo: "/applications",
  });
}

function buildGatewayPlan(dataset: AccessWizardSourceDataset): AccessWizardPlan {
  if (dataset.errorMessage) {
    return buildUnavailablePlan("llm_ai_gateway", dataset, "Agent", "/agents");
  }

  const agent = rows(dataset)[0];
  const object = agent ? agentObject(agent) : emptyObject("llm_ai_gateway", "Agent", "/agents");
  const source = sourceForDataset(dataset, agent ? {type: object.type, id: object.id} : undefined);
  const blockers: AccessWizardBlocker[] = [];

  if (!agent) {
    blockers.push(blocker({
      key: "gateway-empty",
      kind: "configuration_gap",
      severity: "medium",
      labelKey: "gatewayEmpty",
      defaultLabel: "待接入 AI 入口",
      defaultDescription: "当前范围未看到可预检的 Agent、MCP/API 资源或 Gateway 映射对象。",
      evidenceTo: "/agents",
    }));
  } else {
    if (!hasValue(agent.application)) {
      blockers.push(blocker({
        key: "gateway-identity-mapping",
        kind: "configuration_gap",
        severity: "high",
        labelKey: "gatewayIdentityMappingGap",
        defaultLabel: "网关身份映射待核对",
        defaultDescription: "需要核对 Agent 到应用、MCP/API 资源和平台主体的身份映射。",
        evidenceTo: "/platform-api-mappings",
      }));
    }

    if (!hasValue(agent.url)) {
      blockers.push(blocker({
        key: "gateway-listening-entry",
        kind: "configuration_gap",
        severity: "medium",
        labelKey: "gatewayListeningEntryGap",
        defaultLabel: "监听入口待核对",
        defaultDescription: "当前对象未显示监听入口，请进入 LLM AI/Gateway 对象核对。",
        evidenceTo: object.to,
      }));
    }

    blockers.push(blocker({
      key: "gateway-readiness-evidence",
      kind: "evidence_gap",
      severity: "medium",
      labelKey: "gatewayReadinessEvidenceGap",
      defaultLabel: "发布前证据待核对",
      defaultDescription: "P0 不查询 Gateway receipt，也不执行 projection publish；请从映射和审计入口核对证据。",
      evidenceTo: "/platform-api-mappings",
    }));
  }

  return buildPlan({
    domain: "llm_ai_gateway",
    object,
    source,
    sourceOfTruth: agent ? "agent.visible_row.application_url_mapping" : "agent.visible_scope.empty",
    blockers,
    evidenceEntries: [
      evidence("gateway-agent", "gatewayAgentEvidence", "AI 入口", object.to, source, "打开 LLM AI/Gateway 对象核对入口和资源配置。"),
      evidence("gateway-mapping", "gatewayMappingEvidence", "身份映射", "/platform-api-mappings", source, "进入 API Gateway 映射核对组织、账号和 readiness。"),
      evidence("gateway-audit", "auditEvidence", "审计证据", "/records", source, "打开审计记录核对映射变更和失败证据。"),
    ],
    safeNextActions: [
      action("review-agent", "reviewGatewayEntry", "核对 AI 入口", object.to, "configure"),
      action("review-gateway-mapping", "reviewGatewayMapping", "核对身份映射", "/platform-api-mappings", "evidence"),
    ],
    redactionSummary: agent ? redactionSummary(agent) : {hiddenFields: [], note: "no_raw_credentials_rendered"},
    returnTo: "/agents",
  });
}

function matchesText(plan: AccessWizardPlan, keyword: string): boolean {
  const normalized = keyword.trim().toLowerCase().replace(/[_-]+/g, " ");
  if (normalized === "") {
    return true;
  }

  return [
    plan.domain,
    plan.defaultTitle,
    plan.defaultDescription,
    plan.object.type,
    plan.object.id,
    plan.object.displayName,
    plan.resultStatus,
    plan.source.pagePath,
    plan.sourceOfTruth,
    ...plan.blockers.map(item => `${item.defaultLabel} ${item.defaultDescription}`),
    ...plan.evidenceEntries.map(item => `${item.defaultLabel} ${item.to}`),
  ].join(" ").toLowerCase().replace(/[_-]+/g, " ").includes(normalized);
}

export function filterAccessWizardPlans(plans: AccessWizardPlan[], filter: AccessWizardFilter = {}): AccessWizardPlan[] {
  return plans.filter(plan => {
    if (filter.domain && filter.domain !== "all" && plan.domain !== filter.domain) {
      return false;
    }

    if (filter.resultStatus && filter.resultStatus !== "all" && plan.resultStatus !== filter.resultStatus) {
      return false;
    }

    if (filter.sourceScope && filter.sourceScope !== "all" && plan.source.kind !== filter.sourceScope) {
      return false;
    }

    return matchesText(plan, filter.keyword || "");
  });
}
