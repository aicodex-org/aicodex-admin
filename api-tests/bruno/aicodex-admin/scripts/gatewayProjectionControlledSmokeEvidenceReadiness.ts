const READY_RELEASE_ALIAS = "ready-for-controlled-smoke";
const READY_PREFLIGHT_ALIAS = "ready-for-controlled-smoke-prep";

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
  "controlled smoke evidence readiness 只允许进入受控 smoke evidence review",
  "该 readiness 不能外推为 API/Gateway/Insight 成功、生产就绪、真实 publish 成功、gateway ingestion 成功或 authorization facts 生效",
  "该 readiness 不是 controlled smoke 已通过，也不能写成 full-success",
  "不得查询 API/Insight/gateway store，不得写真实 fixture、真实 DB、publish、refresh、gateway ingestion、authorization facts、read model rebuild 或 mapping confirm",
  "display name、phone、email、legacy lineage 和 user properties 不能作为 runtime projection join key",
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

function isNegatedBoundary(text) {
  return /不得|不能|不是|不是真实|not\s+(?:real\s+)?(?:publish|full-success|full success|gateway ingestion|authorization facts|api success|gateway success|insight success|production ready)/i.test(text);
}

function fullSuccessFlagsFromText(text) {
  if (!text || isNegatedBoundary(text)) {
    return [];
  }
  const flags = [];
  if (/full[-\s]?success|controlled smoke success|production ready|production readiness|api success|gateway success|insight success|complete projection business success|authorization facts success|gateway ingestion success|real publish success/i.test(text)) {
    flags.push("full_success_overclaim");
  }
  return flags;
}

function redLineFlagsFromText(text) {
  if (!text || isNegatedBoundary(text)) {
    return [];
  }
  const flags = [];
  if (/(trigger|execute|run|perform|start|create|write|rebuild|refresh|publish|ingest|confirm)\b.*\b(real|fixture|db|database|publish|ingestion|authorization facts|read model|mapping)/i.test(text) ||
      /\b(real|fixture|db|database|publish|ingestion|authorization facts|read model|mapping)\b.*\b(trigger|execute|run|perform|start|create|write|rebuild|refresh|publish|ingest|confirm)\b/i.test(text)) {
    flags.push("real_environment_write_signal");
  }
  return flags;
}

