const READY_RELEASE_ALIAS = "ready-for-controlled-smoke";
const READY_PREFLIGHT_ALIAS = "ready-for-controlled-smoke-prep";

const BOUNDARIES = [
  "controlled smoke release runbook 只允许进入受控 smoke 准备",
  "该 runbook 不是真实 publish 成功、gateway ingestion 成功或 authorization facts 生效",
  "该 runbook 不是完整 projection 业务成功，也不能写成 full-success",
  "不得查询 API/Insight/gateway store，不得写真实 fixture、真实 DB、publish、refresh、read model rebuild 或 mapping confirm",
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
  return /不得|不能|不是|不是真实|not\s+(?:real\s+)?(?:publish|full-success|full success|gateway ingestion|authorization facts)/i.test(text);
}

function redLineFlagsFromText(text) {
  if (!text || isNegatedBoundary(text)) {
    return [];
  }
  const flags = [];
  if (/full[-\s]?success|complete projection business success|authorization facts success|gateway ingestion success/i.test(text)) {
    flags.push("full_success_overclaim");
  }
  if (/(trigger|execute|run|perform|start|create|write|rebuild|refresh|publish|ingest|confirm)\b.*\b(real|fixture|db|database|publish|ingestion|authorization facts|read model|mapping)/i.test(text) ||
      /\b(real|fixture|db|database|publish|ingestion|authorization facts|read model|mapping)\b.*\b(trigger|execute|run|perform|start|create|write|rebuild|refresh|publish|ingest|confirm)\b/i.test(text)) {
    flags.push("real_environment_write_signal");
  }
  return flags;
}

function collectRedLineFlags(value, key = "") {
  const normalizedKey = normalizeKey(key);
  if (["boundaries", "donotdispatchuntil", "minimumunblockcondition", "nextaction"].includes(normalizedKey)) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectRedLineFlags(item, key));
  }
  if (hasObject(value)) {
    return Object.entries(value).flatMap(([nestedKey, nested]) => collectRedLineFlags(nested, nestedKey));
  }
  if (typeof value !== "string") {
    return [];
  }
  return redLineFlagsFromText(value);
}

function handoffHint(handoff: LooseRecord = {}, fallbackAlias) {
  const ownerHandoff = Array.isArray(handoff.ownerHandoffs) ? handoff.ownerHandoffs[0] : undefined;
  return {
    sourceAlias: handoff.sourceAlias,
    status: handoff.status,
    decision: handoff.decision,
    alias: fallbackAlias || handoff.alias || (Array.isArray(handoff.aliases) ? handoff.aliases[0] : undefined),
    owner: ownerHandoff?.owner,
    minimumUnblockCondition: ownerHandoff?.minimumUnblockCondition,
  };
}

function redactedEvidenceHints(input: LooseRecord = {}) {
  const evidenceHints = input.evidenceSummary?.evidenceHints;
  const hints = Array.isArray(evidenceHints) ? evidenceHints : [];
  return [
    handoffHint(input.releaseDecisionHandoff, input.releaseDecisionAlias),
    handoffHint(input.controlledSmokePreflightHandoff, input.controlledSmokePreflightAlias),
    ...hints.map((hint) => ({
      sourceAlias: hint.sourceAlias,
      status: hint.status,
      decision: hint.decision,
      alias: hint.alias,
      owner: hint.owner,
      minimumUnblockCondition: hint.minimumUnblockCondition,
    })),
  ].filter((hint) => hint.status || hint.decision || hint.alias || hint.sourceAlias);
}

function defaultOwnerHandoffs(input: LooseRecord = {}) {
  const releaseHandoffs = Array.isArray(input.releaseDecisionHandoff?.ownerHandoffs)
    ? input.releaseDecisionHandoff.ownerHandoffs
    : [];
  const preflightHandoffs = Array.isArray(input.controlledSmokePreflightHandoff?.ownerHandoffs)
    ? input.controlledSmokePreflightHandoff.ownerHandoffs
    : [];
  const handoffs = [...releaseHandoffs, ...preflightHandoffs].map((handoff) => ({
    alias: handoff.alias,
    owner: handoff.owner,
    nextAction: handoff.nextAction,
    minimumUnblockCondition: handoff.minimumUnblockCondition || handoff.condition,
  })).filter((handoff) => handoff.alias || handoff.owner);

  return handoffs.length > 0 ? handoffs : [{
    alias: "controlled_smoke_release_runbook_evidence_missing",
    owner: "admin_operator",
    nextAction: "补齐只读脱敏 release decision、controlled smoke preflight 和 evidence 摘要",
    minimumUnblockCondition: "required sanitized release/preflight evidence 已提供且无 red-line signal",
  }];
}

function minimumConditions(ownerHandoffs = []) {
  return ownerHandoffs.map((handoff) => ({
    alias: handoff.alias,
    owner: handoff.owner,
    condition: handoff.minimumUnblockCondition,
  })).filter((item) => item.alias || item.owner || item.condition);
}

function doNotDispatchUntil(status, flags = [], missing = []) {
  if (status === "ready") {
    return "只可进入受控 smoke 准备；不得外派为真实 publish、gateway ingestion、authorization facts 或 full-success";
  }
  const blockers = unique([...flags, ...missing]);
  return `不要外派为 full-success；等待 ${blockers.length > 0 ? blockers.join("|") : "controlled_smoke_release_runbook_blocked"} 清除`;
}

