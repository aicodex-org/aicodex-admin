const READY_DECISION_STATUS = "ready-for-operator-decision-handoff";
const READY_ACTION_STATUS = "ready-for-operator-action";

const KNOWN_ALIASES = new Set([
  "none",
  "operator_action_package_ready",
  "controlled_smoke_operator_action_handoff",
  "controlled_smoke_operator_action_decision_missing",
  "controlled_smoke_operator_action_blocked",
  "collect_sanitized_operator_action_inputs",
  "operator_decision_package_ready",
  "controlled_smoke_operator_decision_handoff",
  "controlled_smoke_operator_decision_missing",
  "collect_sanitized_operator_decision_inputs",
  "controlled_smoke_operator_decision_blocked",
  "controlled_smoke_release_summary_ready",
  "controlled_smoke_release_summary_handoff",
  "controlled_smoke_release_summary_needs_user_action",
  "collect_operator_release_summary_action",
  "controlled_smoke_result_ready_for_handoff",
  "controlled_smoke_result_evidence_handoff",
  "real_execution_signal",
  "remove_real_operator_decision_signal",
  "sanitization_failed",
  "full_success_overclaim",
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
  "Admin controlled smoke operator action handoff 只证明本地脱敏 action package 可交接",
  "该 handoff 不能外推为真实 publish、真实 controlled smoke、Gateway ingestion、API/Gateway/Insight 成功、authorization facts 生效或 production readiness",
  "该 handoff 不是 controlled smoke pass，也不能写成 full-success",
  "不得触发真实 endpoint、publish、Gateway ingestion、fixture/DB 写入、真实 controlled smoke、mapping confirm、read model rebuild、gate、authorization facts 或密钥变更",
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

// 敏感扫描只返回布尔值，避免把原始字段名或字段值带入 action package。
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
  if (["cannotinferboundaries", "donotdispatchuntil", "minimumunblockcondition", "minimumunblockconditions", "ownerhandofflimits", "nextsteps", "nextaction"].includes(compactKey)) {
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
  const prefix = text.slice(Math.max(0, index - 32), index);
  return /(不是|不能|不得|不可|不要|不声明|未证明|not|cannot|can't|no)(?:\s|\S){0,10}$/i.test(prefix);
}

function collectOverclaimFlags(input = {}) {
  const text = collectText({
    operatorNote: input.operatorNote,
    claim: input.claim,
  }).join("\n").toLowerCase();
  const flags = [];
  const checks = [
    ["full-success", "full_success_overclaim"],
    ["full success", "full_success_overclaim"],
    ["production readiness", "production_readiness_overclaim"],
    ["gateway allow", "gateway_success_overclaim"],
    ["api authorization report", "api_success_overclaim"],
    ["insight success", "insight_success_overclaim"],
    ["gateway ingestion success", "gateway_ingestion_signal"],
    ["authorization facts success", "authorization_facts_signal"],
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

function collectRealSignalFlags(input = {}) {
  const text = collectText({
    operatorNote: input.operatorNote,
    claim: input.claim,
  }).join("\n").toLowerCase();
  const flags = [];
  const checks = [
    [/real\s+publish|真实\s*publish/i, "real_publish_signal"],
    [/real\s+controlled\s+smoke|真实\s*controlled\s*smoke|真实\s*受控\s*smoke/i, "real_controlled_smoke_signal"],
    [/gateway\s+ingestion|真实\s*ingestion/i, "gateway_ingestion_signal"],
    [/authorization\s+facts|授权事实/i, "authorization_facts_signal"],
    [/real\s+fixture|真实\s*fixture/i, "real_fixture_signal"],
    [/\bdb\s+(write|cleanup|delete|update)|database\s+(write|cleanup|delete|update)|真实\s*(db|数据库)/i, "real_db_write_signal"],
    [/production-like|production\s+endpoint|真实\s*endpoint|provider\s+token/i, "production_like_signal"],
    [/real\s+gate|真实\s*gate|mapping\s+confirm|read\s+model\s+rebuild/i, "real_environment_write_signal"],
  ];
  checks.forEach(([pattern, flag]) => {
    const match = text.match(pattern);
    if (match && !hasNegatedBoundary(text, match[0].toLowerCase())) {
      flags.push(flag);
    }
  });
  return unique(flags);
}

function ownerLimit(alias, nextAction, minimumUnblockCondition, owner = "admin_operator") {
  return {
    alias,
    owner,
    nextAction,
    minimumUnblockCondition,
  };
}

function actionableAlias(alias, fallback) {
  return alias && alias !== "none" ? alias : fallback;
}

function ownerLimitsFromDecision(summary = {}, fallbackStatus = "blocked") {
  const limits = Array.isArray(summary.ownerHandoffLimits) ? summary.ownerHandoffLimits : [];
  if (limits.length > 0) {
    return limits.map((item) => ownerLimit(
      actionableAlias(item.alias, actionableAlias(summary.blockerAlias, "controlled_smoke_operator_action_blocked")),
      item.nextAction || nextActionFor(fallbackStatus),
      item.minimumUnblockCondition || item.condition || "稳定 owner-scoped alias 已清除且无 red-line signal",
      item.owner || "admin_operator"
    ));
  }
  return [ownerLimit(
    actionableAlias(summary.blockerAlias, "controlled_smoke_operator_action_blocked"),
    nextActionFor(fallbackStatus),
    "稳定 blocker/remediation alias 已清除，且 decision package 仍为本地脱敏摘要"
  )];
}

function minimumConditions(ownerHandoffLimits = []) {
  return ownerHandoffLimits.map((item) => ({
    alias: item.alias,
    owner: item.owner,
    condition: item.minimumUnblockCondition,
  })).filter((item) => item.alias || item.owner || item.condition);
}

function nextActionFor(actionStatus) {
  if (actionStatus === READY_ACTION_STATUS) {
    return "handoff_owner_safe_operator_action_package";
  }
  if (actionStatus === "needs-user-action") {
    return "collect_user_action_then_regenerate_action_package";
  }
  if (actionStatus === "hard-red-line") {
    return "stop_dispatch_and_remove_red_line_signal";
  }
  return "clear_blocker_then_regenerate_action_package";
}

function nextStepsFor(actionStatus) {
  if (actionStatus === READY_ACTION_STATUS) {
    return [
      "复制本地脱敏 operator action package 给值班 operator",
      "只传播 actionStatus、nextAction、stable alias、owner、最小解除条件和不能外推边界",
      "继续声明未证明真实 controlled smoke pass、full-success、production readiness、Gateway ingestion 或 authorization facts",
    ];
  }
  if (actionStatus === "needs-user-action") {
    return [
      "补齐用户动作或 approval alias 后重跑 operator action handoff",
      "用户动作未清除前不得把 action package 标记为 ready",
    ];
  }
  if (actionStatus === "hard-red-line") {
    return [
      "删除真实 publish、真实 controlled smoke、Gateway ingestion、authorization facts、fixture/DB 或 full-success 外推信号",
      "仅保留本地脱敏 alias、计数、owner 和最小解除条件后重跑 action handoff",
    ];
  }
  return [
    "清除 stable blocker/remediation alias 后重跑 operator action handoff",
    "只收集本地脱敏 decision package，不补充真实 endpoint、token、fixture、DB 或完整响应体",
  ];
}

function doNotDispatchUntil(actionStatus, extra = {}) {
  if (actionStatus === READY_ACTION_STATUS) {
    return "只可交接本地脱敏 operator action package；不要外派为 controlled smoke pass、full-success、生产就绪、真实 publish、Gateway ingestion、authorization facts 或 API/Gateway/Insight 成功";
  }
  const blockers = unique([
    extra.blockerAlias,
    extra.remediationAlias,
    ...(extra.redLineFlags || []),
    ...(extra.missingPrerequisites || []),
  ]);
  return `不要外派为 full-success；等待 ${blockers.join("|") || actionStatus} 清除，并替换未知项为稳定 Admin owner handoff alias`;
}

function actionPackageMetadata(options = {}) {
  return {
    sourceAlias: options.sourceAlias || "local-controlled-smoke-operator-action-handoff",
    generatedAt: options.generatedAt || new Date().toISOString(),
    packageShape: "admin-gateway-projection-controlled-smoke-operator-action-handoff/v1",
  };
}

function baseResult(actionStatus, input = {}, options = {}, overrides = {}) {
  const decision = input.operatorDecisionHandoffSummary || {};
  const ownerHandoffLimits = overrides.ownerHandoffLimits || [ownerLimit(
    overrides.blockerAlias || "controlled_smoke_operator_action_handoff",
    nextActionFor(actionStatus),
    actionStatus === READY_ACTION_STATUS
      ? "decision package 已 ready，且 action 输入仍为本地脱敏摘要"
      : "稳定 blocker/remediation alias 已清除，且 decision package 仍为本地脱敏摘要"
  )];
  return {
    actionStatus,
    release: actionStatus === READY_ACTION_STATUS ? "release_after_report" : "hold",
    nextAction: overrides.nextAction || nextActionFor(actionStatus),
    blockerAlias: overrides.blockerAlias || (actionStatus === READY_ACTION_STATUS ? "none" : "controlled_smoke_operator_action_blocked"),
    remediationAlias: overrides.remediationAlias || (actionStatus === READY_ACTION_STATUS ? "operator_action_package_ready" : "collect_sanitized_operator_action_inputs"),
    decisionStatus: decision.status || "missing",
    releaseSummaryAliases: unique(toArray(decision.releaseSummaryAliases)),
    resultAliases: unique(toArray(decision.resultAliases)),
    releaseSummaryCounts: decision.releaseSummaryCounts && typeof decision.releaseSummaryCounts === "object"
      ? { ...decision.releaseSummaryCounts }
      : {},
    resultCounts: decision.resultCounts && typeof decision.resultCounts === "object"
      ? { ...decision.resultCounts }
      : {},
    redactionCategory: decision.redactionCategory || "unknown",
    riskCategory: decision.riskCategory || "unknown",
    nextSteps: unique(overrides.nextSteps || nextStepsFor(actionStatus)),
    ownerHandoffLimits,
    minimumUnblockConditions: minimumConditions(ownerHandoffLimits),
    redLineFlags: unique(overrides.redLineFlags),
    missingPrerequisites: unique(overrides.missingPrerequisites),
    cannotInferBoundaries: CANNOT_INFER_BOUNDARIES,
    actionPackageMetadata: actionPackageMetadata(options),
    doNotDispatchUntil: overrides.doNotDispatchUntil || doNotDispatchUntil(actionStatus, overrides),
  };
}

function aliasesFromDecision(summary = {}) {
  return unique([
    summary.alias,
    summary.reason,
    summary.reasonAlias,
    summary.decision,
    summary.blockerAlias,
    summary.remediationAlias,
    ...(Array.isArray(summary.aliases) ? summary.aliases : []),
    ...(Array.isArray(summary.resultAliases) ? summary.resultAliases : []),
    ...(Array.isArray(summary.releaseSummaryAliases) ? summary.releaseSummaryAliases : []),
  ].map((item) => String(item || "").trim()).filter((item) => item && item !== "null"));
}

function unknownAlias(input = {}) {
  return aliasesFromDecision(input.operatorDecisionHandoffSummary)
    .find((alias) => !KNOWN_ALIASES.has(alias));
}

/**
 * 基于本地脱敏 operator decision package 生成 owner-safe operator action package。
 * 该 helper 不读取真实环境、不发网络请求、不回显敏感输入，只输出稳定行动状态、owner 和下一步。
 */
function createGatewayProjectionControlledSmokeOperatorActionHandoff(input = {}, options = {}) {
  const realSignalFlags = collectRealSignalFlags(input);
  const overclaimFlags = collectOverclaimFlags(input);
  const redLineFlags = unique([...realSignalFlags, ...overclaimFlags]);
  if (redLineFlags.length > 0) {
    return baseResult("hard-red-line", input, options, {
      blockerAlias: overclaimFlags.length > 0 ? "full_success_overclaim" : "real_execution_signal",
      remediationAlias: overclaimFlags.length > 0 ? "remove_cross_owner_success_claim" : "remove_real_operator_action_signal",
      redLineFlags,
    });
  }

  if (hasSensitiveEvidence(input)) {
    return baseResult("blocked", {}, options, {
      blockerAlias: "sanitization_failed",
      remediationAlias: "remove_sensitive_operator_action_evidence",
      nextSteps: [
        "移除 token、Cookie、私有 endpoint、真实账号、邮箱、手机号、完整组织树、完整响应体或 credential-like 字段",
        "用稳定 alias、计数摘要和 owner handoff limit 替代原始 evidence 后重跑",
      ],
      ownerHandoffLimits: [
        ownerLimit(
          "sanitization_failed",
          "替换疑似敏感 operator action evidence",
          "action package 只保留脱敏 alias、状态、计数、owner 和最小解除条件"
        ),
      ],
    });
  }

  const decision = input.operatorDecisionHandoffSummary;
  if (!decision) {
    return baseResult("blocked", input, options, {
      blockerAlias: "controlled_smoke_operator_action_decision_missing",
      remediationAlias: "collect_sanitized_operator_decision_inputs",
      missingPrerequisites: ["operatorDecisionHandoffSummary"],
    });
  }

  if (decision.status === "hard-red-line") {
    return baseResult("hard-red-line", input, options, {
      blockerAlias: decision.blockerAlias || "real_execution_signal",
      remediationAlias: decision.remediationAlias || "remove_real_operator_action_signal",
      redLineFlags: decision.redLineFlags || [],
      ownerHandoffLimits: ownerLimitsFromDecision(decision, "hard-red-line"),
    });
  }

  if (decision.status === "needs-user-action") {
    return baseResult("needs-user-action", input, options, {
      blockerAlias: decision.blockerAlias || "controlled_smoke_operator_action_needs_user_action",
      remediationAlias: decision.remediationAlias || "collect_operator_action",
      ownerHandoffLimits: ownerLimitsFromDecision(decision, "needs-user-action"),
    });
  }

  if (decision.status !== READY_DECISION_STATUS || decision.release === "hold") {
    return baseResult("blocked", input, options, {
      blockerAlias: decision.blockerAlias && decision.blockerAlias !== "none"
        ? decision.blockerAlias
        : "controlled_smoke_operator_action_decision_missing",
      remediationAlias: decision.remediationAlias || "collect_sanitized_operator_decision_inputs",
      missingPrerequisites: ["operatorDecisionHandoffSummary:not_ready"],
      ownerHandoffLimits: ownerLimitsFromDecision(decision, "blocked"),
    });
  }

  const unknown = unknownAlias(input);
  if (unknown) {
    return baseResult("blocked", input, options, {
      blockerAlias: "unknown_controlled_smoke_operator_action_alias",
      remediationAlias: unknown,
      ownerHandoffLimits: [
        ownerLimit(
          "unknown_controlled_smoke_operator_action_alias",
          "替换未知 operator action alias",
          "unknown alias 已替换为 spec/test 中定义的稳定 Admin owner handoff alias"
        ),
      ],
    });
  }

  return baseResult(READY_ACTION_STATUS, input, options);
}

module.exports = {
  createGatewayProjectionControlledSmokeOperatorActionHandoff,
};
