// @ts-nocheck
const EVIDENCE_SHAPE_VERSION = "wecom-source-controlled-smoke-result-evidence-handoff/v1";

const READY_EXECUTION_STATUS = "ready-for-controlled-smoke-execution-handoff";
const PASSED_STATUSES = new Set(["passed", "passed-with-observations"]);
const PARTIAL_STATUSES = new Set(["partial-handoff"]);
const READY_DEPLOYMENT_ALIASES = new Set(["deployed", "ready", "wecom_source_controlled_smoke_deployed"]);
const READY_AUTHORIZATION_ALIASES = new Set(["authorized", "ready", "wecom_source_controlled_smoke_authorized"]);
const REDACTED_ALIASES = new Set(["redacted", "sanitized", "safe"]);
const LOCAL_READONLY_SCOPES = new Set([
  "local-readonly-controlled-smoke-result-evidence-handoff",
  "local_readonly_controlled_smoke_result_evidence_handoff",
  "readonly-local",
  "read-only-local",
]);
const HANDOFF_ONLY_MODES = new Set([
  "controlled-smoke-result-evidence-handoff-only",
  "result-evidence-handoff-only",
  "local-only",
  "readonly-local",
]);
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

const SAFE_SUMMARY_KEYS = new Set([
  "authorizationsummary",
  "deploymentsummary",
  "executionhandoffsummary",
]);

const CANNOT_INFER_BOUNDARIES = [
  "result evidence handoff 只证明 Admin WeCom source 本地脱敏结果材料可交接",
  "该 handoff 不能外推为真实 WeCom 同步成功、组织树非空、Gateway/API/Insight 成功、authorization facts 生效或 production readiness",
  "该 handoff 不是 full-success，也不代表真实 controlled smoke 已由后续 owner 复核通过",
  "不得触发真实 sync、publish、Gateway ingestion、fixture/DB 写入、synthetic audit/projection 数据、真实 endpoint 或密钥变更",
];

function toArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  return value ? [value] : [];
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeAlias(value) {
  return String(value || "").trim().toLowerCase();
}

