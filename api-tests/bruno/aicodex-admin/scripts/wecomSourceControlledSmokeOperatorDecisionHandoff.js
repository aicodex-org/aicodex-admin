const READY_DECISION_STATUS = "ready-for-operator-decision-handoff";

const READY_EXPECTATIONS = {
  preflightSummary: {
    readyStatuses: new Set(["ready-for-wecom-controlled-smoke-preflight", "ready"]),
    missingAlias: "missing_preflight_summary",
    blockerFallback: "wecom_source_controlled_smoke_preflight_not_ready",
    remediationAlias: "rerun_wecom_source_controlled_smoke_preflight",
    minimumUnblockCondition: "运行 Controlled Smoke Preflight.yml 并取得 ready-for-wecom-controlled-smoke-preflight",
  },
  executionHandoffSummary: {
    readyStatuses: new Set(["ready-for-controlled-smoke-execution-handoff", "ready"]),
    missingAlias: "missing_execution_handoff_summary",
    blockerFallback: "wecom_source_controlled_smoke_execution_handoff_not_ready",
    remediationAlias: "rerun_wecom_source_execution_handoff",
    minimumUnblockCondition: "运行 Controlled Smoke Execution Handoff.yml 并取得 ready-for-controlled-smoke-execution-handoff",
  },
  resultEvidenceHandoffSummary: {
    readyStatuses: new Set(["passed"]),
    missingAlias: "missing_result_evidence_handoff_summary",
    blockerFallback: "wecom_source_controlled_smoke_result_evidence_not_passed",
    remediationAlias: "rerun_wecom_source_result_evidence_handoff",
    minimumUnblockCondition: "运行 Controlled Smoke Result Evidence Handoff.yml 并取得 passed",
  },
  operatorRemediationHandoffSummary: {
    readyStatuses: new Set(["ready"]),
    missingAlias: "missing_operator_remediation_handoff_summary",
    blockerFallback: "wecom_source_operator_remediation_handoff_not_ready",
    remediationAlias: "rerun_wecom_source_operator_remediation_handoff",
    minimumUnblockCondition: "运行 Operator Remediation Handoff.yml 并取得 ready",
  },
  operatorTriageHandoffSummary: {
    readyStatuses: new Set(["ready-for-operator-triage-handoff", "ready"]),
    missingAlias: "missing_operator_triage_handoff_summary",
    blockerFallback: "wecom_source_operator_triage_handoff_not_ready",
    remediationAlias: "rerun_wecom_source_operator_triage_handoff",
    minimumUnblockCondition: "运行 Controlled Smoke Operator Triage Handoff.yml 并取得 ready-for-operator-triage-handoff",
  },
};

const KNOWN_ALIASES = new Set([
  "none",
  "passed",
  "ready",
  "release_after_report",
  "ready-for-wecom-controlled-smoke-preflight",
  "ready-for-controlled-smoke-execution-handoff",
  "ready-for-operator-triage-handoff",
  "wecom_source_controlled_smoke_result_passed",
  "wecom_source_controlled_smoke_result_passed_with_observations",
  "wecom_source_operator_triage_package_ready",
  "wecom_source_operator_remediation_handoff",
  "wecom_source_controlled_smoke_operator_triage_handoff",
  "wecom_source_controlled_smoke_operator_decision_handoff",
  "wecom_source_operator_decision_package_ready",
]);

