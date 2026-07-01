// @ts-nocheck
const READY_RESULT_EVIDENCE_STATUS = "passed";
const READY_REMEDIATION_STATUS = "ready";
const READY_TRIAGE_STATUS = "ready-for-operator-triage-handoff";

const KNOWN_RESULT_ALIASES = new Set([
  "wecom_source_controlled_smoke_result_passed",
  "wecom_source_controlled_smoke_result_passed_with_observations",
  "wecom_source_controlled_smoke_result_partial_handoff",
  "wecom_source_controlled_smoke_result_blocked",
  "wecom_source_controlled_smoke_result_needs_user_action",
]);

const SENSITIVE_FIELD_NAME_PARTS = [
  "account",
  "authorization",
  "bearer",
  "config",
  "cookie",
  "credential",
  "email",
  "endpoint",
  "fullorganization",
  "organizationid",
  "password",
  "phone",
  "privateurl",
  "raw",
  "responsebody",
  "secret",
  "sourcetenant",
  "tenant",
  "token",
];

const SAFE_TEXT_KEYS = new Set([
  "boundaries",
  "cannotinferboundaries",
  "donotdispatchuntil",
  "minimumunblockcondition",
  "minimumunblockconditions",
  "nextaction",
  "nextsteps",
  "operatoractions",
  "ownerhandofflimits",
]);

const CANNOT_INFER_BOUNDARIES = [
  "Admin WeCom source operator triage handoff 只证明本地脱敏 triage package 可交接",
  "该 handoff 不能外推为真实 WeCom 同步成功、组织树非空、Gateway/API/Insight 成功、authorization facts 生效或生产就绪",
  "该 handoff 不是 controlled smoke pass，也不能写成 full-success",
  "不得触发真实 WeCom 同步、真实 fixture/DB、synthetic audit/projection、Gateway ingestion、API/Insight/Gateway 读取、authorization facts、provider token、真实 gate 或密钥变更",
];

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  return value ? [value] : [];
}

function lowerCompact(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeAlias(value) {
  return String(value || "").trim().toLowerCase();
}

function includesSensitiveFieldName(key) {
  const compact = lowerCompact(key);
  return SENSITIVE_FIELD_NAME_PARTS.some((part) => compact.includes(part));
}

function containsSensitiveValue(value) {
  if (typeof value !== "string") {
    return false;
  }
  return /bearer\s+\S+/i.test(value) ||
    /authorization:\s*\S+/i.test(value) ||
    /cookie:\s*\S+/i.test(value) ||
    /secret:\/\//i.test(value) ||
    /https?:\/\/(?:localhost|127\.0\.0\.1|10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.|[^/\s]+\.internal|[^\s]+)/i.test(value) ||
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value) ||
    /(?:\+?86[-\s]?)?1[3-9]\d{9}/.test(value);
}

// 敏感扫描只返回分类信号，不把原始字段名或字段值带入 triage 输出。
function hasSensitiveEvidence(value) {
  if (!value || typeof value !== "object") {
    return containsSensitiveValue(value);
  }
  if (Array.isArray(value)) {
    return value.some(hasSensitiveEvidence);
  }
  return Object.entries(value).some(([key, nested]) => (
    includesSensitiveFieldName(key) || hasSensitiveEvidence(nested)
  ));
}

function collectText(value, output = [], key = "") {
  if (SAFE_TEXT_KEYS.has(lowerCompact(key))) {
    return output;
  }
  if (typeof value === "string") {
    output.push(value);
    return output;
  }
  if (!value || typeof value !== "object") {
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectText(item, output, key));
    return output;
  }
  Object.entries(value).forEach(([nestedKey, item]) => collectText(item, output, nestedKey));
  return output;
}

