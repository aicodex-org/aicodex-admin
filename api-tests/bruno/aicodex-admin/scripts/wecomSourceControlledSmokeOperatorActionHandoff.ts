// @ts-nocheck
const READY_DECISION_STATUS = "ready-for-operator-decision-handoff";
const READY_ACTION_STATUS = "ready-for-operator-action";

const KNOWN_ALIASES = new Set([
  "none",
  "ready-for-operator-decision-handoff",
  "wecom_source_operator_action_package_ready",
  "wecom_source_controlled_smoke_operator_action_handoff",
  "wecom_source_operator_action_decision_missing",
  "wecom_source_operator_action_blocked",
  "collect_sanitized_wecom_operator_action_inputs",
  "collect_sanitized_wecom_operator_action",
  "collect_sanitized_wecom_operator_decision_inputs",
  "wecom_source_operator_decision_package_ready",
  "wecom_source_controlled_smoke_operator_decision_handoff",
  "rerun_wecom_source_operator_decision_handoff",
  "missing_operator_triage_handoff_summary",
  "missing_operator_approval_alias",
  "wecom_source_controlled_smoke_result_passed",
  "real_execution_signal",
  "remove_real_wecom_operator_decision_signal",
  "remove_real_wecom_operator_action_signal",
  "sanitization_failed",
  "full_success_overclaim",
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
  "cannotinferboundaries",
  "donotdispatchuntil",
  "minimumunblockcondition",
  "minimumunblockconditions",
  "nextsteps",
  "nextaction",
  "ownerhandofflimits",
]);

