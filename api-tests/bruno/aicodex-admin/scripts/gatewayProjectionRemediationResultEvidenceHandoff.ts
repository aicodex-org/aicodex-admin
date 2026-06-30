const NON_EXTRAPOLATION = [
  "remediation result evidence handoff 只证明 Admin owner 侧脱敏处理结果交接，不证明真实 publish",
  "该结果不能外推为 Gateway ingestion 成功、authorization facts 生效、API/Insight/Gateway 成功、生产就绪或 full-success",
  "empty subject 或未授权 subjectCount>=1 evidence 不能写成完整 projection 业务成功",
  "不得触发 publish、refresh、gateway ingestion、authorization facts、真实 fixture/DB 写入、read model rebuild 或 mapping confirm",
];

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
  "diagnosticsresponse",
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

const SAFE_CONTAINER_FIELD_NAMES = new Set([
  "fixtureauthorizationresult",
]);

const READY_STATUSES = new Set(["cleared", "confirmed", "authorized", "ready", "ok"]);

const KNOWN_ALIASES = new Set([
  "mapping_remediation_cleared",
  "mapping_confirmed_api_user_id",
  "mapping_status_trusted",
  "lifecycle_readiness_confirmed",
  "mapping_remediation_not_cleared",
  "mapping_user_authorization_required",
  "source_freshness_remediation_cleared",
  "source_snapshot_fresh",
  "org_sync_batch_fresh",
  "source_version_freshness_confirmed",
  "source_freshness_remediation_not_cleared",
  "deploy_runtime_shape_confirmed",
  "current_observability_shape_confirmed",
  "deploy_runtime_shape_not_confirmed",
  "fixture_authorized",
  "subject_count_ge_1_authorized",
  "active_fixture_authorized",
  "tombstone_fixture_authorized",
  "fixture_authorization_required",
  "subject_count_ge_1_not_authorized",
  "controlled_smoke_evidence_prerequisites_clear",
  "controlled_smoke_evidence_ready_for_review",
  "api_diagnostics_clear",
  "controlled_smoke_evidence_not_cleared",
  "api_diagnostics_missing",
  "sanitization_failed",
  "real_environment_write_signal",
  "full_success_overclaim",
]);

function hasObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function normalizeKey(key) {
  return String(key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function toAlias(value) {
  return String(value || "").trim();
}

function aliasesFrom(value: LooseRecord = {}) {
  if (!hasObject(value)) {
    return [];
  }
  return unique([
    value.alias,
    value.reasonAlias,
    ...(Array.isArray(value.aliases) ? value.aliases : []),
    ...(Array.isArray(value.evidenceAliases) ? value.evidenceAliases : []),
    ...(Array.isArray(value.blockingAliases) ? value.blockingAliases : []),
  ].map(toAlias));
}

function containsSensitiveEvidence(value) {
  if (Array.isArray(value)) {
    return value.some(containsSensitiveEvidence);
  }
  if (hasObject(value)) {
    return Object.entries(value).some(([key, nested]) => {
      const normalizedKey = normalizeKey(key);
      return (!SAFE_CONTAINER_FIELD_NAMES.has(normalizedKey) &&
          FORBIDDEN_FIELD_NAME_PARTS.some((part) => normalizedKey.includes(part))) ||
        containsSensitiveEvidence(nested);
    });
  }
  if (typeof value === "string") {
    return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value));
  }
  return false;
}

function isNegatedBoundary(text) {
  return /不得|不能|不是|不是真实|not\s+(?:real\s+)?(?:publish|full-success|full success|gateway ingestion|authorization facts|api success|gateway success|insight success|production ready)/i.test(text);
}

function fullSuccessFlagsFromText(text) {
  if (!text || isNegatedBoundary(text)) {
    return [];
  }
  return /full[-\s]?success|controlled smoke success|production ready|production readiness|api success|gateway success|insight success|complete projection business success|authorization facts success|gateway ingestion success|real publish success/i.test(text)
    ? ["full_success_overclaim"]
    : [];
}