function buildResult(status, reason, input, options: LooseRecord = {}, extra: LooseRecord = {}) {
  const ownerHandoffs = defaultOwnerHandoffs(input);
  return {
    status,
    release: status === "ready" ? "release_after_report" : "hold",
    reason,
    sourceAlias: options.sourceAlias || input.evidenceSummary?.sourceAlias || "gateway_projection_controlled_smoke_release_runbook",
    generatedAt: generatedAt(options),
    releaseDecisionAlias: input.releaseDecisionAlias,
    controlledSmokePreflightAlias: input.controlledSmokePreflightAlias,
    operatorNextActions: extra.operatorNextActions || [],
    missingPrerequisites: extra.missingPrerequisites || [],
    hardRedLineFlags: extra.hardRedLineFlags || [],
    redactedEvidenceHints: redactedEvidenceHints(input),
    ownerHandoffs,
    minimumUnblockConditions: minimumConditions(ownerHandoffs),
    boundaries: BOUNDARIES,
    doNotDispatchUntil: doNotDispatchUntil(status, extra.hardRedLineFlags, extra.missingPrerequisites),
  };
}

function missingPrerequisites(input: LooseRecord = {}) {
  const missing = [];
  if (!input.releaseDecisionAlias) {
    missing.push("release_decision_alias_missing");
  }
  if (!input.controlledSmokePreflightAlias) {
    missing.push("controlled_smoke_preflight_alias_missing");
  }
  if (!input.releaseDecisionHandoff) {
    missing.push("release_decision_handoff_missing");
  }
  if (!input.controlledSmokePreflightHandoff) {
    missing.push("controlled_smoke_preflight_handoff_missing");
  }
  if (!input.evidenceSummary) {
    missing.push("sanitized_evidence_summary_missing");
  }
  return missing;
}

function blockingAliasPrerequisites(input: LooseRecord = {}) {
  const missing = [];
  if (input.releaseDecisionAlias && input.releaseDecisionAlias !== READY_RELEASE_ALIAS) {
    missing.push(`release_decision_not_ready:${input.releaseDecisionAlias}`);
  }
  if (input.controlledSmokePreflightAlias && input.controlledSmokePreflightAlias !== READY_PREFLIGHT_ALIAS) {
    missing.push(`controlled_smoke_preflight_not_ready:${input.controlledSmokePreflightAlias}`);
  }
  if (input.releaseDecisionHandoff?.status && input.releaseDecisionHandoff.status !== "ready") {
    missing.push(`release_decision_status_${input.releaseDecisionHandoff.status}`);
  }
  if (input.controlledSmokePreflightHandoff?.status && input.controlledSmokePreflightHandoff.status !== "ready") {
    missing.push(`controlled_smoke_preflight_status_${input.controlledSmokePreflightHandoff.status}`);
  }
  return missing;
}

// 该 runbook 只汇总调用方提供的脱敏 evidence；任何敏感字段、真实写入信号或 full-success 外推都必须先 fail closed。
function createGatewayProjectionControlledSmokeReleaseRunbook(input: LooseRecord = {}, options: LooseRecord = {}) {
  const hardRedLineFlags = unique([
    ...(containsSensitiveEvidence(input) ? ["sanitization_failed"] : []),
    ...collectRedLineFlags(input),
  ]);
  if (hardRedLineFlags.length > 0) {
    return buildResult("blocked", "controlled_smoke_release_runbook_red_line_blocked", input, options, {
      hardRedLineFlags,
      operatorNextActions: [
        "删除敏感字段、真实写入信号或 full-success 外推后，重新收集只读脱敏 evidence",
        "不要触发 publish、gateway ingestion、authorization facts、真实 fixture、DB 写入或 read model rebuild",
      ],
    });
  }

  const missing = missingPrerequisites(input);
  if (missing.length > 0) {
    return buildResult("blocked", "controlled_smoke_release_runbook_prerequisite_missing", input, options, {
      missingPrerequisites: missing,
      operatorNextActions: [
        "只读脱敏收集 release decision handoff、controlled smoke preflight handoff 和 evidence 摘要",
        "补齐 release decision alias 与 controlled smoke preflight alias 后重跑 runbook",
      ],
    });
  }

  const blocking = blockingAliasPrerequisites(input);
  if (blocking.length > 0) {
    return buildResult("blocked", "controlled_smoke_release_runbook_blocking_alias", input, options, {
      missingPrerequisites: blocking,
      operatorNextActions: [
        "按 owner handoff 解除 release/preflight blocker",
        "只在 blocker 清除后重新生成脱敏 runbook 摘要",
      ],
    });
  }

  return buildResult("ready", "controlled_smoke_release_runbook_ready", input, options, {
    operatorNextActions: [
      "仅进入受控 smoke 准备，继续使用私有环境阈值和脱敏 evidence 验证",
      "回传时只写 status、reason、alias、owner、minimum unblock condition 和环境别名",
      "明确声明未触发真实 publish、gateway ingestion、authorization facts、fixture/DB 写入或 full-success",
    ],
  });
}

module.exports = {
  createGatewayProjectionControlledSmokeReleaseRunbook,
};