function collectTextFlags(value, callback, key = "") {
  const normalizedKey = normalizeKey(key);
  if (["boundaries", "donotdispatchuntil", "minimumunblockcondition", "nextaction"].includes(normalizedKey)) {
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

function aliasesFrom(evidence: LooseRecord = {}) {
  const aliases = Array.isArray(evidence.aliases) ? evidence.aliases : [];
  return unique([
    evidence.alias,
    evidence.reason,
    evidence.reasonAlias,
    evidence.decision,
    ...aliases,
  ]);
}

function defaultHandoff(alias, owner = "admin_operator") {
  return {
    alias,
    owner,
    nextAction: owner === "api_diagnostics_owner"
      ? "由 API owner 提供只读脱敏 diagnostics readiness/release runbook evidence"
      : "补齐 Admin release decision、controlled smoke preflight、release runbook 的只读脱敏 evidence",
    minimumUnblockCondition: owner === "api_diagnostics_owner"
      ? "API diagnostics evidence 已检查且无 blocked/failed/stale/rejected/unknown alias"
      : "Admin evidence 已检查且 release/preflight/runbook 均为 ready，并且无 blocking alias",
  };
}

function sanitizeHandoff(handoff, fallbackAlias, fallbackOwner) {
  return {
    alias: handoff?.alias || fallbackAlias,
    owner: handoff?.owner || fallbackOwner,
    nextAction: handoff?.nextAction || handoff?.safeNextAction,
    minimumUnblockCondition: handoff?.minimumUnblockCondition || handoff?.condition,
  };
}

function handoffsFromEvidence(evidence, fallbackOwner = "admin_operator") {
  const aliases = aliasesFrom(evidence);
  const explicitHandoffs = Array.isArray(evidence?.ownerHandoffs) ? evidence.ownerHandoffs : [];
  const sanitized = explicitHandoffs.map((handoff) => sanitizeHandoff(handoff, aliases[0], fallbackOwner));
  const explicitAliases = new Set(sanitized.map((handoff) => handoff.alias).filter(Boolean));
  const aliasHandoffs = aliases
    .filter((alias) => !explicitAliases.has(alias))
    .map((alias) => defaultHandoff(alias, fallbackOwner));
  return [...sanitized, ...aliasHandoffs].filter((handoff) => handoff.alias || handoff.owner);
}

function defaultOwnerHandoffs(input: LooseRecord = {}, status) {
  const adminHandoffs = [
    ...handoffsFromEvidence(input.adminReleaseDecision, "admin_operator"),
    ...handoffsFromEvidence(input.controlledSmokePreflight, "admin_operator"),
    ...handoffsFromEvidence(input.controlledSmokeReleaseRunbook, "admin_operator"),
  ];
  const apiHandoffs = handoffsFromEvidence(input.apiDiagnostics, "api_diagnostics_owner");
  if (status === "missing-admin-preflight" && adminHandoffs.length === 0) {
    return [defaultHandoff("controlled_smoke_evidence_not_checked", "admin_operator")];
  }
  const handoffs = status === "missing-api-diagnostics" ? apiHandoffs : [...adminHandoffs, ...apiHandoffs];
  if (handoffs.length > 0) {
    return handoffs;
  }
  return [defaultHandoff(
    status === "missing-api-diagnostics" ? "api_diagnostics_evidence_missing" : "controlled_smoke_evidence_not_checked",
    status === "missing-api-diagnostics" ? "api_diagnostics_owner" : "admin_operator",
  )];
}

function minimumConditions(ownerHandoffs = []) {
  return ownerHandoffs.map((handoff) => ({
    alias: handoff.alias,
    owner: handoff.owner,
    condition: handoff.minimumUnblockCondition,
  })).filter((item) => item.alias || item.owner || item.condition);
}

function redactedEvidenceHints(input: LooseRecord = {}) {
  const hints = [
    input.adminReleaseDecision,
    input.controlledSmokePreflight,
    input.controlledSmokeReleaseRunbook,
    input.apiDiagnostics,
  ].map((evidence) => ({
    sourceAlias: evidence?.sourceAlias,
    status: evidence?.status,
    decision: evidence?.decision,
    reason: evidence?.reason,
    alias: aliasesFrom(evidence)[0],
    owner: evidence?.ownerHandoffs?.[0]?.owner,
    minimumUnblockCondition: evidence?.ownerHandoffs?.[0]?.minimumUnblockCondition,
  }));
  return hints.filter((hint) => hint.status || hint.decision || hint.reason || hint.alias || hint.sourceAlias);
}

function releaseFor(status) {
  return status === "ready-for-controlled-smoke-evidence-review" ? "release_after_report" : "hold";
}

function reasonFor(status) {
  switch (status) {
  case "ready-for-controlled-smoke-evidence-review":
    return "controlled_smoke_evidence_ready_for_review";
  case "missing-admin-preflight":
    return "controlled_smoke_admin_evidence_missing_or_blocked";
  case "missing-api-diagnostics":
    return "controlled_smoke_api_diagnostics_missing_or_blocked";
  case "redaction-required":
    return "controlled_smoke_evidence_redaction_required";
  case "red-line-blocked":
    return "controlled_smoke_evidence_red_line_blocked";
  case "overclaim-full-success":
    return "controlled_smoke_evidence_full_success_overclaim";
  default:
    return "controlled_smoke_evidence_not_checked";
  }
}

function nextActionsFor(status) {
  switch (status) {
  case "ready-for-controlled-smoke-evidence-review":
    return [
      "只进入受控 smoke evidence review，继续使用私有环境阈值和脱敏 evidence 判断",
      "回传时只写 status、reason、alias、owner、minimum unblock condition 和环境别名",
      "明确声明未证明 API/Gateway/Insight 成功、生产就绪、authorization facts 或 full-success",
    ];
  case "missing-api-diagnostics":
    return [
      "向 API diagnostics owner 收集只读脱敏 diagnostics readiness/release runbook evidence",
      "不要由 Admin 查询 API/Insight/Gateway 私有库或原始响应补算 diagnostics",
    ];
  case "redaction-required":
    return [
      "删除敏感字段、完整响应体、真实账号、私有 URL 或完整组织标识后重跑 readiness",
      "只保留脱敏 alias、status、decision、owner 和 minimum unblock condition",
    ];
  case "red-line-blocked":
    return [
      "移除真实 publish、gateway ingestion、authorization facts、fixture/DB 写入或 read model rebuild 信号",
      "重新收集只读脱敏 evidence，禁止触发真实环境写入",
    ];
  case "overclaim-full-success":
    return [
      "删除 full-success、生产就绪、API/Gateway/Insight 成功或 controlled smoke 已通过断言",
      "只把本结果作为受控 smoke evidence review 前置条件",
    ];
  default:
    return [
      "补齐 Admin release decision、controlled smoke preflight 和 release runbook 的只读脱敏 evidence",
      "按 owner handoff 解除 blocking alias 后重跑 readiness",
    ];
  }
}

function doNotDispatchUntil(status, missing = [], flags = []) {
  if (status === "ready-for-controlled-smoke-evidence-review") {
    return "只可进入受控 smoke evidence review；不得外派为真实 publish、gateway ingestion、authorization facts、API/Gateway/Insight 成功、生产就绪或 full-success";
  }
  const blockers = unique([...flags, ...missing]);
  return `不要外派为 full-success；等待 ${blockers.length > 0 ? blockers.join("|") : status} 清除`;
}

function buildResult(status, input, options: LooseRecord = {}, extra: LooseRecord = {}) {
  const ownerHandoffs = extra.ownerHandoffs || defaultOwnerHandoffs(input, status);
  const missingPrerequisites = extra.missingPrerequisites || [];
  const hardRedLineFlags = extra.hardRedLineFlags || [];
  return {
    status,
    release: releaseFor(status),
    reason: reasonFor(status),
    sourceAlias: options.sourceAlias || "gateway_projection_controlled_smoke_evidence_readiness",
    generatedAt: generatedAt(options),
    missingPrerequisites,
    redactionFlags: extra.redactionFlags || [],
    hardRedLineFlags,
    redactedEvidenceHints: redactedEvidenceHints(input),
    ownerHandoffs,
    minimumUnblockConditions: minimumConditions(ownerHandoffs),
    operatorNextActions: nextActionsFor(status),
    boundaries: BOUNDARIES,
    doNotDispatchUntil: doNotDispatchUntil(status, missingPrerequisites, hardRedLineFlags),
  };
}

function isAdminReleaseReady(evidence: LooseRecord = {}) {
  return evidence.status === "ready" &&
    evidence.release === "release_after_report" &&
    evidence.decision === READY_RELEASE_ALIAS;
}

function isPreflightReady(evidence: LooseRecord = {}) {
  return evidence.status === "ready" &&
    evidence.release === "release_after_report" &&
    evidence.decision === READY_PREFLIGHT_ALIAS;
}

function isRunbookReady(evidence: LooseRecord = {}) {
  return evidence.status === "ready" &&
    evidence.release === "release_after_report" &&
    (!Array.isArray(evidence.missingPrerequisites) || evidence.missingPrerequisites.length === 0) &&
    (!Array.isArray(evidence.hardRedLineFlags) || evidence.hardRedLineFlags.length === 0);
}

function isApiDiagnosticsReady(evidence: LooseRecord = {}) {
  const status = String(evidence.status || "").toLowerCase();
  const decision = String(evidence.decision || status || "").toLowerCase();
  return READY_API_STATUSES.has(status) && READY_API_DECISIONS.has(decision);
}

function adminMissingPrerequisites(input: LooseRecord = {}) {
  const missing = [];
  if (!input.adminReleaseDecision) {
    missing.push("admin_release_decision_missing");
  } else if (!isAdminReleaseReady(input.adminReleaseDecision)) {
    missing.push(`admin_release_decision_not_ready:${input.adminReleaseDecision.decision || input.adminReleaseDecision.status || "unknown"}`);
  }
  if (!input.controlledSmokePreflight) {
    missing.push("controlled_smoke_preflight_missing");
  } else if (!isPreflightReady(input.controlledSmokePreflight)) {
    missing.push(`controlled_smoke_preflight_not_ready:${input.controlledSmokePreflight.decision || input.controlledSmokePreflight.status || "unknown"}`);
  }
  if (!input.controlledSmokeReleaseRunbook) {
    missing.push("controlled_smoke_release_runbook_missing");
  } else if (!isRunbookReady(input.controlledSmokeReleaseRunbook)) {
    missing.push(`controlled_smoke_release_runbook_not_ready:${input.controlledSmokeReleaseRunbook.reason || input.controlledSmokeReleaseRunbook.status || "unknown"}`);
  }
  if (input.blockingAlias) {
    missing.push(`blocking_alias:${input.blockingAlias}`);
  }
  return missing;
}

function apiMissingPrerequisites(input: LooseRecord = {}) {
  if (!input.apiDiagnostics) {
    return ["api_diagnostics_missing"];
  }
  if (!isApiDiagnosticsReady(input.apiDiagnostics)) {
    return [`api_diagnostics_not_ready:${input.apiDiagnostics.decision || input.apiDiagnostics.status || "unknown"}`];
  }
  return [];
}

// 该 readiness gate 只消费调用方提供的脱敏 evidence bundle；任何敏感值、真实写入信号或 full-success 外推都先 fail closed。
function createGatewayProjectionControlledSmokeEvidenceReadiness(input: LooseRecord = {}, options: LooseRecord = {}) {
  if (containsSensitiveEvidence(input)) {
    return buildResult("redaction-required", input, options, {
      redactionFlags: ["sanitization_failed"],
    });
  }

  const overclaimFlags = unique(collectTextFlags(input, fullSuccessFlagsFromText));
  if (overclaimFlags.length > 0) {
    return buildResult("overclaim-full-success", input, options, {
      hardRedLineFlags: overclaimFlags,
    });
  }

  const redLineFlags = unique(collectTextFlags(input, redLineFlagsFromText));
  if (redLineFlags.length > 0) {
    return buildResult("red-line-blocked", input, options, {
      hardRedLineFlags: redLineFlags,
    });
  }

  const adminMissing = adminMissingPrerequisites(input);
  if (adminMissing.length > 0) {
    return buildResult("missing-admin-preflight", input, options, {
      missingPrerequisites: adminMissing,
    });
  }

  const apiMissing = apiMissingPrerequisites(input);
  if (apiMissing.length > 0) {
    return buildResult("missing-api-diagnostics", input, options, {
      missingPrerequisites: apiMissing,
    });
  }

  return buildResult("ready-for-controlled-smoke-evidence-review", input, options);
}

module.exports = {
  createGatewayProjectionControlledSmokeEvidenceReadiness,
};
