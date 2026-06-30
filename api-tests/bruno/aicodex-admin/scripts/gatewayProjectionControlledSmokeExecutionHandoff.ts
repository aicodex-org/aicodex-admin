const READY_PREFLIGHT_ALIAS = "ready-for-controlled-smoke-prep";
const READY_EXECUTION_STATUS = "ready-for-controlled-smoke-execution";

const CANNOT_INFER_BOUNDARIES = [
  "Admin controlled smoke execution handoff 只证明本地脱敏执行前交接包已准备",
  "该 handoff 不能外推为 API/Gateway/Insight 成功、production readiness、真实 publish 成功、gateway ingestion 成功或 authorization facts 生效",
  "该 handoff 不是 controlled smoke 已通过，也不能写成 full-success",
  "不得触发真实 endpoint、publish、refresh、gateway ingestion、authorization facts、真实 fixture/DB 写入、read model rebuild、mapping confirm、真实 gate 或密钥变更",
  "subjectCount>=1、Gateway allow、API authorization report full-success、Insight success 或生产 readiness 不能由 Admin helper 推断",
];

const KNOWN_ALIASES = new Set([
  "ready_for_controlled_smoke_prep",
  "controlled_smoke_evidence_ready_for_review",
  "controlled_smoke_release_runbook_ready",
  "operator_remediation_handoff_ready",
  "controlled_smoke_execution_prerequisites_clear",
  "remediation_result_evidence_ready",
  "mapping_missing",
  "mapping_remediation_cleared",
  "mapping_confirmed_api_user_id",
  "mapping_status_trusted",
  "lifecycle_readiness_confirmed",
  "source_freshness_remediation_cleared",
  "source_snapshot_fresh",
  "org_sync_batch_fresh",
  "source_version_freshness_confirmed",
  "deploy_runtime_shape_confirmed",
  "current_observability_shape_confirmed",
  "fixture_authorized",
  "subject_count_ge_1_authorized",
  "active_fixture_authorized",
  "tombstone_fixture_authorized",
  "controlled_smoke_evidence_prerequisites_clear",
  "api_diagnostics_clear",
]);

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
  "rawgatewayresponse",
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