const SAFE_TEXT_KEYS = new Set([
  "cannotinferboundaries",
  "donotdispatchuntil",
  "minimumunblockcondition",
  "minimumunblockconditions",
  "nextoptions",
  "nextsteps",
  "ownerhandofflimits",
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

const CANNOT_INFER_BOUNDARIES = [
  "Admin WeCom source operator decision handoff 只证明本地脱敏 decision package 可交接",
  "该 handoff 不能外推为真实 WeCom 同步成功、组织树非空、Gateway/API/Insight 成功、authorization facts 生效或生产就绪",
  "该 handoff 不是 controlled smoke pass，也不能写成 full-success",
  "不得触发真实 WeCom 同步、真实 controlled smoke、真实 fixture/DB、synthetic audit/projection、Gateway ingestion、API/Insight/Gateway 读取、authorization facts、provider token、真实 gate 或密钥变更",
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
    preflightSummary: input.preflightSummary,
    executionHandoffSummary: input.executionHandoffSummary,
    resultEvidenceHandoffSummary: input.resultEvidenceHandoffSummary,
    operatorRemediationHandoffSummary: input.operatorRemediationHandoffSummary,
    operatorTriageHandoffSummary: input.operatorTriageHandoffSummary,
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
  ];
  const lowerText = text.toLowerCase();
  return unique(checks
    .filter(([pattern]) => {
      const match = text.match(pattern);
      return match && !hasNegatedBoundary(lowerText, match[0].toLowerCase());
    })
    .map(([, flag]) => flag));
}

function redLineFlagsFromSummaries(input = {}) {
  return unique([
    ...toArray(input.executionHandoffSummary?.hardRedLineFlags),
    ...toArray(input.resultEvidenceHandoffSummary?.redLineFlags),
    ...toArray(input.operatorRemediationHandoffSummary?.redLineFlags),
    ...toArray(input.operatorTriageHandoffSummary?.redLineFlags),
  ].map((item) => normalizeAlias(item.alias || item)));
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
    condition: item.minimumUnblockCondition || item.condition,
  })).filter((item) => item.alias || item.owner || item.condition);
}

function readyOwnerLimits() {
  return [ownerLimit(
    "wecom_source_controlled_smoke_operator_decision_handoff",
    "复制本地脱敏 decision package 给 operator/release 负责人复核",
    "preflight、execution、result evidence、operator remediation 和 operator triage 均 ready，且无 red-line signal"
  )];
}

function decisionPackageMetadata(options = {}) {
  return {
    sourceAlias: options.sourceAlias || "local-wecom-source-controlled-smoke-operator-decision-handoff",
    generatedAt: options.generatedAt || new Date().toISOString(),
    packageShape: "wecom-source-controlled-smoke-operator-decision-handoff/v1",
  };
}

function redactionMetadata(input = {}, rejectedSensitiveEvidence = false) {
  return {
    category: rejectedSensitiveEvidence ? "rejected" : normalizeAlias(input.resultEvidenceHandoffSummary?.redactionCategory || input.operatorTriageHandoffSummary?.redactionCategory || "redacted"),
    riskCategory: rejectedSensitiveEvidence ? "unknown" : normalizeAlias(input.resultEvidenceHandoffSummary?.riskCategory || input.operatorTriageHandoffSummary?.riskCategory || "unknown"),
    rejectedSensitiveEvidence,
    summaryOnly: true,
  };
}

function nextOptionsFor(status) {
  if (status === READY_DECISION_STATUS) {
    return [
      "复制本地脱敏 decision package 给 operator/release 负责人复核",
      "只传播 decisionStatus、decisionOptions、stable alias、owner、最小解除条件、redaction metadata 和不能外推边界",
      "继续声明未证明真实 WeCom 同步成功、组织树非空、controlled smoke pass、full-success、生产就绪或 Gateway/API/Insight 成功",
    ];
  }
  if (status === "needs-user-action") {
    return [
      "补齐用户动作、missing prerequisite 或 approval alias 后重跑本地 WeCom source operator decision handoff",
      "用户动作未清除前不得把 decision package 标记为 ready",
    ];
  }
  if (status === "hard-red-line") {
    return [
      "删除真实 WeCom 同步、真实 controlled smoke、真实 fixture/DB、Gateway/API/Insight、authorization facts、生产就绪、controlled smoke pass 或 full-success 外推信号",
      "仅保留本地脱敏 alias、计数、owner 和最小解除条件后重跑 decision handoff",
    ];
  }
  return [
    "清除 stable blocker/remediation alias 后重跑 WeCom source operator decision handoff",
    "只收集本地脱敏 preflight/execution/result/remediation/triage evidence，不补充真实 endpoint、token、fixture、DB 或完整响应体",
  ];
}

function doNotDispatchUntil(status, extra = {}) {
  if (status === READY_DECISION_STATUS) {
    return "只可交接本地脱敏 WeCom source operator decision package；不要外派为 controlled smoke pass、full-success、生产就绪、真实 WeCom 同步成功、组织树非空、Gateway/API/Insight 成功或 authorization facts 生效";
  }
  const blockers = unique([
    extra.blockerAlias,
    extra.remediationAlias,
    ...(extra.redLineFlags || []),
    ...(extra.missingPrerequisites || []),
  ]);
  return `不要外派为 full-success；等待 ${blockers.join("|") || status} 清除，并替换未知项为稳定 Admin WeCom source handoff alias`;
}

