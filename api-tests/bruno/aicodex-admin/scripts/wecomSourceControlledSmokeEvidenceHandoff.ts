// @ts-nocheck
const EVIDENCE_SHAPE_VERSION = "wecom-source-controlled-smoke-evidence-handoff/v1";

const READY_STATUS = "ready-for-controlled-smoke-evidence-handoff";

const READY_READINESS_ALIASES = new Set(["wecom_source_ready", "ready"]);
const READY_RELEASE_ALIASES = new Set(["wecom_source_ready", "ready_for_org_tree_readiness", "ready"]);
const READY_PREFLIGHT_ALIASES = new Set(["ready-for-wecom-controlled-smoke-preflight", "ready"]);
const REDACTED_ALIASES = new Set(["redacted", "sanitized", "safe", "none"]);
const LOCAL_READONLY_SCOPES = new Set(["local-readonly-evidence-handoff", "local_readonly_evidence_handoff", "readonly-local", "read-only-local"]);
const EMPTY_BLOCKING_ALIASES = new Set(["", "none", "no_blocker", "not_blocked", "clear"]);

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

const OVERCLAIM_FIELD_NAME_PARTS = [
  "authorizationfacts",
  "database",
  "db",
  "downstream",
  "fixture",
  "fullsuccess",
  "gateway",
  "insight",
  "nonempty",
  "organizationtree",
  "productionready",
  "publish",
  "realsync",
  "syncsuccess",
];

const OVERCLAIM_VALUE_PATTERNS = [
  /authorization facts/i,
  /\bdb\b/i,
  /database/i,
  /fixture/i,
  /full[-\s]?success/i,
  /gateway/i,
  /insight/i,
  /non[-\s]?empty organization tree/i,
  /production ready/i,
  /publish success/i,
  /real sync/i,
];

const DO_NOT_PROCEED_REASONS = [
  "不能证明组织树非空",
  "不能证明 Gateway/API/Insight 成功",
  "不能证明 authorization facts 生效",
  "不能证明真实 WeCom 同步成功或生产就绪",
  "不能写成 full-success",
];

