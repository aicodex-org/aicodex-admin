const READY_RESULT_STATUS = "ready-for-result-evidence-handoff";
const READY_RELEASE_STATUS = "ready-for-release-summary-handoff";

const READY_SUMMARY_STATUSES = new Set([
  "ready-for-handoff",
  "summary-ready",
  "release-summary-ready",
]);

const NEEDS_USER_ACTION_STATUSES = new Set([
  "needs-user-action",
  "user-action-required",
]);

const KNOWN_RELEASE_SUMMARY_ALIASES = new Set([
  "controlled_smoke_release_summary_ready",
  "controlled_smoke_release_summary_ready_with_observations",
  "controlled_smoke_release_summary_blocked",
  "controlled_smoke_release_summary_needs_user_action",
  "controlled_smoke_release_summary_hard_red_line",
  "controlled_smoke_result_ready_for_handoff",
  "controlled_smoke_result_passed",
  "controlled_smoke_result_passed_with_observations",
]);

const SENSITIVE_FIELD_NAME_PARTS = [
  "account",
  "authorization",
  "config",
  "cookie",
  "credential",
  "diagnosticsresponse",
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
  "Admin controlled smoke release summary handoff 只证明本地脱敏 release summary 可交接",
  "该 handoff 不能外推为真实 publish、Gateway ingestion、API/Gateway/Insight 成功、authorization facts 生效或 production readiness",
  "该 handoff 不是 controlled smoke pass，也不能写成 full-success",
  "不得触发真实 endpoint、publish、Gateway ingestion、fixture/DB 写入、真实 controlled smoke、gate、mapping confirm 或密钥变更",
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

function collectText(value, output = [], key = "") {
  const compactKey = lowerCompact(key);
  if (["cannotinferboundaries", "donotdispatchuntil", "minimumunblockcondition", "minimumunblockconditions", "ownerhandofflimits", "operatoractions"].includes(compactKey)) {
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
  const prefix = text.slice(Math.max(0, index - 24), index);
  return /(不是|不能|不得|不可|not|cannot|can't|no)\s*$/i.test(prefix);
}

function collectOverclaimFlags(input: LooseRecord = {}) {
  const text = collectText({
    operatorNote: input.operatorNote,
    releaseSummary: input.releaseSummary,
    claim: input.claim,
  }).join("\n").toLowerCase();
  const flags = [];
  const checks: Array<[string, string]> = [
    ["full-success", "full_success_overclaim"],
    ["full success", "full_success_overclaim"],
    ["production readiness", "production_readiness_overclaim"],
    ["gateway allow", "gateway_success_overclaim"],
    ["api authorization report", "api_success_overclaim"],
    ["insight success", "insight_success_overclaim"],
    ["gateway ingestion success", "gateway_ingestion_overclaim"],
    ["authorization facts success", "authorization_facts_overclaim"],
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

// 真实执行信号必须硬阻断；本 helper 只处理本地脱敏 release summary。
function collectRealSignalFlags(input: LooseRecord = {}) {
  const text = collectText({
    operatorNote: input.operatorNote,
    releaseSummary: input.releaseSummary,
    claim: input.claim,
  }).join("\n").toLowerCase();
  const flags = [];
  const checks: Array<[RegExp, string]> = [
    [/real\s+publish|真实\s*publish/i, "real_publish_signal"],
    [/gateway\s+ingestion|真实\s*ingestion/i, "gateway_ingestion_signal"],
    [/authorization\s+facts|授权事实/i, "authorization_facts_signal"],
    [/real\s+fixture|真实\s*fixture/i, "real_fixture_signal"],
    [/\bdb\s+(write|cleanup|delete|update)|database\s+(write|cleanup|delete|update)|真实\s*(db|数据库)/i, "real_db_write_signal"],
    [/production-like|production\s+endpoint|真实\s*endpoint|provider\s+token/i, "production_like_signal"],
    [/real\s+gate|真实\s*gate/i, "real_gate_signal"],
    [/mapping\s+confirm|read\s+model\s+rebuild/i, "real_environment_write_signal"],
  ];
  checks.forEach(([pattern, flag]) => {
    if (pattern.test(text)) {
      flags.push(flag);
    }
  });
  return unique(flags);
}

function isResultEvidenceReady(summary) {
  return summary &&
    summary.status === READY_RESULT_STATUS &&
    summary.release !== "hold";
}

function missingPrerequisites(input: LooseRecord = {}) {
  const missing = [];
  if (!isResultEvidenceReady(input.resultEvidenceHandoffSummary)) {
    missing.push("resultEvidenceHandoffSummary");
  }
  if (!input.releaseSummaryStatus) {
    missing.push("releaseSummaryStatus");
  }
  if (toArray(input.releaseSummaryAliases).length === 0) {
    missing.push("releaseSummaryAliases");
  }
  if (!input.releaseSummaryCounts || typeof input.releaseSummaryCounts !== "object") {
    missing.push("releaseSummaryCounts");
  }
  if (!input.redactionCategory) {
    missing.push("redactionCategory");
  }
  if (!input.riskCategory) {
    missing.push("riskCategory");
  }
  return missing;
}

function releaseFor(status) {
  return status === READY_RELEASE_STATUS ? "release_after_report" : "hold";
}

function classificationFor(status) {
  if (status === READY_RELEASE_STATUS) {
    return "release-summary";
  }
  return status;
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

function ownerLimitsFromResultEvidence(summary: LooseRecord = {}) {
  const handoffs = Array.isArray(summary.ownerHandoffLimits) ? summary.ownerHandoffLimits : [];
  if (handoffs.length > 0) {
    return handoffs.map((item) => ownerLimit(
      item.alias || summary.blockerAlias || "controlled_smoke_result_evidence_handoff",
      item.nextAction || "补齐 result evidence handoff 后重跑 release summary handoff",
      item.minimumUnblockCondition || "result evidence handoff 为 ready 且无 red-line signal",
      item.owner || "admin_operator"
    ));
  }
  return [ownerLimit(
    "controlled_smoke_release_summary_missing",
    "补齐脱敏 controlled smoke result evidence 与 release summary",
    "result evidence handoff 已 ready，release summary 仅包含稳定 alias、计数、风险和脱敏分类"
  )];
}

function defaultOperatorActions(status) {
  if (status === READY_RELEASE_STATUS) {
    return [
      "交接脱敏 release summary 给后续 operator 复核",
      "只复制 status、classification、stable alias、counts、owner 和 minimum unblock condition",
      "继续声明未证明 controlled smoke pass、full-success、production readiness、Gateway ingestion 或 authorization facts",
    ];
  }
  if (status === "needs-user-action") {
    return [
      "补齐 operator 明确要求的脱敏 release summary 动作或 approval alias",
      "只在 user action alias 清除后重新生成 release summary handoff",
    ];
  }
  if (status === "hard-red-line") {
    return [
      "删除真实 publish、Gateway ingestion、fixture/DB、production-like endpoint、authorization facts 或 full-success 外推信号",
      "仅保留本地脱敏 release summary alias、计数和风险分类后重跑 handoff",
    ];
  }
  return [
    "补齐脱敏 result evidence handoff 与 release summary status、alias、counts、redactionCategory、riskCategory",
    "按 owner handoff limits 清除 blocker 后重跑 release summary handoff",
  ];
}

function doNotDispatchUntil(status, extra: LooseRecord = {}) {
  if (status === READY_RELEASE_STATUS) {
    return "只可交接本地脱敏 release summary；不要外派为 controlled smoke pass、full-success、生产就绪、真实 publish、Gateway ingestion、authorization facts 或 API/Gateway/Insight 成功";
  }
  const blockers = unique([
    extra.blockerAlias,
    extra.remediationAlias,
    ...(extra.redLineFlags || []),
    ...(extra.missingPrerequisites || []),
  ]);
  return `不要外派为 full-success；等待 ${blockers.join("|") || status} 清除，并替换未知项为稳定 Admin owner release summary alias`;
}

function baseResult(status, input: LooseRecord = {}, options: LooseRecord = {}, overrides: LooseRecord = {}) {
  const release = releaseFor(status);
  const ownerHandoffLimits = overrides.ownerHandoffLimits || [
    ownerLimit(
      overrides.blockerAlias || "controlled_smoke_release_summary_handoff",
      status === READY_RELEASE_STATUS ? "交接脱敏 controlled smoke release summary" : "补齐脱敏 controlled smoke release summary",
      status === READY_RELEASE_STATUS
        ? "result evidence 与 release summary 均为稳定脱敏摘要且无 red-line signal"
        : "稳定 blocker/remediation alias 已清除且 release summary 已重新生成"
    ),
  ];
  return {
    status,
    release,
    classification: classificationFor(status),
    generatedAt: options.generatedAt || new Date().toISOString(),
    sourceAlias: options.sourceAlias || "local-controlled-smoke-release-summary-handoff",
    releaseSummaryAliases: unique(toArray(input.releaseSummaryAliases)),
    releaseSummaryCounts: input.releaseSummaryCounts && typeof input.releaseSummaryCounts === "object"
      ? { ...input.releaseSummaryCounts }
      : {},
    redactionCategory: input.redactionCategory || "unknown",
    riskCategory: input.riskCategory || "unknown",
    blockerAlias: overrides.blockerAlias || null,
    remediationAlias: overrides.remediationAlias || null,
    redLineFlags: unique(overrides.redLineFlags),
    missingPrerequisites: unique(overrides.missingPrerequisites),
    operatorActions: unique(overrides.operatorActions || defaultOperatorActions(status)),
    ownerHandoffLimits,
    minimumUnblockConditions: minimumConditions(ownerHandoffLimits),
    doNotDispatchUntil: overrides.doNotDispatchUntil || doNotDispatchUntil(status, overrides),
    cannotInferBoundaries: CANNOT_INFER_BOUNDARIES,
  };
}

function blockedFromResultEvidence(input: LooseRecord = {}, options: LooseRecord = {}) {
  const summary = input.resultEvidenceHandoffSummary || {};
  const ownerHandoffLimits = ownerLimitsFromResultEvidence(summary);
  return baseResult("blocked", input, options, {
    blockerAlias: summary.blockerAlias || "controlled_smoke_release_summary_missing",
    remediationAlias: summary.remediationAlias || "collect_sanitized_controlled_smoke_release_summary",
    missingPrerequisites: missingPrerequisites(input),
    ownerHandoffLimits,
    operatorActions: [
      "先解除 upstream result evidence blocker，并保留稳定 alias 与最小解除条件",
      "只收集本地脱敏 release summary，不补充真实 endpoint、token、fixture、DB 或完整响应体",
    ],
  });
}

function hasCountAliasMismatch(input: LooseRecord = {}) {
  const aliases = unique(toArray(input.releaseSummaryAliases));
  const counts = input.releaseSummaryCounts || {};
  const blockedCount = Number(counts.blockedItems || 0);
  const needsUserActionCount = Number(counts.needsUserActionItems || 0);
  const hardRedLineCount = Number(counts.hardRedLineItems || 0);
  const expected = Number(counts.sectionsExpected || 0);
  const observed = Number(counts.sectionsObserved || 0);
  const hasReadyAlias = aliases.some((alias) => alias === "controlled_smoke_release_summary_ready" || alias === "controlled_smoke_release_summary_ready_with_observations");
  return (hasReadyAlias && (blockedCount > 0 || needsUserActionCount > 0 || hardRedLineCount > 0)) ||
    (expected > 0 && observed > 0 && expected !== observed);
}

/**
 * 基于本地脱敏 result/evidence summary 生成 release summary handoff。
 * 该 helper 不读取真实环境、不发网络请求、不回显敏感输入，只输出稳定 alias、owner 和下一步。
 */
function createGatewayProjectionControlledSmokeReleaseSummaryHandoff(input: LooseRecord = {}, options: LooseRecord = {}) {
  const realSignalFlags = collectRealSignalFlags(input);
  if (realSignalFlags.length > 0) {
    return baseResult("hard-red-line", input, options, {
      blockerAlias: "real_execution_signal",
      remediationAlias: "remove_real_controlled_smoke_release_summary_signal",
      redLineFlags: realSignalFlags,
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
        "仅保留 Admin owner 本地脱敏 release summary 摘要后重跑 handoff",
      ],
    });
  }

  if (hasSensitiveEvidence(input)) {
    return baseResult("blocked", {}, options, {
      blockerAlias: "sanitization_failed",
      remediationAlias: "remove_sensitive_release_summary_evidence",
      operatorActions: [
        "移除 token、Cookie、私有 endpoint、真实账号、邮箱、手机号、完整组织树、完整响应体或 credential-like 字段",
        "用稳定 alias、计数摘要和 owner handoff limit 替代原始 evidence 后重跑",
      ],
      ownerHandoffLimits: [
        ownerLimit(
          "sanitization_failed",
          "替换疑似敏感 release summary evidence",
          "release summary 只保留脱敏 alias、状态、计数和风险分类"
        ),
      ],
    });
  }

  if (!isResultEvidenceReady(input.resultEvidenceHandoffSummary)) {
    return blockedFromResultEvidence(input, options);
  }

  const missing = missingPrerequisites(input);
  if (missing.length > 0) {
    return baseResult("blocked", input, options, {
      blockerAlias: "controlled_smoke_release_summary_missing",
      remediationAlias: "collect_sanitized_controlled_smoke_release_summary",
      missingPrerequisites: missing,
    });
  }

  const aliases = unique(toArray(input.releaseSummaryAliases));
  const unknownAlias = aliases.find((alias) => !KNOWN_RELEASE_SUMMARY_ALIASES.has(alias));
  if (unknownAlias) {
    return baseResult("blocked", input, options, {
      blockerAlias: "unknown_controlled_smoke_release_summary_alias",
      remediationAlias: unknownAlias,
      ownerHandoffLimits: [
        ownerLimit(
          "unknown_controlled_smoke_release_summary_alias",
          "替换未知 release summary alias",
          "unknown alias 已替换为 spec/test 中定义的稳定 Admin owner release summary alias"
        ),
      ],
    });
  }

  if (NEEDS_USER_ACTION_STATUSES.has(input.releaseSummaryStatus) || aliases.includes("controlled_smoke_release_summary_needs_user_action")) {
    return baseResult("needs-user-action", input, options, {
      blockerAlias: "controlled_smoke_release_summary_needs_user_action",
      remediationAlias: "collect_operator_release_summary_action",
      ownerHandoffLimits: [
        ownerLimit(
          "controlled_smoke_release_summary_needs_user_action",
          "补齐 operator 明确要求的脱敏 release summary 动作或 approval alias",
          "operator action alias 已清除，release summary 可重新分类",
          "admin_operator"
        ),
      ],
    });
  }

  if (hasCountAliasMismatch(input)) {
    return baseResult("blocked", input, options, {
      blockerAlias: "controlled_smoke_release_summary_count_alias_mismatch",
      remediationAlias: "reconcile_sanitized_release_summary_counts_and_aliases",
      operatorActions: [
        "重新收集或修正脱敏 releaseSummaryCounts 与 releaseSummaryAliases，确保 ready alias 不包含 blocked/needs-user-action/hard-red-line 计数",
        "无法对齐时保持 blocked，不要交接为 ready",
      ],
    });
  }

  if (!READY_SUMMARY_STATUSES.has(input.releaseSummaryStatus)) {
    return baseResult("blocked", input, options, {
      blockerAlias: "controlled_smoke_release_summary_not_handoff_ready",
      remediationAlias: "collect_sanitized_controlled_smoke_release_summary",
      operatorActions: [
        "根据 blocked/unknown release summary 重新收集脱敏 evidence 或完成 Admin owner remediation",
        "不要把非 ready 状态写成 release summary handoff ready",
      ],
    });
  }

  return baseResult(READY_RELEASE_STATUS, input, options);
}

module.exports = {
  createGatewayProjectionControlledSmokeReleaseSummaryHandoff,
};