function hasNegatedBoundary(text, phrase) {
  const index = text.indexOf(phrase);
  if (index < 0) {
    return false;
  }
  const prefix = text.slice(Math.max(0, index - 40), index);
  return /(不是|不能|不得|不可|不要|不声明|未证明|not|cannot|can't|no)(?:\s|\S){0,12}$/i.test(prefix);
}

function collectOverclaimFlags(input = {}) {
  const text = collectText({
    operatorNote: input.operatorNote,
    claim: input.claim,
  }).join("\n").toLowerCase();
  const checks = [
    ["full-success", "full_success_overclaim"],
    ["full success", "full_success_overclaim"],
    ["production readiness", "production_readiness_overclaim"],
    ["production ready", "production_readiness_overclaim"],
    ["controlled smoke pass", "controlled_smoke_pass_overclaim"],
    ["controlled smoke success", "controlled_smoke_pass_overclaim"],
  ];
  return unique(checks
    .filter(([phrase]) => text.includes(phrase) && !hasNegatedBoundary(text, phrase))
    .map(([, flag]) => flag));
}

function collectRealSignalFlags(input = {}) {
  const text = collectText({
    operatorNote: input.operatorNote,
    claim: input.claim,
  }).join("\n");
  const checks = [
    [/real\s+wecom\s+sync|真实\s*wecom\s*同步/i, "real_sync_signal"],
    [/real\s+controlled\s+smoke|真实\s*controlled\s*smoke|真实\s*受控\s*smoke/i, "real_controlled_smoke_signal"],
    [/real\s+fixture|真实\s*fixture/i, "real_fixture_signal"],
    [/\bdb\s+(write|cleanup|delete|update)|database\s+(write|cleanup|delete|update)|真实\s*(db|数据库)/i, "real_db_write_signal"],
    [/synthetic\s+audit|synthetic\s+projection|audit\s+projection|projection\s+data/i, "synthetic_audit_projection_signal"],
    [/gateway\/api\/insight\s+success|gateway\/api\/insight\s+full[-\s]?success|gateway\s+success|api\s+success|insight\s+success/i, "downstream_success_overclaim"],
    [/authorization\s+facts/i, "authorization_facts_overclaim"],
    [/production-like|production\s+endpoint|真实\s*endpoint|provider\s+token/i, "production_like_signal"],
  ];
  return unique(checks
    .filter(([pattern]) => {
      const match = text.match(pattern);
      return match && !hasNegatedBoundary(text.toLowerCase(), match[0].toLowerCase());
    })
    .map(([, flag]) => flag));
}

function ownerLimit(alias, nextAction, minimumUnblockCondition, owner = "admin_operator") {
  return {
    alias,
    owner,
    nextAction,
    minimumUnblockCondition,
  };
}

function minimumConditions(ownerHandoffLimits = []) {
  return ownerHandoffLimits.map((item) => ({
    alias: item.alias,
    owner: item.owner,
    condition: item.minimumUnblockCondition,
  })).filter((item) => item.alias || item.owner || item.condition);
}

function releaseFor(status) {
  return status === READY_TRIAGE_STATUS ? "release_after_report" : "hold";
}

function triagePackageMetadata(options = {}) {
  return {
    sourceAlias: options.sourceAlias || "local-wecom-source-controlled-smoke-operator-triage-handoff",
    generatedAt: options.generatedAt || new Date().toISOString(),
    packageShape: "wecom-source-controlled-smoke-operator-triage-handoff/v1",
  };
}

function defaultOwnerLimits(status, alias = "wecom_source_controlled_smoke_operator_triage_handoff") {
  if (status === READY_TRIAGE_STATUS) {
    return [ownerLimit(
      alias,
      "复制脱敏 WeCom source triage package 给 operator 复核",
      "result evidence handoff 为 passed，operator remediation handoff 为 ready，且无 red-line signal"
    )];
  }
  return [ownerLimit(
    alias,
    "清除 stable blocker 后重跑 WeCom source operator triage handoff",
    "稳定 blocker/remediation alias 已清除，且输入仍为本地脱敏摘要"
  )];
}

function nextStepsFor(status) {
  if (status === READY_TRIAGE_STATUS) {
    return [
      "复制脱敏 WeCom source triage package 给 operator 复核",
      "只传播 status、stable alias、owner、最小解除条件、下一步和不能外推边界",
      "继续声明未证明真实 WeCom 同步成功、组织树非空、controlled smoke pass、full-success、生产就绪或 Gateway/API/Insight 成功",
    ];
  }
  if (status === "needs-user-action") {
    return [
      "补齐用户动作、missing prerequisite 或 approval alias 后重跑对应本地 WeCom source handoff",
      "用户动作未清除前不得把 triage package 标记为 ready",
    ];
  }
  if (status === "hard-red-line") {
    return [
      "删除真实 WeCom 同步、真实 fixture/DB、Gateway/API/Insight、authorization facts、生产就绪或 full-success 外推信号",
      "仅保留本地脱敏 alias、计数、owner 和最小解除条件后重跑 triage handoff",
    ];
  }
  return [
    "清除 stable blocker/remediation alias 后重跑 WeCom source operator triage handoff",
    "只收集本地脱敏 result evidence/remediation evidence，不补充真实 endpoint、token、fixture、DB 或完整响应体",
  ];
}

function doNotDispatchUntil(status, extra = {}) {
  if (status === READY_TRIAGE_STATUS) {
    return "只可交接本地脱敏 WeCom source operator triage package；不要外派为 controlled smoke pass、full-success、生产就绪、真实 WeCom 同步成功、组织树非空、Gateway/API/Insight 成功或 authorization facts 生效";
  }
  const blockers = unique([
    extra.blockerAlias,
    extra.remediationAlias,
    ...(extra.redLineFlags || []),
    ...(extra.missingPrerequisites || []),
  ]);
  return `不要外派为 full-success；等待 ${blockers.join("|") || status} 清除，并替换未知项为稳定 Admin WeCom source handoff alias`;
}

function safeOwnerLimitsFrom(summary = {}, fallbackStatus = "blocked", fallbackAlias = "wecom_source_operator_triage_blocked") {
  const limits = [
    ...toArray(summary.ownerHandoffLimits),
    ...toArray(summary.ownerHandoffs),
  ];
  if (limits.length > 0) {
    return limits.map((item) => ownerLimit(
      item.alias || summary.reasonAlias || fallbackAlias,
      item.nextAction || nextStepsFor(fallbackStatus)[0],
      item.minimumUnblockCondition || item.condition || "稳定 owner-scoped alias 已清除且无 red-line signal",
      item.owner || "admin_operator"
    ));
  }
  return defaultOwnerLimits(fallbackStatus, fallbackAlias);
}

function baseResult(status, input = {}, options = {}, overrides = {}) {
  const ownerHandoffLimits = overrides.ownerHandoffLimits || defaultOwnerLimits(status, overrides.blockerAlias);
  return {
    status,
    release: releaseFor(status),
    blockerAlias: overrides.blockerAlias || (status === READY_TRIAGE_STATUS ? "none" : "wecom_source_operator_triage_blocked"),
    remediationAlias: overrides.remediationAlias || (status === READY_TRIAGE_STATUS ? "wecom_source_operator_triage_package_ready" : "collect_sanitized_wecom_operator_triage_inputs"),
    resultAliases: unique(toArray(input.resultEvidenceHandoffSummary?.resultAliases).map(normalizeAlias)),
    resultCounts: input.resultEvidenceHandoffSummary?.resultCounts && typeof input.resultEvidenceHandoffSummary.resultCounts === "object"
      ? { ...input.resultEvidenceHandoffSummary.resultCounts }
      : {},
    remediationAliases: unique([
      input.operatorRemediationHandoffSummary?.reasonAlias,
      ...toArray(input.operatorRemediationHandoffSummary?.remediations).map((item) => item.alias || item),
      ...toArray(input.operatorRemediationHandoffSummary?.missingPrerequisites).map((item) => item.alias || item),
    ].map(normalizeAlias)),
    redactionCategory: input.resultEvidenceHandoffSummary?.redactionCategory || input.resultEvidenceHandoffSummary?.redactionSignal || "unknown",
    riskCategory: input.resultEvidenceHandoffSummary?.riskCategory || "unknown",
    nextSteps: unique(overrides.nextSteps || nextStepsFor(status)),
    ownerHandoffLimits,
    minimumUnblockConditions: minimumConditions(ownerHandoffLimits),
    redLineFlags: unique(overrides.redLineFlags),
    missingPrerequisites: unique(overrides.missingPrerequisites),
    cannotInferBoundaries: CANNOT_INFER_BOUNDARIES,
    triagePackageMetadata: triagePackageMetadata(options),
    doNotDispatchUntil: overrides.doNotDispatchUntil || doNotDispatchUntil(status, overrides),
  };
}

function unknownAlias(input = {}) {
  return toArray(input.resultEvidenceHandoffSummary?.resultAliases)
    .map(normalizeAlias)
    .find((alias) => !KNOWN_RESULT_ALIASES.has(alias));
}

function missingPrerequisites(input = {}) {
  const missing = [];
  if (!input.resultEvidenceHandoffSummary) {
    missing.push("resultEvidenceHandoffSummary");
  } else if (input.resultEvidenceHandoffSummary.status === "partial-handoff") {
    missing.push("resultEvidenceHandoffSummary:not_passed");
  }
  if (!input.operatorRemediationHandoffSummary) {
    missing.push("operatorRemediationHandoffSummary");
  }
  return missing;
}

function statusFromRemediation(summary = {}) {
  if (summary.status === "needs-user-action") {
    return "needs-user-action";
  }
  if (summary.status === "hard-red-line") {
    return "hard-red-line";
  }
  if (summary.status !== READY_REMEDIATION_STATUS) {
    return "blocked";
  }
  return READY_TRIAGE_STATUS;
}

function firstSummaryAlias(summary = {}, fallback) {
  return normalizeAlias(summary.reasonAlias || summary.blockerAlias || summary.status || fallback);
}

/**
 * 基于本地脱敏 result evidence/remediation evidence 生成 operator triage package。
 * 该 helper 不读取真实环境、不发网络请求、不回显敏感输入，只输出稳定 alias、owner 和下一步。
 */
function createWecomSourceControlledSmokeOperatorTriageHandoff(input = {}, options = {}) {
  if (hasSensitiveEvidence(input)) {
    return baseResult("blocked", {}, options, {
      blockerAlias: "sanitization_failed",
      remediationAlias: "remove_sensitive_wecom_operator_triage_evidence",
      nextSteps: [
        "移除 token、Cookie、私有 endpoint、真实账号、邮箱、手机号、完整组织树、完整响应体或 credential-like 字段",
        "用稳定 alias、计数摘要和 owner handoff limit 替代原始 evidence 后重跑",
      ],
      ownerHandoffLimits: [
        ownerLimit(
          "sanitization_failed",
          "替换疑似敏感 WeCom source operator triage evidence",
          "triage package 只保留脱敏 alias、状态、计数、owner 和最小解除条件"
        ),
      ],
    });
  }

  const overclaimFlags = collectOverclaimFlags(input);
  if (overclaimFlags.length > 0) {
    return baseResult("hard-red-line", input, options, {
      blockerAlias: "full_success_overclaim",
      remediationAlias: "remove_cross_owner_success_claim",
      redLineFlags: overclaimFlags,
    });
  }

  const realSignalFlags = collectRealSignalFlags(input);
  if (realSignalFlags.length > 0) {
    return baseResult("hard-red-line", input, options, {
      blockerAlias: "real_execution_signal",
      remediationAlias: "remove_real_wecom_operator_triage_signal",
      redLineFlags: realSignalFlags,
    });
  }

  const missing = missingPrerequisites(input);
  if (missing.length > 0) {
    return baseResult("blocked", input, options, {
      blockerAlias: "wecom_source_operator_triage_missing_or_not_ready",
      remediationAlias: "collect_sanitized_wecom_operator_triage_inputs",
      missingPrerequisites: missing,
    });
  }

  const unknown = unknownAlias(input);
  if (unknown) {
    return baseResult("blocked", input, options, {
      blockerAlias: "unknown_wecom_source_operator_triage_alias",
      remediationAlias: unknown,
      ownerHandoffLimits: [
        ownerLimit(
          "unknown_wecom_source_operator_triage_alias",
          "替换未知 WeCom source operator triage alias",
          "unknown alias 已替换为 spec/test 中定义的稳定 Admin WeCom source handoff alias"
        ),
      ],
    });
  }

  const resultEvidence = input.resultEvidenceHandoffSummary || {};
  if (resultEvidence.status !== READY_RESULT_EVIDENCE_STATUS) {
    return baseResult("blocked", input, options, {
      blockerAlias: firstSummaryAlias(resultEvidence, "wecom_source_result_evidence_not_passed"),
      remediationAlias: "reconcile_sanitized_wecom_result_evidence",
      ownerHandoffLimits: safeOwnerLimitsFrom(resultEvidence, "blocked", firstSummaryAlias(resultEvidence, "wecom_source_result_evidence_not_passed")),
    });
  }

  const remediation = input.operatorRemediationHandoffSummary || {};
  const status = statusFromRemediation(remediation);
  if (status !== READY_TRIAGE_STATUS) {
    return baseResult(status, input, options, {
      blockerAlias: firstSummaryAlias(remediation, `wecom_source_operator_triage_${status}`),
      remediationAlias: status === "needs-user-action" ? "collect_sanitized_wecom_operator_action" : "collect_sanitized_wecom_operator_triage_inputs",
      ownerHandoffLimits: safeOwnerLimitsFrom(remediation, status, firstSummaryAlias(remediation, `wecom_source_operator_triage_${status}`)),
      redLineFlags: toArray(remediation.redLineFlags).map((item) => normalizeAlias(item.alias || item)),
      nextSteps: nextStepsFor(status),
    });
  }

  return baseResult(READY_TRIAGE_STATUS, input, options);
}

module.exports = {
  createWecomSourceControlledSmokeOperatorTriageHandoff,
};
