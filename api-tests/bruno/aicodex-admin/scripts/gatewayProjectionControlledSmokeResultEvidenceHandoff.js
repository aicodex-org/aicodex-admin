const READY_EXECUTION_STATUS = "ready-for-controlled-smoke-execution";
const READY_RESULT_STATUS = "ready-for-result-evidence-handoff";

const READY_RESULT_STATUSES = new Set([
  "passed",
  "passed-with-observations",
  "ready-for-handoff",
]);

const KNOWN_RESULT_ALIASES = new Set([
  "controlled_smoke_result_ready_for_handoff",
  "controlled_smoke_result_passed",
  "controlled_smoke_result_passed_with_observations",
  "controlled_smoke_result_failed",
  "controlled_smoke_result_partial",
  "controlled_smoke_result_missing",
  "controlled_smoke_result_blocked",
]);

const SENSITIVE_FIELD_NAME_PARTS = [
  "account",
  "authorization",
  "config",
  "cookie",
  "credential",
  "email",
  "endpoint",
  "fullorganization",
  "organizationid",
  "password",
  "phone",
  "raw",
  "responsebody",
  "secret",
  "tenant",
  "token",
];

const CANNOT_INFER_BOUNDARIES = [
  "Admin controlled smoke result evidence handoff 只证明本地脱敏执行结果材料可交接",
  "该 handoff 不能外推为真实 publish、Gateway ingestion、API/Gateway/Insight 成功、authorization facts 生效或 production readiness",
  "该 handoff 不是 controlled smoke pass，也不能写成 full-success",
  "不得触发真实 endpoint、publish、Gateway ingestion、fixture/DB 写入、真实 controlled smoke、gate 或密钥变更",
];

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
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

function includesSensitiveFieldName(key) {
  const compact = lowerCompact(key);
  return SENSITIVE_FIELD_NAME_PARTS.some((part) => compact.includes(part));
}

function containsSensitiveValue(value) {
  if (typeof value !== "string") {
    return false;
  }
  return /https?:\/\/[^\s]+/i.test(value) ||
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value) ||
    /\b(?:\+?\d[\d -]{7,}\d)\b/.test(value);
}

// 敏感扫描只返回布尔值，避免把原始字段名或字段值带入 handoff 输出。
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

function collectText(value, output = []) {
  if (typeof value === "string") {
    output.push(value);
    return output;
  }
  if (!value || typeof value !== "object") {
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectText(item, output));
    return output;
  }
  Object.values(value).forEach((item) => collectText(item, output));
  return output;
}