function baseResult(status, input = {}, options = {}, overrides = {}) {
  const ownerHandoffLimits = overrides.ownerHandoffLimits || readyOwnerLimits();
  const blockerAlias = overrides.blockerAlias || (status === READY_DECISION_STATUS ? "none" : "wecom_source_operator_decision_blocked");
  const remediationAlias = overrides.remediationAlias || (status === READY_DECISION_STATUS ? "wecom_source_operator_decision_package_ready" : "collect_sanitized_wecom_operator_decision_inputs");
  const redLineFlags = unique(overrides.redLineFlags);
  const missingPrerequisites = unique(overrides.missingPrerequisites);
  return {
    status,
    release: status === READY_DECISION_STATUS ? "release_after_report" : "hold",
    decisionStatus: overrides.decisionStatus || (status === READY_DECISION_STATUS ? "ready-for-operator-release-decision" : status),
    blockerAlias,
    remediationAlias,
    decisionOptions: unique(overrides.decisionOptions || (status === READY_DECISION_STATUS ? [
      "handoff_to_release_operator",
      "hold_if_any_owner_reclassifies_evidence",
    ] : ["hold_until_local_evidence_ready"])),
    nextOptions: unique(overrides.nextOptions || nextOptionsFor(status)),
    ownerHandoffLimits,
    minimumUnblockConditions: overrides.minimumUnblockConditions || minimumConditions(ownerHandoffLimits),
    redLineFlags,
    missingPrerequisites,
    redactionMetadata: redactionMetadata(input, overrides.rejectedSensitiveEvidence === true),
    cannotInferBoundaries: CANNOT_INFER_BOUNDARIES,
    decisionPackageMetadata: decisionPackageMetadata(options),
    doNotDispatchUntil: overrides.doNotDispatchUntil || doNotDispatchUntil(status, {
      blockerAlias,
      remediationAlias,
      redLineFlags,
      missingPrerequisites,
    }),
  };
}

function summaryStatus(summary = {}) {
  return normalizeAlias(summary.status || summary.decision || summary.release);
}

function aliasFromSummary(summary = {}, fallback) {
  return normalizeAlias(
    summary.blockerAlias ||
    summary.reasonAlias ||
    summary.remediationAlias ||
    summary.status ||
    fallback
  );
}

function safeOwnerLimitsFrom(summary = {}, fallbackAlias, nextAction, minimumUnblockCondition) {
  const limits = [
    ...toArray(summary.ownerHandoffLimits),
    ...toArray(summary.ownerHandoffs),
  ];
  if (limits.length > 0) {
    return limits.map((item) => ownerLimit(
      item.alias || fallbackAlias,
      item.nextAction || nextAction,
      item.minimumUnblockCondition || item.condition || minimumUnblockCondition,
      item.owner || "admin_operator"
    ));
  }
  return [ownerLimit(fallbackAlias, nextAction, minimumUnblockCondition)];
}

function missingPrerequisite(input = {}) {
  return Object.entries(READY_EXPECTATIONS).find(([key]) => !input[key]);
}

function notReadyPrerequisite(input = {}) {
  return Object.entries(READY_EXPECTATIONS).find(([key, expectation]) => {
    const summary = input[key];
    return summary && !expectation.readyStatuses.has(summaryStatus(summary));
  });
}

function unknownAliasIn(input = {}) {
  const aliasCandidates = [
    input.preflightSummary?.reasonAlias,
    input.executionHandoffSummary?.reasonAlias,
    input.resultEvidenceHandoffSummary?.reasonAlias,
    input.operatorRemediationHandoffSummary?.reasonAlias,
    input.operatorTriageHandoffSummary?.blockerAlias,
    input.operatorTriageHandoffSummary?.remediationAlias,
    ...toArray(input.resultEvidenceHandoffSummary?.resultAliases),
    ...toArray(input.operatorTriageHandoffSummary?.resultAliases),
    ...toArray(input.operatorTriageHandoffSummary?.remediationAliases),
    ...toArray(input.operatorTriageHandoffSummary?.ownerHandoffLimits).map((item) => item.alias),
  ].map(normalizeAlias).filter(Boolean);
  return aliasCandidates.find((alias) => !KNOWN_ALIASES.has(alias));
}