function redLineFlagsFromText(text) {
  if (!text || isNegatedBoundary(text)) {
    return [];
  }
  return (/(trigger|execute|run|perform|start|create|write|rebuild|refresh|publish|ingest|confirm)\b.*\b(real|fixture|db|database|publish|ingestion|authorization facts|read model|mapping)/i.test(text) ||
      /\b(real|fixture|db|database|publish|ingestion|authorization facts|read model|mapping)\b.*\b(trigger|execute|run|perform|start|create|write|rebuild|refresh|publish|ingest|confirm)\b/i.test(text))
    ? ["real_environment_write_signal"]
    : [];
}

function collectTextFlags(value, callback, key = "") {
  const normalizedKey = normalizeKey(key);
  if (["donotdispatchuntil", "minimumunblockcondition", "minimumunblockconditions", "nextsafeaction", "nonextrapolation"].includes(normalizedKey)) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectTextFlags(item, callback, key));
  }
  if (hasObject(value)) {
    return Object.entries(value).flatMap(([nestedKey, nested]) => collectTextFlags(nested, callback, nestedKey));
  }
  if (typeof value !== "string") {
    return [];
  }
  return callback(value);
}

function statusIsReady(value: LooseRecord = {}) {
  return READY_STATUSES.has(String(value.status || "").toLowerCase());
}

function countsSubjectAuthorized(value: LooseRecord = {}) {
  const count = Number(value.counts?.subjectCount ?? value.subjectCount ?? 0);
  return Number.isFinite(count) && count >= 1;
}

function ownerHandoff(alias, owner, nextAction, condition) {
  return {
    alias,
    owner,
    nextAction,
    minimumUnblockCondition: condition,
  };
}

function condition(alias, owner, text) {
  return {
    alias,
    owner,
    condition: text,
  };
}

function blockerForAlias(alias) {
  switch (alias) {
  case "mapping_remediation_not_cleared":
  case "mapping_user_authorization_required":
    return {
      alias,
      owner: "admin_mapping_operator",
      nextAction: "补齐一等 PlatformApiUserMapping.ApiUserId、可信 mapping status 和 lifecycle readiness 的脱敏结果 alias",
      condition: "mapping remediation 已解除，存在 confirmed PlatformApiUserMapping.ApiUserId，且 active subject 的 mapping/lifecycle 状态可信",
    };
  case "source_freshness_remediation_not_cleared":
    return {
      alias,
      owner: "admin_source_owner",
      nextAction: "补齐 Admin-owned source freshness、source snapshot、OrgSyncBatch 或 sourceVersion/freshness result alias",
      condition: "source freshness remediation 已解除，Admin source snapshot、OrgSyncBatch 或 sourceVersion/freshness evidence 可判定且新鲜",
    };
  case "deploy_runtime_shape_not_confirmed":
    return {
      alias,
      owner: "admin_deploy_owner",
      nextAction: "只读确认当前 Admin runtime/observability shape 后重跑 result evidence handoff",
      condition: "deploy/runtime shape 已确认，且当前运行包包含 remediation result evidence handoff 所需 shape",
    };
  case "fixture_authorization_required":
  case "subject_count_ge_1_not_authorized":
    return {
      alias: "fixture_authorization_required",
      owner: "fixture_owner",
      nextAction: "取得受控 fixture 或 subjectCount>=1 授权 evidence 后，仅用脱敏 counts/alias 重跑",
      condition: "存在已授权 controlled active/tombstone fixture 或 subjectCount>=1 的脱敏证据，且不得把 empty subject 写成业务成功",
    };
  case "api_diagnostics_missing":
    return {
      alias,
      owner: "api_diagnostics_owner",
      nextAction: "由 API diagnostics owner 提供脱敏 diagnostics clear/result evidence",
      condition: "API diagnostics evidence 已检查且无 blocked/failed/stale/rejected/unknown alias",
    };
  case "controlled_smoke_evidence_not_cleared":
    return {
      alias,
      owner: "admin_operator",
      nextAction: "补齐 release decision、preflight、runbook 和 controlled smoke 脱敏 evidence 结果",
      condition: "controlled smoke evidence prerequisites 已脱敏检查且无 blocking alias",
    };
  default:
    return {
      alias,
      owner: "admin_operator",
      nextAction: "回到上一轮 operator remediation handoff 或 owner result evidence，替换为稳定 Admin owner result alias",
      condition: "未知 result alias 被替换为稳定 Admin owner result alias，且 owner/minimum unblock condition 已明确",
    };
  }
}