const CANNOT_INFER_BOUNDARIES = [
  "Admin WeCom source operator action handoff 只证明本地脱敏 action package 可交接",
  "该 handoff 不能外推为真实 WeCom 同步成功、组织树非空、Gateway/API/Insight 成功、authorization facts 生效或 production readiness",
  "该 handoff 不是 controlled smoke pass，也不能写成 full-success",
  "不得触发真实 WeCom 同步、真实 controlled smoke、真实 fixture/DB 写入、Gateway/API/Insight 读取、authorization facts、组织树重建、provider token、真实 gate 或密钥变更",
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

function normalizeAlias(value) {
  return String(value || "").trim().toLowerCase();
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
    /(?:\+?86[-\s]?)?1[3-9]\d{9}/.test(value);
}

// 只返回敏感分类信号；输出不得包含原始字段名或字段值。
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

function collectRedLineFlags(input = {}) {
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
    [/production-like|production\s+endpoint|provider\s+token|production\s+ready|production\s+readiness/i, "production_like_signal"],
    [/controlled\s+smoke\s+pass|controlled\s+smoke\s+passed|controlled\s+smoke\s+success/i, "controlled_smoke_pass_overclaim"],
    [/full[-\s]?success/i, "full_success_overclaim"],
    [/organization\s+tree\s+rebuild|组织树重建/i, "organization_tree_rebuild_signal"],
  ];
  const lowerText = text.toLowerCase();
  return unique(checks
    .filter(([pattern]) => {
      const match = text.match(pattern);
      return match && !hasNegatedBoundary(lowerText, match[0].toLowerCase());
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

function actionableAlias(alias, fallback) {
  return alias && alias !== "none" ? alias : fallback;
}

function nextActionFor(actionStatus) {
  if (actionStatus === READY_ACTION_STATUS) {
    return "handoff_owner_safe_wecom_operator_action_package";
  }
  if (actionStatus === "needs-user-action") {
    return "collect_user_action_then_regenerate_wecom_action_package";
  }
  if (actionStatus === "hard-red-line") {
    return "stop_dispatch_and_remove_wecom_red_line_signal";
  }
  return "clear_blocker_then_regenerate_wecom_action_package";
}

function nextStepsFor(actionStatus) {
  if (actionStatus === READY_ACTION_STATUS) {
    return [
      "复制本地脱敏 WeCom source operator action package 给值班 operator",
      "只传播 actionStatus、nextAction、stable alias、owner、最小解除条件和不能外推边界",
      "继续声明未证明真实 WeCom 同步成功、组织树非空、controlled smoke pass、full-success、production readiness 或 Gateway/API/Insight 成功",
    ];
  }
  if (actionStatus === "needs-user-action") {
    return [
      "补齐用户动作或 approval alias 后重跑 WeCom source operator action handoff",
      "用户动作未清除前不得把 action package 标记为 ready",
    ];
  }
  if (actionStatus === "hard-red-line") {
    return [
      "删除真实 WeCom 同步、真实 controlled smoke、真实 fixture/DB、Gateway/API/Insight、authorization facts、组织树重建、生产就绪或 full-success 外推信号",
      "仅保留本地脱敏 alias、计数、owner 和最小解除条件后重跑 action handoff",
    ];
  }
  return [
    "清除 stable blocker/remediation alias 后重跑 WeCom source operator action handoff",
    "只收集本地脱敏 decision package，不补充真实 endpoint、token、fixture、DB、组织树或完整响应体",
  ];
}

function ownerLimitsFromDecision(summary = {}, fallbackStatus = "blocked") {
  const limits = Array.isArray(summary.ownerHandoffLimits) ? summary.ownerHandoffLimits : [];
  if (limits.length > 0) {
    return limits.map((item) => ownerLimit(
      actionableAlias(item.alias, actionableAlias(summary.blockerAlias, "wecom_source_operator_action_blocked")),
      item.nextAction || nextActionFor(fallbackStatus),
      item.minimumUnblockCondition || item.condition || "稳定 owner-scoped alias 已清除且无 red-line signal",
      item.owner || "admin_operator"
    ));
  }
  return [ownerLimit(
    actionableAlias(summary.blockerAlias, "wecom_source_operator_action_blocked"),
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

function doNotDispatchUntil(actionStatus, extra = {}) {
  if (actionStatus === READY_ACTION_STATUS) {
    return "只可交接本地脱敏 WeCom source operator action package；不要外派为 controlled smoke pass、full-success、生产就绪、真实 WeCom 同步成功、组织树非空、Gateway/API/Insight 成功或 authorization facts 生效";
  }
  const blockers = unique([
    extra.blockerAlias,
    extra.remediationAlias,
    ...(extra.redLineFlags || []),
    ...(extra.missingPrerequisites || []),
  ]);
  return `不要外派为 full-success；等待 ${blockers.join("|") || actionStatus} 清除，并替换未知项为稳定 Admin WeCom source handoff alias`;
}

function actionPackageMetadata(options = {}) {
  return {
    sourceAlias: options.sourceAlias || "local-wecom-source-controlled-smoke-operator-action-handoff",
    generatedAt: options.generatedAt || new Date().toISOString(),
    packageShape: "wecom-source-controlled-smoke-operator-action-handoff/v1",
  };
}

function redactionCategory(decision = {}) {
  return decision.redactionMetadata?.category || decision.redactionCategory || "unknown";
}

function riskCategory(decision = {}) {
  return decision.redactionMetadata?.riskCategory || decision.riskCategory || "unknown";
}

function baseResult(actionStatus, input = {}, options = {}, overrides = {}) {
  const decision = input.operatorDecisionHandoffSummary || {};
  const ownerHandoffLimits = overrides.ownerHandoffLimits || [ownerLimit(
    overrides.blockerAlias || "wecom_source_controlled_smoke_operator_action_handoff",
    nextActionFor(actionStatus),
    actionStatus === READY_ACTION_STATUS
      ? "decision package 已 ready，且 action 输入仍为本地脱敏摘要"
      : "稳定 blocker/remediation alias 已清除，且 decision package 仍为本地脱敏摘要"
  )];
  return {
    actionStatus,
    release: actionStatus === READY_ACTION_STATUS ? "release_after_report" : "hold",
    nextAction: overrides.nextAction || nextActionFor(actionStatus),
    blockerAlias: overrides.blockerAlias || (actionStatus === READY_ACTION_STATUS ? "none" : "wecom_source_operator_action_blocked"),
    remediationAlias: overrides.remediationAlias || (actionStatus === READY_ACTION_STATUS ? "wecom_source_operator_action_package_ready" : "collect_sanitized_wecom_operator_action_inputs"),
    decisionStatus: decision.status || "missing",
    resultAliases: unique(toArray(decision.resultAliases).map(normalizeAlias)),
    resultCounts: decision.resultCounts && typeof decision.resultCounts === "object"
      ? { ...decision.resultCounts }
      : {},
    redactionCategory: redactionCategory(decision),
    riskCategory: riskCategory(decision),
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
    summary.status,
    summary.blockerAlias,
    summary.remediationAlias,
    ...(Array.isArray(summary.aliases) ? summary.aliases : []),
    ...(Array.isArray(summary.resultAliases) ? summary.resultAliases : []),
  ].map(normalizeAlias).filter(Boolean));
}

function unknownAlias(input = {}) {
  return aliasesFromDecision(input.operatorDecisionHandoffSummary)
    .find((alias) => !KNOWN_ALIASES.has(alias));
}

function redLineFlagsFromDecision(summary = {}) {
  return unique(toArray(summary.redLineFlags).map((item) => normalizeAlias(item.alias || item)));
}

/**
 * 基于本地脱敏 operator decision package 生成 WeCom source owner-safe action package。
 * 该 helper 不读取真实环境、不发网络请求、不回显敏感输入，只输出稳定行动状态、owner 和下一步。
 */
function createWecomSourceControlledSmokeOperatorActionHandoff(input = {}, options = {}) {
  if (hasSensitiveEvidence(input)) {
    return baseResult("blocked", {}, options, {
      blockerAlias: "sanitization_failed",
      remediationAlias: "remove_sensitive_wecom_operator_action_evidence",
      nextSteps: [
        "移除 token、Cookie、私有 endpoint、真实账号、邮箱、手机号、完整组织树、完整响应体或 credential-like 字段",
        "用稳定 alias、计数摘要和 owner handoff limit 替代原始 evidence 后重跑",
      ],
      ownerHandoffLimits: [
        ownerLimit(
          "sanitization_failed",
          "替换疑似敏感 WeCom source operator action evidence",
          "action package 只保留脱敏 alias、状态、计数、owner 和最小解除条件"
        ),
      ],
    });
  }

  const redLineFlags = collectRedLineFlags(input);
  if (redLineFlags.length > 0) {
    const hasOverclaim = redLineFlags.some((flag) => flag.endsWith("_overclaim"));
    return baseResult("hard-red-line", input, options, {
      blockerAlias: hasOverclaim ? "full_success_overclaim" : "real_execution_signal",
      remediationAlias: hasOverclaim ? "remove_cross_owner_success_claim" : "remove_real_wecom_operator_action_signal",
      redLineFlags,
    });
  }

  const decision = input.operatorDecisionHandoffSummary;
  if (!decision) {
    return baseResult("blocked", input, options, {
      blockerAlias: "wecom_source_operator_action_decision_missing",
      remediationAlias: "collect_sanitized_wecom_operator_decision_inputs",
      missingPrerequisites: ["operatorDecisionHandoffSummary"],
    });
  }

  if (decision.status === "hard-red-line") {
    return baseResult("hard-red-line", input, options, {
      blockerAlias: decision.blockerAlias || "real_execution_signal",
      remediationAlias: decision.remediationAlias || "remove_real_wecom_operator_action_signal",
      redLineFlags: redLineFlagsFromDecision(decision),
      ownerHandoffLimits: ownerLimitsFromDecision(decision, "hard-red-line"),
    });
  }

  if (decision.status === "needs-user-action") {
    return baseResult("needs-user-action", input, options, {
      blockerAlias: decision.blockerAlias || "wecom_source_operator_action_needs_user_action",
      remediationAlias: decision.remediationAlias || "collect_sanitized_wecom_operator_action",
      ownerHandoffLimits: ownerLimitsFromDecision(decision, "needs-user-action"),
    });
  }

  if (decision.status !== READY_DECISION_STATUS || decision.release === "hold") {
    return baseResult("blocked", input, options, {
      blockerAlias: decision.blockerAlias && decision.blockerAlias !== "none"
        ? decision.blockerAlias
        : "wecom_source_operator_action_decision_missing",
      remediationAlias: decision.remediationAlias || "collect_sanitized_wecom_operator_decision_inputs",
      missingPrerequisites: ["operatorDecisionHandoffSummary:not_ready"],
      ownerHandoffLimits: ownerLimitsFromDecision(decision, "blocked"),
    });
  }

  const unknown = unknownAlias(input);
  if (unknown) {
    return baseResult("blocked", input, options, {
      blockerAlias: "unknown_wecom_source_operator_action_alias",
      remediationAlias: unknown,
      ownerHandoffLimits: [
        ownerLimit(
          "unknown_wecom_source_operator_action_alias",
          "替换未知 WeCom source operator action alias",
          "unknown alias 已替换为 spec/test 中定义的稳定 Admin WeCom source handoff alias"
        ),
      ],
    });
  }

  return baseResult(READY_ACTION_STATUS, input, options);
}

module.exports = {
  createWecomSourceControlledSmokeOperatorActionHandoff,
};