function lowerCompact(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function aliasesOf(summary = {}) {
  return unique([
    summary.status,
    summary.reasonAlias,
    summary.decision,
    summary.release,
    ...toArray(summary.aliases),
  ].map(normalizeAlias));
}

function hasReadyAlias(summary, readyAliases) {
  return aliasesOf(summary).some((alias) => readyAliases.has(alias));
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

function hasSensitiveValue(value) {
  return typeof value === "string" && (
    /bearer\s+\S+/i.test(value) ||
    /authorization:\s*\S+/i.test(value) ||
    /cookie:\s*\S+/i.test(value) ||
    /https?:\/\/(?:localhost|127\.0\.0\.1|10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.|[^/\s]+\.internal|[^\s]+)/i.test(value) ||
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value) ||
    /(?:\+?86[-\s]?)?1[3-9]\d{9}/.test(value)
  );
}

// 敏感扫描只影响分类，不把命中的字段名或字段值复制到输出。
function hasSensitiveEvidence(value) {
  if (!value || typeof value !== "object") {
    return hasSensitiveValue(value);
  }
  if (Array.isArray(value)) {
    return value.some(hasSensitiveEvidence);
  }
  return Object.entries(value).some(([key, nested]) => {
    const compactKey = lowerCompact(key);
    return (!SAFE_SUMMARY_KEYS.has(compactKey) && SENSITIVE_FIELD_NAME_PARTS.some((part) => compactKey.includes(part))) ||
      hasSensitiveEvidence(nested);
  });
}

function collectRedLineFlags(input = {}) {
  const text = collectText({
    operatorNote: input.operatorNote,
    resultSummary: input.resultSummary,
    claim: input.claim,
  }).join("\n");
  const flags = [];
  const checks = [
    [/real\s+sync|真实\s*wecom\s*同步/i, "real_sync_signal"],
    [/real\s+fixture|真实\s*fixture/i, "real_fixture_signal"],
    [/\bdb\s+(write|cleanup|delete|update)|database\s+(write|cleanup|delete|update)|真实\s*(db|数据库)/i, "real_db_write_signal"],
    [/synthetic\s+audit|synthetic\s+projection|audit\s+projection|projection\s+data/i, "synthetic_audit_projection_signal"],
    [/gateway\/api\/insight|gateway ingestion|gateway|insight/i, "downstream_success_overclaim"],
    [/authorization facts/i, "authorization_facts_overclaim"],
    [/full[-\s]?success/i, "full_success_overclaim"],
    [/production readiness|production ready|生产就绪/i, "production_readiness_overclaim"],
    [/non[-\s]?empty organization tree|组织树非空/i, "organization_tree_overclaim"],
    [/real\s+execution|真实\s*执行|real\s+endpoint|provider\s+token/i, "real_execution_signal"],
  ];
  checks.forEach(([pattern, flag]) => {
    if (pattern.test(text)) {
      flags.push(flag);
    }
  });
  if (input.operatorScope && !LOCAL_READONLY_SCOPES.has(normalizeAlias(input.operatorScope))) {
    flags.push("non_local_readonly_scope");
  }
  if (input.resultModeAlias && !HANDOFF_ONLY_MODES.has(normalizeAlias(input.resultModeAlias))) {
    flags.push("non_handoff_only_mode");
  }
  return unique(flags);
}

function resultAliases(input = {}) {
  return unique(toArray(input.resultAliases).map(normalizeAlias));
}

function hasExecutionReady(summary = {}) {
  return summary.status === READY_EXECUTION_STATUS && summary.release !== "hold";
}

function missingPrerequisites(input = {}) {
  const missing = [];
  if (!hasExecutionReady(input.executionHandoffSummary)) {
    missing.push("executionHandoffSummary");
  }
  if (!input.resultStatus) {
    missing.push("resultStatus");
  }
  if (resultAliases(input).length === 0) {
    missing.push("resultAliases");
  }
  if (!input.resultCounts || typeof input.resultCounts !== "object") {
    missing.push("resultCounts");
  }
  if (!input.deploymentSummary) {
    missing.push("deploymentSummary");
  }
  if (!input.authorizationSummary) {
    missing.push("authorizationSummary");
  }
  if (!input.redactionSignal) {
    missing.push("redactionSignal");
  }
  if (!input.riskCategory) {
    missing.push("riskCategory");
  }
  return missing;
}

function hasBlockingCounts(input = {}) {
  const counts = input.resultCounts || {};
  return ["failed", "blocked", "missing", "unauthorized"].some((key) => Number(counts[key] || 0) > 0);
}

function hasCountMismatch(input = {}) {
  const counts = input.resultCounts || {};
  const expected = Number(counts.expected || 0);
  const observed = Number(counts.observed || 0);
  const passed = Number(counts.passed || 0);
  const partial = Number(counts.partial || 0);
  if (hasBlockingCounts(input)) {
    return true;
  }
  if (PASSED_STATUSES.has(input.resultStatus)) {
    return expected > 0 && (expected !== observed || observed !== passed);
  }
  if (PARTIAL_STATUSES.has(input.resultStatus)) {
    return expected > 0 && observed > 0 && partial > 0 && passed + partial !== expected;
  }
  return false;
}

function ownerLimit(alias, nextAction, minimumUnblockCondition) {
  return {
    alias,
    owner: "admin_operator",
    nextAction,
    minimumUnblockCondition,
  };
}

// 所有结果通过统一构造器生成，避免 blocked 分支意外回显原始 evidence。
function baseResult(status, input = {}, options = {}, overrides = {}) {
  return {
    status,
    release: status === "passed" ? "release_after_report" : "hold",
    reasonAlias: overrides.reasonAlias || (status === "passed" ? "wecom_source_controlled_smoke_result_passed" : status),
    generatedAt: options.generatedAt || new Date().toISOString(),
    sourceAlias: options.sourceAlias || "wecom_source_controlled_smoke_result_evidence_handoff",
    resultAliases: resultAliases(input),
    resultCounts: input.resultCounts && typeof input.resultCounts === "object" ? { ...input.resultCounts } : {},
    redactionCategory: input.redactionSignal || "unknown",
    riskCategory: input.riskCategory || "unknown",
    missingPrerequisites: unique(overrides.missingPrerequisites),
    redLineFlags: unique(overrides.redLineFlags),
    ownerHandoffLimits: overrides.ownerHandoffLimits || [
      ownerLimit(
        "wecom_source_controlled_smoke_result_evidence_handoff",
        "交接脱敏 controlled smoke result evidence 给后续 operator 复核",
        "result evidence 为本地脱敏摘要，且无 red-line signal"
      ),
    ],
    operatorActions: overrides.operatorActions || [
      "交接脱敏 controlled smoke result evidence 给后续操作者复核",
      "仅传递本地脱敏 status、alias、计数、风险分类和 owner handoff limit",
    ],
    cannotInferBoundaries: CANNOT_INFER_BOUNDARIES,
    evidenceShapeVersion: EVIDENCE_SHAPE_VERSION,
  };
}

/**
 * 生成 Admin WeCom source 受控 smoke result evidence 的本地交接摘要。
 * 该 helper 不访问网络/DB/密钥，不触发真实 smoke，只输出稳定 alias 和 fail-closed 指引。
 */
function createWecomSourceControlledSmokeResultEvidenceHandoff(input = {}, options = {}) {
  const redLineFlags = collectRedLineFlags(input);
  if (redLineFlags.length > 0) {
    return baseResult("blocked", {}, options, {
      reasonAlias: "hard_red_line_signal",
      redLineFlags,
      ownerHandoffLimits: [
        ownerLimit(
          "hard_red_line_signal",
          "移除真实执行、fixture/DB、projection、下游成功或 full-success 信号",
          "只保留 Admin owner 本地脱敏 result evidence 摘要"
        ),
      ],
      operatorActions: [
        "删除真实 WeCom 同步、fixture/DB、synthetic audit/projection、Gateway/API/Insight 或 full-success 外推表述",
        "确认 scope 为本地只读且 mode 为 handoff-only 后重跑",
      ],
    });
  }

  if (hasSensitiveEvidence(input)) {
    return baseResult("blocked", {}, options, {
      reasonAlias: "sanitization_failed",
      ownerHandoffLimits: [
        ownerLimit(
          "sanitization_failed",
          "替换疑似敏感 result evidence",
          "结果材料只保留脱敏 alias、状态、计数和风险分类"
        ),
      ],
      operatorActions: [
        "移除 token、Cookie、私有 URL、真实账号、邮箱、手机号、完整组织树、完整响应体、credential-like 字段或真实环境标识",
        "用稳定 alias、计数摘要和 owner handoff limit 替代原始 evidence 后重跑",
      ],
    });
  }

  const missing = missingPrerequisites(input);
  if (missing.length > 0) {
    return baseResult("needs-user-action", input, options, {
      reasonAlias: "missing_result_evidence_prerequisite",
      missingPrerequisites: missing,
      operatorActions: [
        "补齐脱敏 controlled smoke result evidence：execution handoff、result status、result aliases、result counts、deployment summary、authorization summary、redaction signal 和 risk category",
        "只收集本地脱敏摘要，不补充真实 endpoint、token、fixture、DB、projection 数据或完整响应体",
      ],
    });
  }

  if (!REDACTED_ALIASES.has(normalizeAlias(input.redactionSignal))) {
    return baseResult("blocked", {}, options, {
      reasonAlias: "sanitization_failed",
      ownerHandoffLimits: [
        ownerLimit(
          "sanitization_failed",
          "确认 result evidence 输入已完成脱敏",
          "redaction signal 为 redacted、sanitized 或 safe"
        ),
      ],
      operatorActions: [
        "先确认本地 result evidence 输入已脱敏，再重跑 result evidence handoff",
      ],
    });
  }

  if (!hasReadyAlias(input.deploymentSummary, READY_DEPLOYMENT_ALIASES)) {
    return baseResult("blocked", input, options, {
      reasonAlias: "controlled_smoke_result_not_deployed",
      ownerHandoffLimits: [
        ownerLimit("controlled_smoke_result_not_deployed", "先确认本地脱敏 deployment summary", "deployment summary alias 为 deployed"),
      ],
    });
  }

  if (!hasReadyAlias(input.authorizationSummary, READY_AUTHORIZATION_ALIASES)) {
    return baseResult("blocked", input, options, {
      reasonAlias: "controlled_smoke_result_unauthorized",
      ownerHandoffLimits: [
        ownerLimit("controlled_smoke_result_unauthorized", "先确认本地脱敏 authorization summary", "authorization summary alias 为 authorized"),
      ],
    });
  }

  const aliases = resultAliases(input);
  const unknownAlias = aliases.find((alias) => !KNOWN_RESULT_ALIASES.has(alias));
  if (unknownAlias) {
    return baseResult("blocked", input, options, {
      reasonAlias: "unknown_controlled_smoke_result_alias",
      ownerHandoffLimits: [
        ownerLimit("unknown_controlled_smoke_result_alias", "替换未知 result alias", "result alias 来自 spec/test 定义的稳定 Admin owner alias"),
      ],
    });
  }

  if (hasCountMismatch(input)) {
    return baseResult("blocked", input, options, {
      reasonAlias: "controlled_smoke_result_count_alias_mismatch",
      ownerHandoffLimits: [
        ownerLimit("controlled_smoke_result_count_alias_mismatch", "重新对齐脱敏 result counts 与 aliases", "passed/partial/failed/blocked/missing/unauthorized 计数与 result status 一致"),
      ],
    });
  }

  if (PARTIAL_STATUSES.has(input.resultStatus)) {
    return baseResult("partial-handoff", input, options, {
      reasonAlias: "wecom_source_controlled_smoke_result_partial_handoff",
      ownerHandoffLimits: [
        ownerLimit(
          "partial_result_evidence_handoff",
          "补齐缺失的本地脱敏 result evidence 或带限制交接",
          "partial 缺口已由 Admin owner 明确记录且无 failed/blocked/unauthorized 计数"
        ),
      ],
      operatorActions: [
        "补齐缺失的本地脱敏 result evidence，或把 partial 限制写入 owner handoff",
        "不得把 partial-handoff 外推为 full-success、production readiness 或 downstream 成功",
      ],
    });
  }

  if (!PASSED_STATUSES.has(input.resultStatus)) {
    return baseResult("blocked", input, options, {
      reasonAlias: "controlled_smoke_result_not_passed",
      ownerHandoffLimits: [
        ownerLimit("controlled_smoke_result_not_passed", "重新收集 passed result evidence 或完成 Admin owner remediation", "result status 为 passed 或 passed-with-observations"),
      ],
    });
  }

  return baseResult("passed", input, options);
}

module.exports = {
  createWecomSourceControlledSmokeResultEvidenceHandoff,
};
