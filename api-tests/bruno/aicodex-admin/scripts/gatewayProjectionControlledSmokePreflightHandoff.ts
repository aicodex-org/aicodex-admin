const SOURCE_FRESHNESS_ALIASES = new Set([
  "source_connection_stale",
  "source_connection_unavailable",
  "source_connection_unknown",
]);

const MAPPING_READINESS_ALIASES = new Set([
  "mapping_missing",
  "mapping_untrusted",
  "source_metadata_unavailable",
  "lineage_freshness_unavailable",
  "lifecycle_not_publishable",
  "mapping_readiness_unavailable",
  "mapping_readiness_not_checked",
]);

const READY_ADMIN_RELEASE_DECISIONS = new Set([
  "ready-for-controlled-smoke",
  "ready-for-controlled-smoke-prep",
]);

const READY_API_DECISIONS = new Set([
  "ready",
  "ok",
  "clear",
  "api-diagnostics-clear",
  "ready-for-controlled-smoke-prep",
]);

const READY_API_STATUSES = new Set([
  "ok",
  "ready",
  "clear",
  "passed",
]);

const BOUNDARIES = [
  "controlled smoke preflight handoff 只允许进入受控 smoke 准备",
  "该 handoff 不是真实 publish 成功、gateway ingestion 成功或 authorization facts 生效",
  "该 handoff 不是完整 projection 业务成功，也不能写成 full-success",
  "不得查询 API/Insight/gateway store，不得写真实 fixture、真实 DB、publish、refresh 或 mapping confirm",
  "display name、phone、email、legacy lineage 和 user properties 不能作为 runtime projection join key",
];

// 只接受脱敏 handoff/summary/decision 字段；误传完整响应、候选明细或凭据字段时统一 fail closed。
const FORBIDDEN_FIELD_NAME_PARTS = [
  "account",
  "authorization",
  "candidate",
  "cookie",
  "credential",
  "token",
  "password",
  "secret",
  "privateurl",
  "privateendpoint",
  "sourcetenant",
  "configref",
  "secretref",
  "rawresponse",
  "fullresponse",
  "responsebody",
  "organizationtree",
  "organizationid",
  "completeorganizationid",
  "email",
  "phone",
];

const FORBIDDEN_VALUE_PATTERNS = [
  /bearer\s+\S+/i,
  /authorization:\s*\S+/i,
  /cookie:\s*\S+/i,
  /secret:\/\//i,
  /https?:\/\/(?:localhost|127\.0\.0\.1|10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.|[^/\s]+\.internal)/i,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /(?:\+?86[-\s]?)?1[3-9]\d{9}/,
];

function hasObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function generatedAt(options: LooseRecord = {}) {
  return options.generatedAt || new Date().toISOString();
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeKey(key) {
  return String(key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function containsSensitiveEvidence(value) {
  if (Array.isArray(value)) {
    return value.some(containsSensitiveEvidence);
  }
  if (hasObject(value)) {
    return Object.entries(value).some(([key, nested]) => {
      const normalizedKey = normalizeKey(key);
      return FORBIDDEN_FIELD_NAME_PARTS.some((part) => normalizedKey.includes(part)) ||
        containsSensitiveEvidence(nested);
    });
  }
  if (typeof value === "string") {
    return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value));
  }
  return false;
}

function defaultHandoff(decision, alias?: string) {
  switch (decision) {
  case "ready-for-controlled-smoke-prep":
    return {
      alias: alias || "ready_for_controlled_smoke_prep",
      owner: "admin_operator",
      nextAction: "只进入受控 smoke 准备，继续使用私有环境阈值和脱敏 evidence 验证",
      minimumUnblockCondition: "Admin release decision、Admin readiness/source/mapping evidence 和 API diagnostics decision 均已检查且无 blocking alias",
    };
  case "blocked-by-admin-release-decision":
    return {
      alias: alias || "admin_release_decision_blocked",
      owner: "admin_operator",
      nextAction: "先解除 Admin release decision handoff 中的本地 blocker",
      minimumUnblockCondition: "Admin release decision 返回 ready-for-controlled-smoke 且 release_after_report",
    };
  case "blocked-by-admin-source-freshness":
    return {
      alias: alias || "source_connection_stale",
      owner: "admin_source_owner",
      nextAction: "检查 Admin-owned source connection status/freshness、source snapshot 和 OrgSyncBatch",
      minimumUnblockCondition: "source freshness/source snapshot/OrgSyncBatch/sourceVersion evidence 可判定且无 stale/unavailable/unknown blocker",
    };
  case "blocked-by-mapping-readiness":
    return {
      alias: alias || "mapping_readiness_blocked",
      owner: "admin_mapping_operator",
      nextAction: "维护一等 PlatformApiUserMapping.ApiUserId 和可信 mapping/lifecycle/source readiness",
      minimumUnblockCondition: "存在同 organizationId + adminSubject 的 confirmed ApiUserId，且不使用 display name、phone、email、legacy lineage 或 user properties 作为 runtime join key",
    };
  case "blocked-by-api-diagnostics":
    return {
      alias: alias || "api_diagnostics_blocked",
      owner: "api_diagnostics_owner",
      nextAction: "由 API owner 提供脱敏 diagnostics decision clear evidence",
      minimumUnblockCondition: "API diagnostics decision evidence 已检查且无 blocked/failed/stale/rejected/unknown alias",
    };
  case "not-checked":
    return {
      alias: alias || "controlled_smoke_preflight_evidence_not_checked",
      owner: "admin_operator",
      nextAction: "收集只读脱敏 Admin release decision、Admin readiness/source/mapping 和 API diagnostics evidence",
      minimumUnblockCondition: "required read-only evidence 已提供，且不含敏感字段、完整响应体或真实 organizationId",
    };
  default:
    return {
      alias: alias || "controlled_smoke_preflight_contract_blocked",
      owner: "admin_operator",
      nextAction: "删除敏感输入或等待 owner 提供稳定脱敏 alias/decision 后重跑",
      minimumUnblockCondition: "输入只包含脱敏 status、decision、alias、owner 和 minimum unblock condition",
    };
  }
}

function normalizeHandoffs(handoffs, fallbackDecision, aliases = []) {
  const fallback = defaultHandoff(fallbackDecision, aliases[0]);
  const source = Array.isArray(handoffs) && handoffs.length > 0 ? handoffs : [fallback];
  return source.map((handoff) => ({
    alias: handoff.alias || fallback.alias,
    owner: handoff.owner || fallback.owner,
    nextAction: handoff.nextAction || fallback.nextAction,
    minimumUnblockCondition: handoff.minimumUnblockCondition || handoff.condition || fallback.minimumUnblockCondition,
  })).filter((handoff) => handoff.alias && handoff.owner);
}

function minimumConditions(ownerHandoffs) {
  return ownerHandoffs.map((handoff) => ({
    alias: handoff.alias,
    owner: handoff.owner,
    condition: handoff.minimumUnblockCondition,
  }));
}

function localBlockerCategory(decision) {
  switch (decision) {
  case "ready-for-controlled-smoke-prep":
    return "none";
  case "blocked-by-admin-release-decision":
    return "admin_release_decision_blocked";
  case "blocked-by-admin-source-freshness":
    return "admin_source_freshness_blocked";
  case "blocked-by-mapping-readiness":
    return "admin_mapping_blocked";
  case "blocked-by-api-diagnostics":
    return "api_diagnostics_blocked";
  case "not-checked":
    return "local_evidence_not_checked";
  default:
    return "contract_or_redaction_blocked";
  }
}

function releaseFor(decision) {
  return decision === "ready-for-controlled-smoke-prep" ? "release_after_report" : "hold";
}

function statusFor(decision) {
  if (decision === "ready-for-controlled-smoke-prep") {
    return "ready";
  }
  if (decision === "not-checked") {
    return "not_checked";
  }
  return "blocked";
}

function doNotDispatchUntil(decision, aliases, minimumUnblockConditions) {
  if (decision === "ready-for-controlled-smoke-prep") {
    return "只可进入受控 smoke 准备；不得外派为真实 publish、gateway ingestion、authorization facts 或 full-success";
  }
  if (decision === "not-checked") {
    return "不要外派为 full-success；先收集 read-only 脱敏 Admin release/readiness/source/mapping 和 API diagnostics evidence";
  }
  const aliasText = aliases.length > 0 ? aliases.join("|") : decision;
  const conditions = minimumUnblockConditions.map((item) => item.condition).filter(Boolean);
  return `不要外派为 full-success；等待 ${aliasText} 的最小解除条件清除${conditions.length > 0 ? `：${conditions.join("；")}` : ""}`;
}

function buildResult(decision, reason, aliases = [], handoffs = [], options: LooseRecord = {}) {
  const normalizedAliases = unique(aliases);
  const ownerHandoffs = normalizeHandoffs(handoffs, decision, normalizedAliases);
  const minimumUnblockConditions = minimumConditions(ownerHandoffs);
  return {
    status: statusFor(decision),
    release: releaseFor(decision),
    localBlockerCategory: localBlockerCategory(decision),
    decision,
    reason,
    sourceAlias: options.sourceAlias || "gateway_projection_controlled_smoke_preflight",
    generatedAt: generatedAt(options),
    aliases: normalizedAliases,
    ownerHandoffs,
    minimumUnblockConditions,
    boundaries: BOUNDARIES,
    doNotDispatchUntil: doNotDispatchUntil(decision, normalizedAliases, minimumUnblockConditions),
  };
}

function aliasesFrom(value: LooseRecord = {}) {
  return Array.isArray(value.aliases) ? value.aliases.filter(Boolean) : [];
}

function firstAliasMatching(aliases, set) {
  return aliases.find((alias) => set.has(alias));
}

function isAdminReleaseReady(releaseDecision: LooseRecord = {}) {
  return releaseDecision.status === "ready" &&
    releaseDecision.release === "release_after_report" &&
    READY_ADMIN_RELEASE_DECISIONS.has(releaseDecision.decision);
}

function isApiDiagnosticsReady(apiDiagnostics: LooseRecord = {}) {
  const status = String(apiDiagnostics.status || "").toLowerCase();
  const decision = String(apiDiagnostics.decision || status || "").toLowerCase();
  return READY_API_STATUSES.has(status) && READY_API_DECISIONS.has(decision);
}

// 该 helper 只消费调用方提供的脱敏 owner evidence，并输出可复制 handoff；不得回显原始响应体。
function createGatewayProjectionControlledSmokePreflightHandoff(input: LooseRecord = {}, options: LooseRecord = {}) {
  if (containsSensitiveEvidence(input)) {
    return buildResult(
      "blocked-by-contract-or-redaction",
      "sensitive_or_raw_evidence_present",
      ["sanitization_failed"],
      [defaultHandoff("blocked-by-contract-or-redaction", "sanitization_failed")],
      options,
    );
  }

  const adminReleaseDecisionHandoff = input.adminReleaseDecisionHandoff;
  const adminReadinessSummary = input.adminReadinessSummary;
  const apiDiagnosticsDecision = input.apiDiagnosticsDecision;
  if (!adminReleaseDecisionHandoff || !adminReadinessSummary || !apiDiagnosticsDecision) {
    return buildResult(
      "not-checked",
      "controlled_smoke_preflight_required_evidence_not_checked",
      ["controlled_smoke_preflight_evidence_not_checked"],
      [defaultHandoff("not-checked")],
      options,
    );
  }

  const readinessAliases = aliasesFrom(adminReadinessSummary);
  const sourceAlias = firstAliasMatching(readinessAliases, SOURCE_FRESHNESS_ALIASES);
  if (sourceAlias) {
    return buildResult(
      "blocked-by-admin-source-freshness",
      "admin_source_freshness_blocked",
      [sourceAlias],
      adminReadinessSummary.handoffs,
      options,
    );
  }

  const mappingAlias = firstAliasMatching(readinessAliases, MAPPING_READINESS_ALIASES);
  if (mappingAlias) {
    return buildResult(
      "blocked-by-mapping-readiness",
      "admin_mapping_readiness_blocked",
      [mappingAlias],
      adminReadinessSummary.handoffs,
      options,
    );
  }

  if (adminReadinessSummary.status === "blocked" || readinessAliases.length > 0) {
    return buildResult(
      "blocked-by-contract-or-redaction",
      "admin_readiness_unknown_alias_blocked",
      readinessAliases.length > 0 ? readinessAliases : ["admin_readiness_blocked"],
      adminReadinessSummary.handoffs,
      options,
    );
  }

  if (!isApiDiagnosticsReady(apiDiagnosticsDecision)) {
    const aliases = aliasesFrom(apiDiagnosticsDecision);
    return buildResult(
      "blocked-by-api-diagnostics",
      "api_diagnostics_decision_blocked",
      aliases.length > 0 ? aliases : ["api_diagnostics_blocked"],
      apiDiagnosticsDecision.ownerHandoffs,
      options,
    );
  }

  if (!isAdminReleaseReady(adminReleaseDecisionHandoff)) {
    const aliases = aliasesFrom(adminReleaseDecisionHandoff);
    return buildResult(
      "blocked-by-admin-release-decision",
      "admin_release_decision_blocked",
      aliases.length > 0 ? aliases : ["admin_release_decision_blocked"],
      adminReleaseDecisionHandoff.ownerHandoffs,
      options,
    );
  }

  return buildResult(
    "ready-for-controlled-smoke-prep",
    "sanitized_owner_evidence_ready_for_controlled_smoke_prep",
    [],
    [defaultHandoff("ready-for-controlled-smoke-prep")],
    options,
  );
}

module.exports = {
  createGatewayProjectionControlledSmokePreflightHandoff,
};
