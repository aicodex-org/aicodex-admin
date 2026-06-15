const EVIDENCE_SHAPE_VERSION = "wecom-source-controlled-smoke-execution-handoff/v1";

const READY_STATUS = "ready-for-controlled-smoke-execution-handoff";

const READY_PREFLIGHT_ALIASES = new Set(["ready-for-wecom-controlled-smoke-preflight", "ready"]);
const READY_EVIDENCE_ALIASES = new Set(["ready-for-controlled-smoke-evidence-handoff", "ready"]);
const READY_REMEDIATION_ALIASES = new Set(["ready", "release_after_report"]);
const REDACTED_ALIASES = new Set(["redacted", "sanitized", "safe", "none"]);
const LOCAL_READONLY_SCOPES = new Set([
  "local-readonly-controlled-smoke-execution-handoff",
  "local_readonly_controlled_smoke_execution_handoff",
  "readonly-local",
  "read-only-local",
]);
const HANDOFF_ONLY_MODES = new Set([
  "controlled-smoke-execution-handoff-only",
  "execution-handoff-only",
  "local-only",
  "readonly-local",
]);
const EMPTY_BLOCKING_ALIASES = new Set(["", "none", "no_blocker", "not_blocked", "clear"]);

const BOUNDARIES = [
  "execution handoff 只代表 Admin WeCom source 受控 smoke 执行交接证据已可复制复核，不执行真实 controlled smoke",
  "该 handoff 不证明真实 WeCom 同步成功、组织树非空、Gateway/API/Insight 成功、authorization facts 生效、生产就绪或 full-success",
  "不得写真实 fixture、查询或写真实 DB、publish、gateway ingestion、authorization facts，或读取 API/Insight/Gateway store",
  "只复制稳定 status、decision、reasonAlias、referenceSummaries、blockerReasons、hardRedLineFlags、minimumUnblockConditions 和不能外推边界",
];

const DO_NOT_PROCEED_REASONS = [
  "不能证明真实 WeCom 同步成功",
  "不能证明组织树非空",
  "不能证明 Gateway/API/Insight 成功",
  "不能证明 authorization facts 生效",
  "不能证明生产就绪",
  "不能写成 full-success",
];

