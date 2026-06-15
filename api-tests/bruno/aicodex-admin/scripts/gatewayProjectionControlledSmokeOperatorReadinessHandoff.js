const READY_ACTION_STATUS = "ready-for-operator-action";
const READY_READINESS_STATUS = "ready-for-operator-readiness-handoff";

const KNOWN_ALIASES = new Set([
  "none",
  "operator_readiness_package_ready",
  "controlled_smoke_operator_readiness_handoff",
  "controlled_smoke_operator_readiness_action_missing",
  "controlled_smoke_operator_readiness_blocked",
  "collect_sanitized_operator_readiness_inputs",
  "ready-for-operator-action",
  "handoff_owner_safe_operator_action_package",
  "operator_action_package_ready",
  "controlled_smoke_operator_action_handoff",
  "controlled_smoke_operator_action_decision_missing",
  "controlled_smoke_operator_action_blocked",
  "collect_sanitized_operator_action_inputs",
  "collect_sanitized_operator_decision_inputs",
  "controlled_smoke_release_summary_ready",
  "controlled_smoke_release_summary_handoff",
  "controlled_smoke_result_ready_for_handoff",
  "controlled_smoke_result_evidence_handoff",
  "controlled_smoke_release_summary_needs_user_action",
  "collect_operator_release_summary_action",
  "real_execution_signal",
  "remove_real_operator_action_signal",
  "remove_real_operator_readiness_signal",
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

const CANNOT_INFER = [
  "Admin controlled smoke operator readiness handoff 只证明本地脱敏 readiness package 可交接",
  "该 handoff 不能外推为真实 publish、真实 controlled smoke、Gateway ingestion、API/Gateway/Insight 成功、authorization facts 生效或 production readiness",
  "该 handoff 不是 controlled smoke pass，也不能写成 full-success",
  "不得触发真实 endpoint、publish、Gateway ingestion、fixture/DB 写入、真实 controlled smoke、mapping confirm、read model rebuild、gate、authorization facts 或密钥变更",
];

const SENSITIVE_VALUE_PATTERNS = [
  /bearer\s+\S+/i,
  /authorization:\s*\S+/i,
  /cookie:\s*\S+/i,
  /secret:\/\//i,
  /https?:\/\/(?:localhost|127\.0\.0\.1|10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.|[^/\s]+\.internal|[^\s]+)/i,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\b(?:\+?\d[\d -]{7,}\d)\b/,
];

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
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
  return SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

// 敏感扫描只返回稳定 alias，避免把原始字段名或字段值带入 readiness package。
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
  if (["cannotinfer", "cannotinferboundaries", "donotdispatchuntil", "minimumunblockcondition", "minimumunblockconditions", "ownersafenextactions", "ownerhandofflimits", "nextsteps", "nextaction"].includes(compactKey)) {
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
    [/production-like|production\s+endpoint|production\s+environment|真实\s*endpoint|provider\s+token/i, "production_like_signal"],
    [/mapping\s+confirm|真实\s*mapping\s*confirm/i, "mapping_confirm_signal"],
    [/read\s+model\s+rebuild|read-model\s+rebuild|真实\s*read\s*model/i, "read_model_rebuild_signal"],
    [/real\s+gate|真实\s*gate/i, "real_gate_signal"],
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

function ownerLimitsFromAction(summary = {}, fallbackStatus = "blocked") {
  const limits = Array.isArray(summary.ownerHandoffLimits) ? summary.ownerHandoffLimits : [];
  if (limits.length > 0) {
    return limits.map((item) => ownerLimit(
      actionableAlias(item.alias, actionableAlias(summary.blockerAlias, "controlled_smoke_operator_readiness_blocked")),
      item.nextAction || nextActionFor(fallbackStatus),
      item.minimumUnblockCondition || item.condition || "稳定 owner-scoped alias 已清除且无 red-line signal",
      item.owner || "admin_operator"
    ));
  }
  return [ownerLimit(
    actionableAlias(summary.blockerAlias, "controlled_smoke_operator_readiness_blocked"),
    nextActionFor(fallbackStatus),
    "稳定 blocker/remediation alias 已清除，且 action package 仍为本地脱敏摘要"
  )];
}

function minimumConditions(ownerHandoffLimits = []) {
  return ownerHandoffLimits.map((item) => ({
    alias: item.alias,
    owner: item.owner,
    condition: item.minimumUnblockCondition,
  })).filter((item) => item.alias || item.owner || item.condition);
}

function nextActionFor(readinessStatus) {
  if (readinessStatus === READY_READINESS_STATUS) {
    return "handoff_owner_safe_operator_readiness_package";
  }
  if (readinessStatus === "needs-user-action") {
    return "collect_user_action_then_regenerate_readiness_package";
  }
  if (readinessStatus === "hard-red-line") {
    return "stop_dispatch_and_remove_red_line_signal";
  }
  return "clear_blocker_then_regenerate_readiness_package";
}

function ownerSafeNextActionsFor(readinessStatus) {
  if (readinessStatus === READY_READINESS_STATUS) {
    return [
      "复制本地脱敏 operator readiness package 给值班 operator",
      "只传播 readinessStatus、readyChecks、stable alias、owner、最小解除条件、evidenceReferences 和不能外推边界",
      "继续声明未证明真实 controlled smoke pass、full-success、production readiness、Gateway ingestion 或 authorization facts",
    ];
  }
  if (readinessStatus === "needs-user-action") {
    return [
      "补齐用户动作或 approval alias 后重跑 operator readiness handoff",
      "用户动作未清除前不得把 readiness package 标记为 ready",
    ];
  }
  if (readinessStatus === "hard-red-line") {
    return [
      "删除真实 publish、真实 controlled smoke、Gateway ingestion、authorization facts、fixture/DB、mapping confirm、read model rebuild、gate 或 full-success 外推信号",
      "仅保留本地脱敏 alias、计数、owner、evidence references 和最小解除条件后重跑 readiness handoff",
    ];
  }
  return [
    "清除 stable blocker/remediation alias 后重跑 operator readiness handoff",
    "只收集本地脱敏 action package，不补充真实 endpoint、token、fixture、DB 或完整响应体",
  ];
}

function doNotDispatchUntil(readinessStatus, extra = {}) {
  if (readinessStatus === READY_READINESS_STATUS) {
    return "只可交接本地脱敏 operator readiness package；不要外派为 controlled smoke pass、full-success、生产就绪、真实 publish、Gateway ingestion、authorization facts 或 API/Gateway/Insight 成功";
  }
  const blockers = unique([
    extra.blockedAlias,
    extra.remediationAlias,
    ...(extra.redLineFlags || []),
    ...(extra.missingPrerequisites || []),
  ]);
  return `不要外派为 full-success；等待 ${blockers.join("|") || readinessStatus} 清除，并替换未知项为稳定 Admin owner handoff alias`;
}

function readinessPackageMetadata(options = {}) {
  return {
    sourceAlias: options.sourceAlias || "local-controlled-smoke-operator-readiness-handoff",
    generatedAt: options.generatedAt || new Date().toISOString(),
    packageShape: "admin-gateway-projection-controlled-smoke-operator-readiness-handoff/v1",
  };
}

function readyChecksFor(readinessStatus, action = {}) {
  if (readinessStatus !== READY_READINESS_STATUS) {
    return [];
  }
  return [
    { alias: "action_package_ready", status: "passed", observed: action.actionStatus },
    { alias: "release_after_report", status: "passed", observed: action.release },
    { alias: "redaction_clean", status: "passed", observed: action.redactionCategory || "unknown" },
    { alias: "no_real_execution_signal", status: "passed" },
    { alias: "no_cross_owner_overclaim", status: "passed" },
    { alias: "owner_boundary_retained", status: "passed", owner: "admin_operator" },
  ];
}

function evidenceReferencesFromAction(action = {}) {
  const metadata = action.actionPackageMetadata || {};
  return [{
    sourceAlias: metadata.sourceAlias || "local-controlled-smoke-operator-action-handoff",
    generatedAt: metadata.generatedAt,
    packageShape: metadata.packageShape || "admin-gateway-projection-controlled-smoke-operator-action-handoff/v1",
    actionStatus: action.actionStatus || "missing",
    blockerAlias: action.blockerAlias || "none",
    remediationAlias: action.remediationAlias || "none",
    redactionCategory: action.redactionCategory || "unknown",
    riskCategory: action.riskCategory || "unknown",
    releaseSummaryCounts: action.releaseSummaryCounts && typeof action.releaseSummaryCounts === "object"
      ? { ...action.releaseSummaryCounts }
      : {},
    resultCounts: action.resultCounts && typeof action.resultCounts === "object"
      ? { ...action.resultCounts }
      : {},
  }];
}

function baseResult(readinessStatus, input = {}, options = {}, overrides = {}) {
  const action = input.operatorActionHandoffSummary || {};
  const ownerHandoffLimits = overrides.ownerHandoffLimits || [ownerLimit(
    overrides.blockedAlias || "controlled_smoke_operator_readiness_handoff",
    nextActionFor(readinessStatus),
    readinessStatus === READY_READINESS_STATUS
      ? "action package 已 ready，且 readiness 输入仍为本地脱敏摘要"
      : "稳定 blocker/remediation alias 已清除，且 action package 仍为本地脱敏摘要"
  )];
  return {
    readinessStatus,
    release: readinessStatus === READY_READINESS_STATUS ? "release_after_report" : "hold",
    nextAction: overrides.nextAction || nextActionFor(readinessStatus),
    blockedAlias: overrides.blockedAlias || (readinessStatus === READY_READINESS_STATUS ? "none" : "controlled_smoke_operator_readiness_blocked"),
    remediationAlias: overrides.remediationAlias || (readinessStatus === READY_READINESS_STATUS ? "operator_readiness_package_ready" : "collect_sanitized_operator_readiness_inputs"),
    actionStatus: action.actionStatus || "missing",
    readyChecks: readyChecksFor(readinessStatus, action),
    ownerSafeNextActions: unique(overrides.ownerSafeNextActions || ownerSafeNextActionsFor(readinessStatus)),
    ownerHandoffLimits,
    minimumUnblockConditions: minimumConditions(ownerHandoffLimits),
    evidenceReferences: overrides.evidenceReferences || evidenceReferencesFromAction(action),
    redLineFlags: unique(overrides.redLineFlags),
    missingPrerequisites: unique(overrides.missingPrerequisites),
    cannotInfer: CANNOT_INFER,
    cannotInferBoundaries: CANNOT_INFER,
    readinessPackageMetadata: readinessPackageMetadata(options),
    doNotDispatchUntil: overrides.doNotDispatchUntil || doNotDispatchUntil(readinessStatus, overrides),
  };
}

function aliasesFromAction(summary = {}) {
  return unique([
    summary.alias,
    summary.reason,
    summary.reasonAlias,
    summary.actionStatus,
    summary.nextAction,
    summary.blockerAlias,
    summary.remediationAlias,
    ...(Array.isArray(summary.aliases) ? summary.aliases : []),
    ...(Array.isArray(summary.resultAliases) ? summary.resultAliases : []),
    ...(Array.isArray(summary.releaseSummaryAliases) ? summary.releaseSummaryAliases : []),
  ].map((item) => String(item || "").trim()).filter((item) => item && item !== "null"));
}

function unknownAlias(input = {}) {
  return aliasesFromAction(input.operatorActionHandoffSummary)
    .find((alias) => !KNOWN_ALIASES.has(alias));
}

/**
 * 基于本地脱敏 operator action package 生成最终 readiness package。
 * 该 helper 不读取真实环境、不发网络请求、不回显敏感输入，只输出稳定 readiness、owner 和最小解除条件。
 */
function createGatewayProjectionControlledSmokeOperatorReadinessHandoff(input = {}, options = {}) {
  const realSignalFlags = collectRealSignalFlags(input);
  const overclaimFlags = collectOverclaimFlags(input);
  const redLineFlags = unique([...realSignalFlags, ...overclaimFlags]);
  if (redLineFlags.length > 0) {
    return baseResult("hard-red-line", input, options, {
      blockedAlias: overclaimFlags.length > 0 ? "full_success_overclaim" : "real_execution_signal",
      remediationAlias: overclaimFlags.length > 0 ? "remove_cross_owner_success_claim" : "remove_real_operator_readiness_signal",
      redLineFlags,
    });
  }

  if (hasSensitiveEvidence(input)) {
    return baseResult("blocked", {}, options, {
      blockedAlias: "sanitization_failed",
      remediationAlias: "remove_sensitive_operator_readiness_evidence",
      ownerSafeNextActions: [
        "移除 token、Cookie、私有 endpoint、真实账号、邮箱、手机号、完整组织树、完整响应体或 credential-like 字段",
        "用稳定 alias、计数摘要、owner handoff limit 和脱敏 evidence references 替代原始 evidence 后重跑",
      ],
      ownerHandoffLimits: [
        ownerLimit(
          "sanitization_failed",
          "替换疑似敏感 operator readiness evidence",
          "readiness package 只保留脱敏 alias、状态、计数、owner、evidence references 和最小解除条件"
        ),
      ],
      evidenceReferences: [],
    });
  }

  const action = input.operatorActionHandoffSummary;
  if (!action) {
    return baseResult("blocked", input, options, {
      blockedAlias: "controlled_smoke_operator_readiness_action_missing",
      remediationAlias: "collect_sanitized_operator_action_inputs",
      missingPrerequisites: ["operatorActionHandoffSummary"],
      evidenceReferences: [],
    });
  }

  if (action.actionStatus === "hard-red-line") {
    return baseResult("hard-red-line", input, options, {
      blockedAlias: action.blockerAlias || "real_execution_signal",
      remediationAlias: action.remediationAlias || "remove_real_operator_readiness_signal",
      redLineFlags: action.redLineFlags || [],
      ownerHandoffLimits: ownerLimitsFromAction(action, "hard-red-line"),
    });
  }

  if (action.actionStatus === "needs-user-action") {
    return baseResult("needs-user-action", input, options, {
      blockedAlias: action.blockerAlias || "controlled_smoke_operator_readiness_needs_user_action",
      remediationAlias: action.remediationAlias || "collect_operator_readiness_action",
      ownerHandoffLimits: ownerLimitsFromAction(action, "needs-user-action"),
    });
  }

  if (action.actionStatus !== READY_ACTION_STATUS || action.release === "hold") {
    return baseResult("blocked", input, options, {
      blockedAlias: action.blockerAlias && action.blockerAlias !== "none"
        ? action.blockerAlias
        : "controlled_smoke_operator_readiness_action_missing",
      remediationAlias: action.remediationAlias || "collect_sanitized_operator_action_inputs",
      missingPrerequisites: ["operatorActionHandoffSummary:not_ready"],
      ownerHandoffLimits: ownerLimitsFromAction(action, "blocked"),
    });
  }

  const unknown = unknownAlias(input);
  if (unknown) {
    return baseResult("blocked", input, options, {
      blockedAlias: "unknown_controlled_smoke_operator_readiness_alias",
      remediationAlias: unknown,
      ownerHandoffLimits: [
        ownerLimit(
          "unknown_controlled_smoke_operator_readiness_alias",
          "替换未知 operator readiness alias",
          "unknown alias 已替换为 spec/test 中定义的稳定 Admin owner handoff alias"
        ),
      ],
    });
  }

  return baseResult(READY_READINESS_STATUS, input, options);
}

module.exports = {
  createGatewayProjectionControlledSmokeOperatorReadinessHandoff,
};