function buildBlockedResult(reason, blockers, evidenceAliases, options: LooseRecord = {}) {
  const uniqueBlockers = unique(blockers.map((item) => item.alias)).map((alias) => blockerForAlias(alias));
  return {
    status: "blocked",
    reason,
    sourceAlias: options.sourceAlias || "gateway_projection_remediation_result_evidence_handoff",
    evidenceAliases,
    ownerHandoffs: uniqueBlockers.map((item) => ownerHandoff(item.alias, item.owner, item.nextAction, item.condition)),
    minimumUnblockConditions: uniqueBlockers.map((item) => condition(item.alias, item.owner, item.condition)),
    nextSafeAction: uniqueBlockers.map((item) => item.nextAction).join("；") || "继续收集只读脱敏 remediation result evidence",
    doNotDispatchUntil: `不要外派为 full-success；等待 ${uniqueBlockers.map((item) => item.alias).join("|") || reason} 的最小解除条件清除，且不得触发 publish、refresh、gateway ingestion、authorization facts 或真实 fixture/DB 写入；未知项必须替换为稳定 Admin owner result alias`,
    nonExtrapolation: NON_EXTRAPOLATION,
  };
}

function buildFailClosed(status, reason, options: LooseRecord = {}) {
  return {
    status,
    reason,
    sourceAlias: options.sourceAlias || "gateway_projection_remediation_result_evidence_handoff",
    evidenceAliases: [reason],
    ownerHandoffs: [],
    minimumUnblockConditions: [],
    nextSafeAction: "blocked；先删除敏感值、真实写入信号或 full-success 外推，再重新收集只读脱敏 result evidence",
    doNotDispatchUntil: `不要外派；${reason} 清除前不得进入 controlled smoke evidence review、preflight、publish、gateway ingestion、authorization facts 或 full-success 判断`,
    nonExtrapolation: NON_EXTRAPOLATION,
  };
}

function buildReadyResult(evidenceAliases, options: LooseRecord = {}) {
  return {
    status: "ready-for-controlled-smoke-evidence-review",
    reason: "remediation_result_evidence_ready",
    sourceAlias: options.sourceAlias || "gateway_projection_remediation_result_evidence_handoff",
    evidenceAliases,
    ownerHandoffs: [],
    minimumUnblockConditions: [],
    nextSafeAction: "只允许进入下一轮 controlled smoke evidence review 或 preflight；继续保持只读脱敏证据边界",
    doNotDispatchUntil: "即使 result evidence ready，也不要外派为 full-success、真实 publish、gateway ingestion、authorization facts、API/Gateway/Insight 成功或生产就绪",
    nonExtrapolation: NON_EXTRAPOLATION,
  };
}

function evaluateMapping(input) {
  const result = input.mappingRemediationResult || {};
  const aliases = aliasesFrom(result);
  if (String(result.status || "").toLowerCase() === "requires-user-authorization" || aliases.includes("mapping_user_authorization_required")) {
    return "mapping_user_authorization_required";
  }
  const clear = statusIsReady(result) &&
    aliases.includes("mapping_remediation_cleared") &&
    aliases.includes("mapping_confirmed_api_user_id") &&
    aliases.includes("mapping_status_trusted") &&
    aliases.includes("lifecycle_readiness_confirmed");
  return clear ? "" : "mapping_remediation_not_cleared";
}