const HANDOFFS = {
  [READY_STATUS]: {
    alias: READY_STATUS,
    owner: "admin_operator",
    nextAction: "交接脱敏 evidence handoff 给后续 owner，只允许作为受控 smoke 证据摘要入口",
    condition: "readiness、release decision 和 preflight 均为 ready，且输入只包含脱敏 summary",
  },
  "missing-readiness-summary": {
    alias: "missing-readiness-summary",
    owner: "admin_operator",
    nextAction: "先运行 30-WeCom 同步/Source Readiness Handoff.yml",
    condition: "提供脱敏 readiness summary，包含 status、aliases 或 reasonAlias、evidenceShapeVersion",
  },
  "missing-release-summary": {
    alias: "missing-release-summary",
    owner: "admin_operator",
    nextAction: "先运行 30-WeCom 同步/Source Release Decision.yml",
    condition: "提供脱敏 release decision summary，包含 decision 或 release、reasonAlias、evidenceShapeVersion",
  },
  "missing-preflight-summary": {
    alias: "missing-preflight-summary",
    owner: "admin_operator",
    nextAction: "先运行 30-WeCom 同步/Controlled Smoke Preflight.yml",
    condition: "提供脱敏 controlled smoke preflight summary，包含 status、reasonAlias、evidenceShapeVersion",
  },
  "redaction-required": {
    alias: "redaction-required",
    owner: "admin_operator",
    nextAction: "删除敏感字段、真实环境值、完整响应体或完整组织树后重跑 evidence handoff",
    condition: "输入只包含脱敏 readiness/release/preflight summary 和 operator alias",
  },
  "hard-red-line-blocked": {
    alias: "hard-red-line-blocked",
    owner: "admin_operator",
    nextAction: "停止 evidence handoff，回到本地只读范围和 blocking alias 对应 owner",
    condition: "清除真实环境写入信号、blocking alias，并将 operator scope 恢复为本地只读 evidence handoff",
  },
  "overclaim-full-success": {
    alias: "overclaim-full-success",
    owner: "admin_operator",
    nextAction: "删除下游成功、真实同步、真实 DB、fixture、publish 或 full-success 断言后重跑",
    condition: "只保留 Admin WeCom source 侧脱敏 readiness/release/preflight evidence",
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

function includesPattern(value, patterns) {
  return typeof value === "string" && patterns.some((pattern) => pattern.test(value));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function aliasesOf(summary = {}) {
  return [
    summary.status,
    summary.reasonAlias,
    summary.decision,
    summary.release,
    ...asArray(summary.aliases),
  ].map(normalizeAlias).filter(Boolean);
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

function containsOverclaim(value) {
  return scanEvidence(value, "", (key, currentValue) => {
    const normalizedKey = normalizeKey(key);
    return OVERCLAIM_FIELD_NAME_PARTS.some((part) => normalizedKey.includes(part))
      || includesPattern(currentValue, OVERCLAIM_VALUE_PATTERNS);
  });
}

function containsSensitiveEvidence(value) {
  return scanEvidence(value, "", (key, currentValue) => {
    const normalizedKey = normalizeKey(key);
    return FORBIDDEN_FIELD_NAME_PARTS.some((part) => normalizedKey.includes(part))
      || includesPattern(currentValue, FORBIDDEN_VALUE_PATTERNS);
  });
}

function isReadinessReady(summary = {}) {
  return aliasesOf(summary).some((alias) => READY_READINESS_ALIASES.has(alias));
}

function isReleaseReady(summary = {}) {
  return aliasesOf(summary).some((alias) => READY_RELEASE_ALIASES.has(alias));
}

function isPreflightReady(summary = {}) {
  return aliasesOf(summary).some((alias) => READY_PREFLIGHT_ALIASES.has(alias));
}

function hasNoBlockingAlias(input = {}) {
  return EMPTY_BLOCKING_ALIASES.has(normalizeAlias(input.blockingAlias));
}

function isLocalReadonlyScope(input = {}) {
  return LOCAL_READONLY_SCOPES.has(normalizeAlias(input.operatorScope));
}

function redactionChecks(status) {
  return [{
    alias: status === "redaction-required" ? "redaction-required" : "sanitized-summary-only",
    passed: status !== "redaction-required",
  }];
}

function missingPrerequisites(status) {
  if (status === READY_STATUS || status === "redaction-required" || status === "hard-red-line-blocked" || status === "overclaim-full-success") {
    return [];
  }
  const handoff = HANDOFFS[status];
  return [{
    alias: handoff.alias,
    owner: handoff.owner,
    condition: handoff.condition,
  }];
}

function hardRedLineFlags(status, input = {}) {
  if (status === "overclaim-full-success") {
    return [{
      alias: "full-success-overclaim",
      owner: "admin_operator",
      action: HANDOFFS[status].nextAction,
    }];
  }
  if (status !== "hard-red-line-blocked") {
    return [];
  }
  const flags = [];
  if (input.realEnvironmentWriteSignal === true) {
    flags.push({
      alias: "real-environment-write-signal",
      owner: "admin_operator",
      action: "停止并移除真实环境写入信号",
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
      action: "将 operator scope 恢复为 local-readonly-evidence-handoff",
    });
  }
  return flags.length > 0 ? flags : [{
    alias: "hard-red-line-blocked",
    owner: "admin_operator",
    action: HANDOFFS[status].nextAction,
  }];
}

function classify(input = {}) {
  if (containsOverclaim(input)) {
    return "overclaim-full-success";
  }
  if (containsSensitiveEvidence(input) || !REDACTED_ALIASES.has(normalizeAlias(input.redactionSignal))) {
    return "redaction-required";
  }
  if (!input.readinessSummary) {
    return "missing-readiness-summary";
  }
  if (!input.releaseSummary) {
    return "missing-release-summary";
  }
  if (!input.preflightSummary) {
    return "missing-preflight-summary";
  }
  if (!hasNoBlockingAlias(input) || !isLocalReadonlyScope(input) || input.realEnvironmentWriteSignal === true) {
    return "hard-red-line-blocked";
  }
  if (!isReadinessReady(input.readinessSummary)) {
    return "missing-readiness-summary";
  }
  if (!isReleaseReady(input.releaseSummary)) {
    return "missing-release-summary";
  }
  if (!isPreflightReady(input.preflightSummary)) {
    return "missing-preflight-summary";
  }
  return READY_STATUS;
}

function buildHandoff(status, input = {}, options = {}) {
  const handoff = HANDOFFS[status] || HANDOFFS["hard-red-line-blocked"];
  const ready = status === READY_STATUS;
  return {
    status,
    release: ready ? "release_after_report" : "hold",
    reasonAlias: status,
    sourceAlias: options.sourceAlias || "wecom_source_controlled_smoke_evidence_handoff",
    generatedAt: generatedAt(options),
    operatorNextActions: ready ? [
      handoff.nextAction,
      "仅回传 status、reasonAlias、missingPrerequisites、redactionChecks、hardRedLineFlags 和不能外推边界",
      "后续 owner 仍需自行验证组织树、Gateway/API/Insight、authorization facts 和真实 smoke 结果",
    ] : [
      handoff.nextAction,
      "不得触发真实 WeCom 同步、真实 DB 查询/写入、fixture、publish、gateway ingestion 或 authorization facts",
      "回传前删除下游成功、完整组织树、完整响应体、私有 URL、token、Cookie、账号、手机号和邮箱",
    ],
    missingPrerequisites: missingPrerequisites(status),
    redactionChecks: redactionChecks(status),
    hardRedLineFlags: hardRedLineFlags(status, input),
    ownerHandoffs: [{
      alias: handoff.alias,
      owner: handoff.owner,
      nextAction: handoff.nextAction,
      minimumUnblockCondition: handoff.condition,
    }],
    doNotProceedReasons: DO_NOT_PROCEED_REASONS,
    evidenceShapeVersion: EVIDENCE_SHAPE_VERSION,
  };
}

// Evidence handoff 只消费脱敏 readiness/release/preflight summary；输出不得包含输入原文或外推为 full-success。
function createWecomSourceControlledSmokeEvidenceHandoff(input = {}, options = {}) {
  return buildHandoff(classify(input), input, options);
}

module.exports = {
  createWecomSourceControlledSmokeEvidenceHandoff,
};