const FORBIDDEN_FIELD_NAME_PARTS = [
  "authorization",
  "bearer",
  "cookie",
  "credential",
  "email",
  "fullorganizationid",
  "fullorganizationtree",
  "fullresponse",
  "mobile",
  "password",
  "phone",
  "privateendpoint",
  "privateurl",
  "rawresponse",
  "responsebody",
  "secret",
  "sourcetenant",
  "token",
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

const OVERCLAIM_VALUE_PATTERNS = [
  /authorization facts/i,
  /\bdb\b/i,
  /database/i,
  /fixture/i,
  /full[-\s]?success/i,
  /gateway\/api\/insight success/i,
  /gateway\/api\/insight full[-\s]?success/i,
  /gateway/i,
  /insight/i,
  /non[-\s]?empty organization tree/i,
  /production ready/i,
  /publish success/i,
  /real sync/i,
  /真实\s*wecom\s*同步成功/i,
  /组织树非空/,
  /生产就绪/,
];

const SAFE_TEXT_KEYS = new Set([
  "boundaries",
  "donotproceedreasons",
  "donotdispatchuntil",
  "minimumunblockcondition",
  "minimumunblockconditions",
  "nextaction",
  "operatornextactions",
  "safenextactions",
]);

const HANDOFFS = {
  [READY_STATUS]: {
    alias: READY_STATUS,
    owner: "admin_operator",
    nextAction: "复制受控 smoke 执行交接证据给后续 owner；后续 owner 必须另行执行并复核真实 smoke",
    minimumUnblockCondition: "preflight、evidence handoff、operator remediation handoff 均为 ready 且输入只包含脱敏 summary",
  },
  "missing-controlled-smoke-preflight-summary": {
    alias: "missing-controlled-smoke-preflight-summary",
    owner: "admin_operator",
    nextAction: "先运行 30-WeCom 同步/Controlled Smoke Preflight.yml",
    minimumUnblockCondition: "提供脱敏 controlled smoke preflight summary，包含 status、reasonAlias、evidenceShapeVersion",
  },
  "missing-controlled-smoke-evidence-handoff-summary": {
    alias: "missing-controlled-smoke-evidence-handoff-summary",
    owner: "admin_operator",
    nextAction: "先运行 30-WeCom 同步/Controlled Smoke Evidence Handoff.yml",
    minimumUnblockCondition: "提供脱敏 controlled smoke evidence handoff summary，包含 status、reasonAlias、redactionChecks、hardRedLineFlags",
  },
  "missing-operator-remediation-handoff-summary": {
    alias: "missing-operator-remediation-handoff-summary",
    owner: "admin_operator",
    nextAction: "先运行 30-WeCom 同步/Operator Remediation Handoff.yml",
    minimumUnblockCondition: "提供脱敏 operator remediation handoff summary，包含 status、reasonAlias、remediations、redLineFlags",
  },
  "blocked-prerequisite": {
    alias: "blocked-prerequisite",
    owner: "admin_operator",
    nextAction: "先解除 preflight/evidence/remediation summary 中的 blocker，再生成执行交接证据",
    minimumUnblockCondition: "所有前置 summary 为 ready，且 missing prerequisite、remediation、red-line flag 已清空",
  },
  "redaction-required": {
    alias: "redaction-required",
    owner: "admin_operator",
    nextAction: "删除敏感字段、真实环境值、完整响应体或完整组织树后重跑 execution handoff",
    minimumUnblockCondition: "输入只包含脱敏 preflight/evidence/remediation summary 和 operator alias",
  },
  "hard-red-line-blocked": {
    alias: "hard-red-line-blocked",
    owner: "admin_operator",
    nextAction: "停止执行交接，回到本地只读范围和 blocking alias 对应 owner",
    minimumUnblockCondition: "清除真实执行信号、blocking alias，并将 operator scope 恢复为本地只读 execution handoff",
  },
  "overclaim-full-success": {
    alias: "overclaim-full-success",
    owner: "admin_operator",
    nextAction: "删除下游成功、真实同步、真实 DB、fixture、publish、生产就绪或 full-success 断言后重跑",
    minimumUnblockCondition: "只保留 Admin WeCom source 侧脱敏 preflight/evidence/remediation 证据",
  },
};

function hasObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function normalizeAlias(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeKey(key) {
  return String(key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function generatedAt(options = {}) {
  return options.generatedAt || new Date().toISOString();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function scanEvidence(value, key = "", scanner) {
  if (scanner(key, value)) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some((item) => scanEvidence(item, "", scanner));
  }
  if (hasObject(value)) {
    return Object.entries(value).some(([nestedKey, nestedValue]) => scanEvidence(nestedValue, nestedKey, scanner));
  }
  return false;
}

function containsSensitiveEvidence(value) {
  return scanEvidence(value, "", (key, currentValue) => {
    const normalizedKey = normalizeKey(key);
    return FORBIDDEN_FIELD_NAME_PARTS.some((part) => normalizedKey.includes(part))
      || (typeof currentValue === "string" && FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(currentValue)));
  });
}

function isNegatedBoundary(text) {
  return /不得|不能|不证明|不是|not\s+(?:prove|proof|production|full|real|gateway|api|insight|authorization)/i.test(text);
}

function containsOverclaim(value) {
  return scanEvidence(value, "", (key, currentValue) => {
    const normalizedKey = normalizeKey(key);
    if (SAFE_TEXT_KEYS.has(normalizedKey) || typeof currentValue !== "string" || isNegatedBoundary(currentValue)) {
      return false;
    }
    return OVERCLAIM_VALUE_PATTERNS.some((pattern) => pattern.test(currentValue));
  });
}

function aliasesOf(summary = {}) {
  return unique([
    summary.status,
    summary.reasonAlias,
    summary.decision,
    summary.release,
    ...asArray(summary.aliases),
  ].map(normalizeAlias));
}

function firstReadyAlias(summary = {}, readyAliases = new Set()) {
  return aliasesOf(summary).find((alias) => readyAliases.has(alias));
}

function hasNoBlockingAlias(input = {}) {
  return EMPTY_BLOCKING_ALIASES.has(normalizeAlias(input.blockingAlias));
}

function isLocalReadonlyScope(input = {}) {
  return LOCAL_READONLY_SCOPES.has(normalizeAlias(input.operatorScope));
}

function isHandoffOnlyMode(input = {}) {
  return HANDOFF_ONLY_MODES.has(normalizeAlias(input.executionModeAlias));
}

function summaryReference(alias, summary = {}, readyAliases) {
  return {
    alias,
    status: summary.status || summary.decision || summary.release || "unknown",
    reasonAlias: summary.reasonAlias || firstReadyAlias(summary, readyAliases) || "unknown",
    evidenceShapeVersion: summary.evidenceShapeVersion || "unknown",
  };
}

function redactionChecks(status) {
  return [{
    alias: status === "redaction-required" ? "redaction-required" : "sanitized-summary-only",
    passed: status !== "redaction-required",
  }];
}

function collectSummaryBlockers(input = {}) {
  const blockers = [];

  for (const item of asArray(input.evidenceHandoff?.missingPrerequisites)) {
    const alias = normalizeAlias(item.alias || item);
    if (alias) {
      blockers.push({
        alias,
        owner: item.owner || "admin_operator",
        nextAction: item.nextAction || "先解除 evidence handoff missing prerequisite",
        minimumUnblockCondition: item.minimumUnblockCondition || item.condition || "evidence handoff missing prerequisite 清空",
      });
    }
  }

  for (const item of asArray(input.evidenceHandoff?.hardRedLineFlags)) {
    const alias = normalizeAlias(item.alias || item);
    if (alias) {
      blockers.push({
        alias,
        owner: item.owner || "admin_operator",
        nextAction: item.action || "先清除 evidence handoff hard red-line flag",
        minimumUnblockCondition: "evidence handoff hard red-line flag 清空",
      });
    }
  }

  for (const item of asArray(input.remediationHandoff?.remediations)) {
    const alias = normalizeAlias(item.alias || item);
    if (alias) {
      blockers.push({
        alias,
        owner: item.owner || "admin_operator",
        nextAction: item.nextAction || "先解除 operator remediation blocker",
        minimumUnblockCondition: item.minimumUnblockCondition || "operator remediation blocker 清空",
      });
    }
  }

  for (const item of asArray(input.remediationHandoff?.missingPrerequisites)) {
    const alias = normalizeAlias(item.alias || item);
    if (alias) {
      blockers.push({
        alias,
        owner: item.owner || "admin_operator",
        nextAction: item.nextAction || "先补齐 operator remediation missing prerequisite",
        minimumUnblockCondition: item.minimumUnblockCondition || "operator remediation missing prerequisite 清空",
      });
    }
  }

  for (const item of asArray(input.remediationHandoff?.redLineFlags)) {
    const alias = normalizeAlias(item.alias || item);
    if (alias) {
      blockers.push({
        alias,
        owner: item.owner || "admin_operator",
        nextAction: item.action || "先清除 operator remediation red-line flag",
        minimumUnblockCondition: "operator remediation red-line flag 清空",
      });
    }
  }

  if (!firstReadyAlias(input.preflightSummary, READY_PREFLIGHT_ALIASES)) {
    blockers.push({
      alias: normalizeAlias(input.preflightSummary?.reasonAlias || input.preflightSummary?.status || "controlled-smoke-preflight-not-ready"),
      owner: "admin_operator",
      nextAction: "先重跑 Controlled Smoke Preflight 并解除 blocker",
      minimumUnblockCondition: "controlled smoke preflight status 为 ready-for-wecom-controlled-smoke-preflight",
    });
  }
  if (!firstReadyAlias(input.evidenceHandoff, READY_EVIDENCE_ALIASES)) {
    blockers.push({
      alias: normalizeAlias(input.evidenceHandoff?.reasonAlias || input.evidenceHandoff?.status || "controlled-smoke-evidence-handoff-not-ready"),
      owner: "admin_operator",
      nextAction: "先重跑 Controlled Smoke Evidence Handoff 并解除 blocker",
      minimumUnblockCondition: "controlled smoke evidence handoff status 为 ready-for-controlled-smoke-evidence-handoff",
    });
  }
  if (!firstReadyAlias(input.remediationHandoff, READY_REMEDIATION_ALIASES)) {
    blockers.push({
      alias: normalizeAlias(input.remediationHandoff?.reasonAlias || input.remediationHandoff?.status || "operator-remediation-handoff-not-ready"),
      owner: "admin_operator",
      nextAction: "先重跑 Operator Remediation Handoff 并解除 blocker",
      minimumUnblockCondition: "operator remediation handoff status 为 ready",
    });
  }

  return unique(blockers.map((item) => item.alias)).map((alias) => blockers.find((item) => item.alias === alias));
}

function hardRedLineFlags(input = {}) {
  const flags = [];
  if (input.realExecutionSignal === true) {
    flags.push({
      alias: "real-execution-signal",
      owner: "admin_operator",
      action: "停止真实 controlled smoke、真实 WeCom 同步、DB/fixture 写入或 publish 操作",
    });
  }
  if (!hasNoBlockingAlias(input)) {
    flags.push({
      alias: normalizeAlias(input.blockingAlias) || "blocking-alias-present",
      owner: "admin_operator",
      action: "先解除 blocking alias 对应前置条件",
    });
  }
  if (!isLocalReadonlyScope(input)) {
    flags.push({
      alias: "non-local-readonly-scope",
      owner: "admin_operator",
      action: "将 operator scope 恢复为 local-readonly-controlled-smoke-execution-handoff",
    });
  }
  if (!isHandoffOnlyMode(input)) {
    flags.push({
      alias: "non-handoff-only-mode",
      owner: "admin_operator",
      action: "将 execution mode 恢复为 controlled-smoke-execution-handoff-only",
    });
  }
  return flags;
}

function missingStatus(input = {}) {
  if (!input.preflightSummary) {
    return "missing-controlled-smoke-preflight-summary";
  }
  if (!input.evidenceHandoff) {
    return "missing-controlled-smoke-evidence-handoff-summary";
  }
  if (!input.remediationHandoff) {
    return "missing-operator-remediation-handoff-summary";
  }
  return undefined;
}

function classify(input = {}) {
  if (containsOverclaim(input)) {
    return "overclaim-full-success";
  }
  if (containsSensitiveEvidence(input) || !REDACTED_ALIASES.has(normalizeAlias(input.redactionSignal))) {
    return "redaction-required";
  }
  const missing = missingStatus(input);
  if (missing) {
    return missing;
  }
  if (hardRedLineFlags(input).length > 0) {
    return "hard-red-line-blocked";
  }
  if (collectSummaryBlockers(input).length > 0) {
    return "blocked-prerequisite";
  }
  return READY_STATUS;
}

function blockerReasons(status, input = {}) {
  if (status === READY_STATUS || status === "redaction-required" || status === "hard-red-line-blocked" || status === "overclaim-full-success") {
    return [];
  }
  if (status === "blocked-prerequisite") {
    return collectSummaryBlockers(input);
  }
  const handoff = HANDOFFS[status];
  return [{
    alias: handoff.alias,
    owner: handoff.owner,
    nextAction: handoff.nextAction,
    minimumUnblockCondition: handoff.minimumUnblockCondition,
  }];
}

function buildHandoff(status, input = {}, options = {}) {
  const handoff = HANDOFFS[status] || HANDOFFS["hard-red-line-blocked"];
  const ready = status === READY_STATUS;
  const blockers = blockerReasons(status, input);
  const redLines = status === "hard-red-line-blocked"
    ? hardRedLineFlags(input)
    : status === "overclaim-full-success"
      ? [{
        alias: "full-success-overclaim",
        owner: "admin_operator",
        action: HANDOFFS[status].nextAction,
      }]
      : [];

  return {
    status,
    decision: ready ? "handoff-ready" : "blocked",
    release: ready ? "release_after_report" : "hold",
    reasonAlias: status,
    sourceAlias: options.sourceAlias || "wecom_source_controlled_smoke_execution_handoff",
    generatedAt: generatedAt(options),
    referenceSummaries: [
      input.preflightSummary ? summaryReference("controlled-smoke-preflight", input.preflightSummary, READY_PREFLIGHT_ALIASES) : undefined,
      input.evidenceHandoff ? summaryReference("controlled-smoke-evidence-handoff", input.evidenceHandoff, READY_EVIDENCE_ALIASES) : undefined,
      input.remediationHandoff ? summaryReference("operator-remediation-handoff", input.remediationHandoff, READY_REMEDIATION_ALIASES) : undefined,
    ].filter(Boolean),
    blockerReasons: blockers,
    redactionChecks: redactionChecks(status),
    hardRedLineFlags: redLines,
    ownerHandoffs: ready ? [{
      alias: handoff.alias,
      owner: handoff.owner,
      nextAction: handoff.nextAction,
      minimumUnblockCondition: handoff.minimumUnblockCondition,
    }] : [...blockers, ...redLines].map((item) => ({
      alias: item.alias,
      owner: item.owner || "admin_operator",
      nextAction: item.nextAction || item.action || handoff.nextAction,
      minimumUnblockCondition: item.minimumUnblockCondition || handoff.minimumUnblockCondition,
    })),
    minimumUnblockConditions: ready ? [] : [...blockers, ...redLines].map((item) => ({
      alias: item.alias,
      owner: item.owner || "admin_operator",
      condition: item.minimumUnblockCondition || handoff.minimumUnblockCondition,
    })),
    operatorNextActions: ready ? [
      "复制受控 smoke 执行交接证据；后续 owner 必须单独执行和复核真实 controlled smoke",
      "只传递脱敏 referenceSummaries、status、decision、reasonAlias、owner handoff 和不能外推边界",
      "真实执行前仍需由对应 owner 确认可用环境、凭据、fixture 策略和审计要求",
    ] : [
      handoff.nextAction,
      "不得触发真实 WeCom 同步、真实 DB 查询/写入、fixture、publish、gateway ingestion 或 authorization facts",
      "回传前删除下游成功、完整组织树、完整响应体、私有 URL、token、Cookie、账号、手机号和邮箱",
    ],
    boundaries: BOUNDARIES,
    doNotProceedReasons: DO_NOT_PROCEED_REASONS,
    evidenceShapeVersion: EVIDENCE_SHAPE_VERSION,
  };
}

// Execution handoff 只生成可复制复核的脱敏交接证据；它不是 controlled smoke 执行器。
function createWecomSourceControlledSmokeExecutionHandoff(input = {}, options = {}) {
  return buildHandoff(classify(input), input, options);
}

module.exports = {
  createWecomSourceControlledSmokeExecutionHandoff,
};