function evaluateSource(input) {
  const result = input.sourceFreshnessRemediationResult || {};
  const aliases = aliasesFrom(result);
  const clear = statusIsReady(result) &&
    aliases.includes("source_freshness_remediation_cleared") &&
    (aliases.includes("source_snapshot_fresh") ||
      aliases.includes("org_sync_batch_fresh") ||
      aliases.includes("source_version_freshness_confirmed"));
  return clear ? "" : "source_freshness_remediation_not_cleared";
}

function evaluateDeploy(input) {
  const result = input.deployRuntimeResult || {};
  const aliases = aliasesFrom(result);
  const clear = statusIsReady(result) &&
    (aliases.includes("deploy_runtime_shape_confirmed") ||
      aliases.includes("current_observability_shape_confirmed"));
  return clear ? "" : "deploy_runtime_shape_not_confirmed";
}

function evaluateFixture(input) {
  const result = input.fixtureAuthorizationResult || {};
  const aliases = aliasesFrom(result);
  const clear = statusIsReady(result) &&
    aliases.includes("fixture_authorized") &&
    (aliases.includes("subject_count_ge_1_authorized") || countsSubjectAuthorized(result));
  return clear ? "" : "fixture_authorization_required";
}

function evaluateControlledSmoke(input) {
  const result = input.controlledSmokeEvidenceResult || {};
  const aliases = aliasesFrom(result);
  const blockers = [];
  if (aliases.includes("controlled_smoke_evidence_not_cleared")) {
    blockers.push("controlled_smoke_evidence_not_cleared");
  }
  if (aliases.includes("api_diagnostics_missing")) {
    blockers.push("api_diagnostics_missing");
  }
  if (blockers.length > 0) {
    return blockers;
  }
  const clear = statusIsReady(result) &&
    aliases.includes("controlled_smoke_evidence_prerequisites_clear") &&
    aliases.includes("api_diagnostics_clear");
  return clear ? [] : ["controlled_smoke_evidence_not_cleared"];
}

function collectEvidenceAliases(input: LooseRecord = {}) {
  return unique([
    ...aliasesFrom(input.mappingRemediationResult),
    ...aliasesFrom(input.sourceFreshnessRemediationResult),
    ...aliasesFrom(input.deployRuntimeResult),
    ...aliasesFrom(input.fixtureAuthorizationResult),
    ...aliasesFrom(input.controlledSmokeEvidenceResult),
    ...(Array.isArray(input.resultAliases) ? input.resultAliases.map(toAlias) : []),
  ]);
}

// 该 wrapper 只消费脱敏 remediation result alias/count/status，用于决定下一步 review 是否可进入。
function createGatewayProjectionRemediationResultEvidenceHandoff(input: LooseRecord = {}, options: LooseRecord = {}) {
  if (containsSensitiveEvidence(input)) {
    return buildFailClosed("redaction-required", "sanitization_failed", options);
  }

  const overclaimFlags = unique(collectTextFlags(input, fullSuccessFlagsFromText));
  if (overclaimFlags.length > 0) {
    return buildFailClosed("overclaim-full-success", "full_success_overclaim", options);
  }

  const redLineFlags = unique(collectTextFlags(input, redLineFlagsFromText));
  if (redLineFlags.length > 0) {
    return buildFailClosed("red-line-blocked", "real_environment_write_signal", options);
  }

  const evidenceAliases = collectEvidenceAliases(input);
  const unknownAliases = evidenceAliases.filter((alias) => alias && !KNOWN_ALIASES.has(alias));
  const blockers = unique([
    evaluateMapping(input),
    evaluateSource(input),
    evaluateDeploy(input),
    evaluateFixture(input),
    ...evaluateControlledSmoke(input),
    ...(unknownAliases.length > 0 ? unknownAliases : []),
  ]).filter(Boolean).map((alias) => ({ alias }));

  if (blockers.length > 0) {
    const reason = unknownAliases.length > 0 ? "unknown_remediation_result_alias" : blockers[0].alias;
    return buildBlockedResult(reason, blockers, evidenceAliases, options);
  }

  return buildReadyResult(evidenceAliases, options);
}

module.exports = {
  createGatewayProjectionRemediationResultEvidenceHandoff,
};