function normalizeKey(key) {
  return String(key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function generatedAt(options: LooseRecord = {}) {
  return options.generatedAt || new Date().toISOString();
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
  return /不得|不能|不是|不是真实|not\s+(?:real\s+)?(?:publish|full-success|full success|gateway ingestion|authorization facts|api success|gateway success|insight success|production ready|production readiness)/i.test(text);
}

function redLineFlagsFromText(text) {
  if (!text || isNegatedBoundary(text)) {
    return [];
  }
  const flags = [];
  if (/\b(real\s+)?fixture\b/i.test(text)) {
    flags.push("real_fixture_signal");
  }
  if (/\b(db|database)\b.*\b(write|mutate|cleanup|delete|insert|update)\b/i.test(text) ||
      /\b(write|mutate|cleanup|delete|insert|update)\b.*\b(db|database)\b/i.test(text)) {
    flags.push("real_db_write_signal");
  }
  if (/production|prod-like|production-like|类生产|生产/i.test(text)) {
    flags.push("production_like_signal");
  }
  if (/\b(real\s+)?gate\b|真实\s*gate|secret change|key change|密钥变更/i.test(text)) {
    flags.push("real_gate_signal");
  }
  if (/(trigger|execute|run|perform|start|create|write|rebuild|refresh|publish|ingest|confirm)\b.*\b(real|publish|ingestion|authorization facts|read model|mapping|endpoint)\b/i.test(text) ||
      /\b(real|publish|ingestion|authorization facts|read model|mapping|endpoint)\b.*\b(trigger|execute|run|perform|start|create|write|rebuild|refresh|publish|ingest|confirm)\b/i.test(text)) {
    flags.push("real_environment_write_signal");
  }
  return flags;
}

function fullSuccessFlagsFromText(text) {
  if (!text || isNegatedBoundary(text)) {
    return [];
  }
  return /full[-\s]?success|controlled smoke success|production ready|production readiness|gateway allow|api authorization report full-success|api success|gateway success|insight success|authorization facts success|gateway ingestion success|real publish success/i.test(text)
    ? ["full_success_overclaim"]
    : [];
}

function collectTextFlags(value, callback, key = "") {
  const normalizedKey = normalizeKey(key);
  if (["cannotinferboundaries", "donotdispatchuntil", "minimumunblockcondition", "minimumunblockconditions", "ownerhandofflimits", "operatoractions"].includes(normalizedKey)) {
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

function aliasesFrom(value: LooseRecord = {}) {
  if (!hasObject(value)) {
    return [];
  }
  return unique([
    value.alias,
    value.reason,
    value.reasonAlias,
    value.decision,
    ...(Array.isArray(value.aliases) ? value.aliases : []),
    ...(Array.isArray(value.evidenceAliases) ? value.evidenceAliases : []),
    ...(Array.isArray(value.blockingAliases) ? value.blockingAliases : []),
  ].map((item) => String(item || "").trim()));
}

function sourceAlias(options: LooseRecord = {}) {
  return options.sourceAlias || "gateway_projection_controlled_smoke_execution_handoff";
}

function releaseFor(status) {
  return status === READY_EXECUTION_STATUS ? "release_after_report" : "hold";
}

function ownerLimitFromHandoff(handoff: LooseRecord = {}, fallbackAlias = "controlled_smoke_execution_prerequisite_missing", fallbackOwner = "admin_operator") {
  return {
    alias: handoff.alias || fallbackAlias,
    owner: handoff.owner || fallbackOwner,
    nextAction: handoff.nextAction || handoff.safeNextAction || "补齐只读脱敏 controlled smoke execution evidence handoff",
    minimumUnblockCondition: handoff.minimumUnblockCondition || handoff.condition || "稳定 owner-scoped alias 已清除且无 red-line signal",
    boundary: "Admin local-only handoff；不得要求 API、Insight 或 Gateway owner 由 Admin helper 推断成功",
  };
}

function ownerLimitsFromSummaries(input: LooseRecord = {}) {
  const summaries = [
    input.preflightSummary,
    input.evidenceReadinessSummary,
    input.releaseRunbookSummary,
    input.operatorRemediationHandoffSummary,
    input.remediationResultEvidenceHandoffSummary,
  ];
  const limits = summaries.flatMap((summary) => {
    const handoffs = Array.isArray(summary?.ownerHandoffs) ? summary.ownerHandoffs : [];
    return handoffs.map((handoff) => ownerLimitFromHandoff(handoff, aliasesFrom(summary)[0], handoff.owner));
  });
  if (limits.length > 0) {
    return limits;
  }
  return [ownerLimitFromHandoff({
    alias: "controlled_smoke_execution_admin_boundary",
    owner: "admin_operator",
    nextAction: "仅交接脱敏执行前证据，不执行真实 smoke",
    minimumUnblockCondition: "全部 upstream handoff summary 均为 ready 且无 red-line signal",
  })];
}

function evidencePackageMetadata(input: LooseRecord = {}, options: LooseRecord = {}) {
  return {
    sourceAlias: sourceAlias(options),
    generatedAt: generatedAt(options),
    includedSummaries: [
      "controlled_smoke_preflight",
      "controlled_smoke_evidence_readiness",
      "controlled_smoke_release_runbook",
      "operator_remediation_handoff",
      "remediation_result_evidence_handoff",
    ].filter((_, index) => [
      input.preflightSummary,
      input.evidenceReadinessSummary,
      input.releaseRunbookSummary,
      input.operatorRemediationHandoffSummary,
      input.remediationResultEvidenceHandoffSummary,
    ][index]),
    packageShape: "admin-gateway-projection-controlled-smoke-execution-handoff/v1",
  };
}

function buildResult(status, input: LooseRecord = {}, options: LooseRecord = {}, extra: LooseRecord = {}) {
  return {
    status,
    release: releaseFor(status),
    blockerAlias: extra.blockerAlias || "none",
    remediationAlias: extra.remediationAlias || (status === READY_EXECUTION_STATUS ? "controlled_smoke_execution_prerequisites_clear" : "controlled_smoke_execution_evidence_required"),
    missingPrerequisites: extra.missingPrerequisites || [],
    operatorActions: extra.operatorActions || operatorActionsFor(status),
    ownerHandoffLimits: extra.ownerHandoffLimits || ownerLimitsFromSummaries(input),
    redLineFlags: extra.redLineFlags || [],
    cannotInferBoundaries: CANNOT_INFER_BOUNDARIES,
    evidencePackageMetadata: evidencePackageMetadata(input, options),
    doNotDispatchUntil: doNotDispatchUntil(status, extra),
  };
}

function operatorActionsFor(status) {
  switch (status) {
  case READY_EXECUTION_STATUS:
    return [
      "Proceed only with controlled smoke execution preparation using the approved operator runbook",
      "回传时只写 bounded status、stable alias、owner、minimum unblock condition 和环境别名",
      "继续声明未证明 API/Gateway/Insight 成功、production readiness、authorization facts 或 full-success",
    ];
  case "hard-red-line":
    return [
      "删除真实执行、真实 gate、fixture/DB/production-like 写入或 full-success 外推信号",
      "重新收集只读脱敏 evidence summary 后再生成 execution handoff",
    ];
  default:
    return [
      "补齐 preflight、evidence readiness、release runbook、operator remediation 和 remediation result 的只读脱敏摘要",
      "按 owner handoff limits 清除 stable blocker/remediation alias 后重跑 execution handoff",
    ];
  }
}

function doNotDispatchUntil(status, extra: LooseRecord = {}) {
  if (status === READY_EXECUTION_STATUS) {
    return "只可进入 controlled smoke execution preparation；不要外派为 controlled smoke passed、full-success、真实 publish、gateway ingestion、authorization facts、API/Gateway/Insight 成功或生产就绪";
  }
  const blockers = unique([
    extra.blockerAlias,
    extra.remediationAlias,
    ...(extra.missingPrerequisites || []),
    ...(extra.redLineFlags || []),
  ]);
  return `不要外派为 full-success；等待 ${blockers.join("|") || status} 清除，并替换未知项为稳定 Admin owner handoff alias`;
}

function isPreflightReady(summary: LooseRecord = {}) {
  return summary.status === "ready" &&
    summary.release === "release_after_report" &&
    summary.decision === READY_PREFLIGHT_ALIAS;
}

function isEvidenceReady(summary: LooseRecord = {}) {
  return summary.status === "ready-for-controlled-smoke-evidence-review" &&
    (!Array.isArray(summary.hardRedLineFlags) || summary.hardRedLineFlags.length === 0);
}

function isRunbookReady(summary: LooseRecord = {}) {
  return summary.status === "ready" &&
    summary.release === "release_after_report" &&
    (!Array.isArray(summary.missingPrerequisites) || summary.missingPrerequisites.length === 0) &&
    (!Array.isArray(summary.hardRedLineFlags) || summary.hardRedLineFlags.length === 0);
}

function isOperatorRemediationReady(summary: LooseRecord = {}) {
  return summary.status === "ready-for-operator-handoff" ||
    summary.status === "not-required" ||
    summary.status === "ready";
}

function isRemediationResultReady(summary: LooseRecord = {}) {
  return summary.status === "ready-for-controlled-smoke-evidence-review";
}

function readinessMissing(input: LooseRecord = {}) {
  const missing = [];
  if (!input.preflightSummary) {
    missing.push("controlled_smoke_preflight_missing");
  } else if (!isPreflightReady(input.preflightSummary)) {
    missing.push(`controlled_smoke_preflight_not_ready:${input.preflightSummary.decision || input.preflightSummary.status || "unknown"}`);
  }
  if (!input.evidenceReadinessSummary) {
    missing.push("controlled_smoke_evidence_readiness_missing");
  } else if (!isEvidenceReady(input.evidenceReadinessSummary)) {
    missing.push(`controlled_smoke_evidence_readiness_not_ready:${input.evidenceReadinessSummary.status || input.evidenceReadinessSummary.reason || "unknown"}`);
  }
  if (!input.releaseRunbookSummary) {
    missing.push("controlled_smoke_release_runbook_missing");
  } else if (!isRunbookReady(input.releaseRunbookSummary)) {
    missing.push(`controlled_smoke_release_runbook_not_ready:${input.releaseRunbookSummary.reason || input.releaseRunbookSummary.status || "unknown"}`);
  }
  if (!input.operatorRemediationHandoffSummary) {
    missing.push("operator_remediation_handoff_missing");
  } else if (!isOperatorRemediationReady(input.operatorRemediationHandoffSummary)) {
    missing.push(`operator_remediation_handoff_not_ready:${input.operatorRemediationHandoffSummary.reason || input.operatorRemediationHandoffSummary.status || "unknown"}`);
  }
  if (!input.remediationResultEvidenceHandoffSummary) {
    missing.push("remediation_result_evidence_handoff_missing");
  } else if (!isRemediationResultReady(input.remediationResultEvidenceHandoffSummary)) {
    missing.push(`remediation_result_evidence_handoff_not_ready:${input.remediationResultEvidenceHandoffSummary.reason || input.remediationResultEvidenceHandoffSummary.status || "unknown"}`);
  }
  if (input.redactionSignal && input.redactionSignal !== "sanitized") {
    missing.push(`redaction_signal_not_sanitized:${input.redactionSignal}`);
  }
  return missing;
}

function firstBlockingHandoff(input: LooseRecord = {}) {
  const summaries = [
    input.preflightSummary,
    input.evidenceReadinessSummary,
    input.releaseRunbookSummary,
    input.operatorRemediationHandoffSummary,
    input.remediationResultEvidenceHandoffSummary,
  ];
  for (const summary of summaries) {
    const handoffs = Array.isArray(summary?.ownerHandoffs) ? summary.ownerHandoffs : [];
    if (handoffs.length > 0 && summary.status !== "ready" && summary.status !== READY_EXECUTION_STATUS && summary.status !== "ready-for-controlled-smoke-evidence-review") {
      return {
        blockerAlias: handoffs[0].alias || aliasesFrom(summary)[0],
        remediationAlias: summary.reason || summary.reasonAlias || aliasesFrom(summary)[0] || "controlled_smoke_execution_prerequisite_missing",
        ownerHandoffLimits: handoffs.map((handoff) => ownerLimitFromHandoff(handoff, handoffs[0].alias, handoff.owner)),
      };
    }
  }
  return {};
}

function allEvidenceAliases(input: LooseRecord = {}) {
  function evidenceAliasesFrom(value: LooseRecord = {}) {
    if (!hasObject(value)) {
      return [];
    }
    return unique([
      value.alias,
      ...(Array.isArray(value.aliases) ? value.aliases : []),
      ...(Array.isArray(value.evidenceAliases) ? value.evidenceAliases : []),
      ...(Array.isArray(value.blockingAliases) ? value.blockingAliases : []),
    ].map((item) => String(item || "").trim()));
  }
  return unique([
    ...evidenceAliasesFrom(input.preflightSummary),
    ...evidenceAliasesFrom(input.evidenceReadinessSummary),
    ...evidenceAliasesFrom(input.releaseRunbookSummary),
    ...evidenceAliasesFrom(input.operatorRemediationHandoffSummary),
    ...evidenceAliasesFrom(input.remediationResultEvidenceHandoffSummary),
  ]);
}

// 该 handoff 只汇总调用方提供的脱敏摘要；任何敏感值、真实执行信号或跨 owner 成功外推都 fail closed。
function createGatewayProjectionControlledSmokeExecutionHandoff(input: LooseRecord = {}, options: LooseRecord = {}) {
  if (containsSensitiveEvidence(input)) {
    return buildResult("blocked", {}, options, {
      blockerAlias: "sanitization_failed",
      remediationAlias: "redaction_required",
      operatorActions: [
        "删除敏感字段、完整响应体、真实账号、私有 URL 或完整组织标识后重跑 execution handoff",
        "只保留脱敏 alias、status、owner 和 minimum unblock condition",
      ],
      ownerHandoffLimits: [ownerLimitFromHandoff({
        alias: "sanitization_failed",
        owner: "admin_operator",
        nextAction: "重新收集只读脱敏 execution evidence package",
        minimumUnblockCondition: "输入不含 token、Cookie、私有 endpoint、真实账号、手机号、邮箱、完整 organizationId、完整响应体或 credential-like data",
      })],
    });
  }

  const overclaimFlags = unique(collectTextFlags(input, fullSuccessFlagsFromText));
  if (overclaimFlags.length > 0) {
    return buildResult("hard-red-line", input, options, {
      blockerAlias: "full_success_overclaim",
      remediationAlias: "remove_cross_owner_success_claim",
      redLineFlags: overclaimFlags,
    });
  }

  const redLineFlags = unique(collectTextFlags(input, redLineFlagsFromText));
  if (redLineFlags.length > 0) {
    return buildResult("hard-red-line", input, options, {
      blockerAlias: redLineFlags[0],
      remediationAlias: "remove_real_execution_signal",
      redLineFlags,
    });
  }

  const missing = readinessMissing(input);
  if (missing.length > 0) {
    const blocking = firstBlockingHandoff(input);
    return buildResult("blocked", input, options, {
      blockerAlias: blocking.blockerAlias || "controlled_smoke_execution_prerequisite_missing",
      remediationAlias: blocking.remediationAlias || "controlled_smoke_execution_evidence_required",
      missingPrerequisites: missing,
      ownerHandoffLimits: blocking.ownerHandoffLimits || ownerLimitsFromSummaries(input),
    });
  }

  const unknownAliases = allEvidenceAliases(input).filter((alias) => alias && !KNOWN_ALIASES.has(alias));
  if (unknownAliases.length > 0) {
    return buildResult("blocked", input, options, {
      blockerAlias: "unknown_controlled_smoke_execution_alias",
      remediationAlias: unknownAliases[0],
      ownerHandoffLimits: [ownerLimitFromHandoff({
        alias: "unknown_controlled_smoke_execution_alias",
        owner: "admin_operator",
        nextAction: "替换未知 execution handoff alias 为稳定 Admin owner handoff alias",
        minimumUnblockCondition: "unknown alias 已替换为 spec/test 中定义的稳定 alias",
      })],
    });
  }

  return buildResult(READY_EXECUTION_STATUS, input, options);
}

module.exports = {
  createGatewayProjectionControlledSmokeExecutionHandoff,
};