function hasNegatedBoundary(text, phrase) {
  const index = text.indexOf(phrase);
  if (index < 0) {
    return false;
  }
  const prefix = text.slice(Math.max(0, index - 20), index);
  return /(不是|不能|不得|不可|not|cannot|can't|no)\s*$/i.test(prefix);
}

// 跨 owner 成功外推只从 operator 可读文本提取，避免误判结构化脱敏计数。
function collectOverclaimFlags(input) {
  const text = collectText({
    operatorNote: input.operatorNote,
    resultSummary: input.resultSummary,
    claim: input.claim,
  }).join("\n").toLowerCase();
  const flags = [];
  const checks = [
    ["full-success", "full_success_overclaim"],
    ["production readiness", "production_readiness_overclaim"],
    ["gateway allow", "gateway_success_overclaim"],
    ["api authorization report", "api_success_overclaim"],
    ["insight success", "insight_success_overclaim"],
    ["gateway ingestion", "gateway_ingestion_overclaim"],
    ["authorization facts", "authorization_facts_overclaim"],
    ["controlled smoke pass", "controlled_smoke_pass_overclaim"],
    ["controlled smoke success", "controlled_smoke_pass_overclaim"],
  ];
  checks.forEach(([phrase, flag]) => {
    if (text.includes(phrase) && !hasNegatedBoundary(text, phrase)) {
      flags.push(flag);
    }
  });
  return unique(flags);
}

// 真实执行信号是硬红线；本 helper 只能处理本地脱敏摘要。
function collectRealSignalFlags(input) {
  const text = collectText({
    operatorNote: input.operatorNote,
    resultSummary: input.resultSummary,
    claim: input.claim,
  }).join("\n").toLowerCase();
  const flags = [];
  const checks = [
    [/real\s+publish|真实\s*publish/i, "real_publish_signal"],
    [/real\s+fixture|真实\s*fixture/i, "real_fixture_signal"],
    [/\bdb\s+(write|cleanup|delete|update)|database\s+(write|cleanup|delete|update)|真实\s*(db|数据库)/i, "real_db_write_signal"],
    [/production-like|production\s+endpoint|真实\s*endpoint|provider\s+token/i, "production_like_signal"],
    [/real\s+gate|真实\s*gate/i, "real_gate_signal"],
  ];
  checks.forEach(([pattern, flag]) => {
    if (pattern.test(text)) {
      flags.push(flag);
    }
  });
  return unique(flags);
}

function isExecutionReady(summary) {
  return summary &&
    summary.status === READY_EXECUTION_STATUS &&
    summary.release !== "hold";
}

function missingPrerequisites(input) {
  const missing = [];
  if (!isExecutionReady(input.executionHandoffSummary)) {
    missing.push("executionHandoffSummary");
  }
  if (!input.resultStatus) {
    missing.push("resultStatus");
  }
  if (toArray(input.resultAliases).length === 0) {
    missing.push("resultAliases");
  }
  if (!input.resultCounts || typeof input.resultCounts !== "object") {
    missing.push("resultCounts");
  }
  if (!input.redactionCategory) {
    missing.push("redactionCategory");
  }
  if (!input.riskCategory) {
    missing.push("riskCategory");
  }
  return missing;
}

function hasCountAliasMismatch(input) {
  const counts = input.resultCounts || {};
  const badCount = [
    "failed",
    "partial",
    "blocked",
    "missing",
    "unauthorized",
    "unknown",
  ].some((key) => Number(counts[key] || 0) > 0);
  const expected = Number(counts.expected || 0);
  const observed = Number(counts.observed || 0);
  const passed = Number(counts.passed || 0);
  return badCount || (expected > 0 && observed > 0 && expected !== observed) || (observed > 0 && passed !== observed);
}

function ownerLimit(alias, nextAction, minimumUnblockCondition) {
  return {
    alias,
    owner: "admin_operator",
    nextAction,
    minimumUnblockCondition,
  };
}

// 所有分支通过统一构造器输出稳定 alias/摘要，确保 blocked 时不回显原始 evidence。
function baseResult(status, input, options = {}, overrides = {}) {
  const release = status === READY_RESULT_STATUS ? "release_after_report" : "hold";
  return {
    status,
    release,
    generatedAt: options.generatedAt || new Date().toISOString(),
    sourceAlias: options.sourceAlias || "local-controlled-smoke-result-evidence-handoff",
    resultAliases: unique(toArray(input.resultAliases)),
    resultCounts: input.resultCounts && typeof input.resultCounts === "object"
      ? { ...input.resultCounts }
      : {},
    redactionCategory: input.redactionCategory || "unknown",
    riskCategory: input.riskCategory || "unknown",
    blockerAlias: overrides.blockerAlias || null,
    remediationAlias: overrides.remediationAlias || null,
    redLineFlags: unique(overrides.redLineFlags),
    missingPrerequisites: unique(overrides.missingPrerequisites),
    operatorActions: unique(overrides.operatorActions || [
      "交接脱敏 controlled smoke result evidence 给后续操作者复核",
      "仅使用本地脱敏摘要、alias、状态、计数和风险分类，不触发真实环境操作",
    ]),
    ownerHandoffLimits: overrides.ownerHandoffLimits || [
      ownerLimit(
        "controlled_smoke_result_evidence_handoff",
        "交接脱敏 controlled smoke result evidence",
        "execution handoff 与 result evidence 均为稳定脱敏摘要且无 red-line signal"
      ),
    ],
    doNotDispatchUntil: overrides.doNotDispatchUntil ||
      "不要外推为 controlled smoke pass、full-success、production readiness、Gateway ingestion、authorization facts 或 API/Gateway/Insight 成功",
    cannotInferBoundaries: CANNOT_INFER_BOUNDARIES,
  };
}

/**
 * 基于本地脱敏摘要判断 controlled smoke 执行结果材料是否可交接。
 * 该 helper 不读取真实环境、不发网络请求、不回显敏感输入，只输出稳定 alias 和修复指引。
 */
function createGatewayProjectionControlledSmokeResultEvidenceHandoff(input = {}, options = {}) {
  const realSignalFlags = collectRealSignalFlags(input);
  if (realSignalFlags.length > 0) {
    return baseResult("hard-red-line", input, options, {
      blockerAlias: "real_execution_signal",
      remediationAlias: "remove_real_controlled_smoke_result_signal",
      redLineFlags: realSignalFlags,
      operatorActions: [
        "删除真实 publish、fixture/DB、production-like endpoint、provider token 或 gate 信号",
        "仅保留本地脱敏 result status、alias、counts 和 risk/redaction 分类后重跑 handoff",
      ],
    });
  }

  const overclaimFlags = collectOverclaimFlags(input);
  if (overclaimFlags.length > 0) {
    return baseResult("hard-red-line", input, options, {
      blockerAlias: "full_success_overclaim",
      remediationAlias: "remove_cross_owner_success_claim",
      redLineFlags: overclaimFlags,
      operatorActions: [
        "删除 API/Gateway/Insight、production readiness、controlled smoke pass 或 full-success 外推表述",
        "仅保留 Admin owner 本地脱敏 result evidence 摘要后重跑 handoff",
      ],
    });
  }

  if (hasSensitiveEvidence(input)) {
    return baseResult("blocked", {}, options, {
      blockerAlias: "sanitization_failed",
      remediationAlias: "remove_sensitive_result_evidence",
      operatorActions: [
        "移除 token、Cookie、私有 endpoint、真实账号、邮箱、手机号、完整组织树、完整响应体或 credential-like 字段",
        "用稳定 alias、计数摘要和 owner handoff limit 替代原始 evidence 后重跑",
      ],
      ownerHandoffLimits: [
        ownerLimit(
          "sanitization_failed",
          "替换疑似敏感 result evidence",
          "结果材料只保留脱敏 alias、状态、计数和风险分类"
        ),
      ],
    });
  }

  const missing = missingPrerequisites(input);
  if (missing.length > 0) {
    return baseResult("blocked", input, options, {
      blockerAlias: "controlled_smoke_result_evidence_missing",
      remediationAlias: "collect_sanitized_controlled_smoke_result_evidence",
      missingPrerequisites: missing,
      operatorActions: [
        "补齐脱敏 controlled smoke result evidence：execution handoff、resultStatus、resultAliases、resultCounts、redactionCategory 和 riskCategory",
        "只收集本地脱敏摘要，不补充真实 endpoint、token、fixture、DB 或完整响应体",
      ],
    });
  }

  if (!READY_RESULT_STATUSES.has(input.resultStatus)) {
    return baseResult("blocked", input, options, {
      blockerAlias: "controlled_smoke_result_not_handoff_ready",
      remediationAlias: "collect_sanitized_controlled_smoke_result_evidence",
      operatorActions: [
        "根据 failed/partial/blocked/missing 结果重新收集脱敏 evidence 或完成 Admin owner remediation",
        "不要把非 ready 状态写成 result evidence handoff ready",
      ],
    });
  }

  const aliases = unique(toArray(input.resultAliases));
  const unknownAlias = aliases.find((alias) => !KNOWN_RESULT_ALIASES.has(alias));
  if (unknownAlias) {
    return baseResult("blocked", input, options, {
      blockerAlias: "unknown_controlled_smoke_result_alias",
      remediationAlias: unknownAlias,
      operatorActions: [
        "替换未知 controlled smoke result alias 为 spec/test 中定义的稳定 Admin owner alias",
        "保留脱敏计数和风险分类后重跑 result evidence handoff",
      ],
      ownerHandoffLimits: [
        ownerLimit(
          "unknown_controlled_smoke_result_alias",
          "替换未知 result evidence alias",
          "unknown alias 已替换为稳定 Admin owner handoff alias"
        ),
      ],
    });
  }

  if (hasCountAliasMismatch(input)) {
    return baseResult("blocked", input, options, {
      blockerAlias: "controlled_smoke_result_count_alias_mismatch",
      remediationAlias: "reconcile_sanitized_result_counts_and_aliases",
      operatorActions: [
        "重新收集或修正脱敏 resultCounts 与 resultAliases，确保 ready alias 不包含 failed/partial/blocked/missing/unauthorized 计数",
        "无法对齐时保持 blocked，不要交接为 ready",
      ],
    });
  }

  return baseResult(READY_RESULT_STATUS, input, options);
}

module.exports = {
  createGatewayProjectionControlledSmokeResultEvidenceHandoff,
};