/**
 * 生成本地脱敏 WeCom source controlled-smoke operator decision package。
 * 该 helper 只汇总前序 summary，不读取真实环境、不发网络请求、不回显敏感输入。
 */
function createWecomSourceControlledSmokeOperatorDecisionHandoff(input = {}, options = {}) {
  if (hasSensitiveEvidence(input)) {
    return baseResult("blocked", {}, options, {
      blockerAlias: "sanitization_failed",
      remediationAlias: "remove_sensitive_wecom_operator_decision_evidence",
      rejectedSensitiveEvidence: true,
      nextOptions: [
        "移除 token、Cookie、私有 endpoint、真实账号、邮箱、手机号、完整组织树、完整响应体或 credential-like 字段",
        "用稳定 alias、计数摘要、redaction metadata 和 owner handoff limit 替代原始 evidence 后重跑",
      ],
      ownerHandoffLimits: [
        ownerLimit(
          "sanitization_failed",
          "替换疑似敏感 WeCom source operator decision evidence",
          "decision package 只保留脱敏 alias、状态、计数、owner、redaction metadata 和最小解除条件"
        ),
      ],
    });
  }

  const redLineFlags = unique([...collectRedLineFlags(input), ...redLineFlagsFromSummaries(input)]);
  if (redLineFlags.length > 0) {
    const blockerAlias = redLineFlags.includes("real_sync_signal") || redLineFlags.includes("real_controlled_smoke_signal")
      ? "real_execution_signal"
      : "full_success_overclaim";
    return baseResult("hard-red-line", input, options, {
      blockerAlias,
      remediationAlias: "remove_real_wecom_operator_decision_signal",
      redLineFlags,
      ownerHandoffLimits: [
        ownerLimit(
          blockerAlias,
          "删除真实执行、下游成功、生产就绪、controlled smoke pass 或 full-success 外推信号",
          "decision 输入只包含本地脱敏 summary、stable alias、计数和 owner handoff"
        ),
      ],
    });
  }

  const missing = missingPrerequisite(input);
  if (missing) {
    const [key, expectation] = missing;
    return baseResult("needs-user-action", input, options, {
      blockerAlias: expectation.missingAlias,
      remediationAlias: expectation.remediationAlias,
      missingPrerequisites: [key],
      ownerHandoffLimits: [
        ownerLimit(
          expectation.missingAlias,
          `补齐 ${key} 脱敏 summary`,
          expectation.minimumUnblockCondition
        ),
      ],
    });
  }

  const notReady = notReadyPrerequisite(input);
  if (notReady) {
    const [key, expectation] = notReady;
    const summary = input[key] || {};
    const upstreamStatus = summaryStatus(summary);
    const status = upstreamStatus === "needs-user-action" || upstreamStatus === "hard-red-line"
      ? upstreamStatus
      : "blocked";
    const blockerAlias = aliasFromSummary(summary, expectation.blockerFallback);
    return baseResult(status, input, options, {
      blockerAlias,
      remediationAlias: expectation.remediationAlias,
      ownerHandoffLimits: safeOwnerLimitsFrom(
        summary,
        blockerAlias,
        `重跑 ${key} 对应的本地 helper`,
        expectation.minimumUnblockCondition
      ),
      nextOptions: nextOptionsFor(status),
    });
  }

  const unknown = unknownAliasIn(input);
  if (unknown) {
    return baseResult("blocked", input, options, {
      blockerAlias: "unknown_wecom_source_operator_decision_alias",
      remediationAlias: unknown,
      ownerHandoffLimits: [
        ownerLimit(
          "unknown_wecom_source_operator_decision_alias",
          "替换未知 WeCom source operator decision alias",
          "unknown alias 已替换为 spec/test 中定义的稳定 Admin WeCom source handoff alias"
        ),
      ],
    });
  }

  return baseResult(READY_DECISION_STATUS, input, options);
}

module.exports = {
  createWecomSourceControlledSmokeOperatorDecisionHandoff,
};
