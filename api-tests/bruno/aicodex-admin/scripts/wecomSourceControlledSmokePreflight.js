const EVIDENCE_SHAPE_VERSION = "wecom-source-controlled-smoke-preflight/v1";

const READY_STATUS = "ready-for-wecom-controlled-smoke-preflight";

const FRESH_ALIASES = new Set(["fresh", "source_connection_fresh", "wecom_source_fresh"]);
const READY_READINESS_ALIASES = new Set(["wecom_source_ready", "ready"]);
const READY_RELEASE_ALIASES = new Set(["wecom_source_ready", "ready_for_org_tree_readiness", "ready"]);
const REDACTED_ALIASES = new Set(["redacted", "sanitized", "safe", "none"]);
const LOCAL_READONLY_SCOPES = new Set(["local-readonly-preflight", "local_readonly_preflight", "readonly-local", "read-only-local"]);
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

const DEFAULT_HANDOFFS = {
  [READY_STATUS]: {
    alias: READY_STATUS,
    owner: "admin_operator",
    nextAction: "只允许进入 Admin WeCom source 受控 smoke 准备交接",
    minimumUnblockCondition: "已具备脱敏 source readiness、release decision、freshness 和本地只读 operator scope",
  },
  "missing-readiness-handoff": {
    alias: "missing-readiness-handoff",
    owner: "admin_operator",
    nextAction: "先运行 30-WeCom 同步/Source Readiness Handoff.yml",
    minimumUnblockCondition: "提供脱敏 source readiness alias，例如 wecom_source_ready",
  },
  "missing-release-decision": {
    alias: "missing-release-decision",
    owner: "admin_operator",
    nextAction: "先运行 30-WeCom 同步/Source Release Decision.yml",
    minimumUnblockCondition: "提供脱敏 release decision alias，例如 wecom_source_ready",
  },
  "source-not-fresh": {
    alias: "source-not-fresh",
    owner: "admin_source_owner",
    nextAction: "回到 Admin-owned source freshness/readiness 排障",
    minimumUnblockCondition: "source connection freshness/state alias 为 fresh，且不依赖真实 DB 或下游 store",
  },
  "redaction-required": {
    alias: "redaction-required",
    owner: "admin_operator",
    nextAction: "删除敏感字段、真实环境值、完整响应体或完整组织树后重跑",
    minimumUnblockCondition: "输入只包含脱敏 summary/evidence alias",
  },
  "red-line-blocked": {
    alias: "red-line-blocked",
    owner: "admin_operator",
    nextAction: "停止受控 smoke preflight，回到本地只读范围和 blocking alias 对应 owner",
    minimumUnblockCondition: "blocking alias 清空，operator scope 回到本地只读 preflight",
  },
  "overclaim-full-success": {
    alias: "overclaim-full-success",
    owner: "admin_operator",
    nextAction: "删除下游成功、真实同步、真实 DB、fixture、publish 或 full-success 断言后重跑",
    minimumUnblockCondition: "只保留 Admin WeCom source 侧脱敏 readiness/release/freshness 证据",
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

function scanEvidence(value, key = "", scanner) {
  const keyResult = scanner(key, value);
  if (keyResult) {
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

function isReadinessReady(input = {}) {
  return READY_READINESS_ALIASES.has(normalizeAlias(input.sourceReadinessAlias));
}

function isReleaseReady(input = {}) {
  return READY_RELEASE_ALIASES.has(normalizeAlias(input.releaseDecisionAlias));
}

function hasNoBlockingAlias(input = {}) {
  return EMPTY_BLOCKING_ALIASES.has(normalizeAlias(input.blockingAlias));
}

function isLocalReadonlyScope(input = {}) {
  return LOCAL_READONLY_SCOPES.has(normalizeAlias(input.operatorScope));
}

function classify(input = {}) {
  if (containsOverclaim(input)) {
    return "overclaim-full-success";
  }
  if (containsSensitiveEvidence(input) || !REDACTED_ALIASES.has(normalizeAlias(input.redactionSignal))) {
    return "redaction-required";
  }
  if (!input.sourceReadinessAlias) {
    return "missing-readiness-handoff";
  }
  if (!input.releaseDecisionAlias) {
    return "missing-release-decision";
  }
  if (!FRESH_ALIASES.has(normalizeAlias(input.sourceConnectionFreshnessAlias))) {
    return "source-not-fresh";
  }
  if (!hasNoBlockingAlias(input) || !isLocalReadonlyScope(input)) {
    return "red-line-blocked";
  }
  if (!isReadinessReady(input) || !isReleaseReady(input)) {
    return "red-line-blocked";
  }
  return READY_STATUS;
}

function buildPreflight(status, options = {}) {
  const handoff = DEFAULT_HANDOFFS[status] || DEFAULT_HANDOFFS["red-line-blocked"];
  const ready = status === READY_STATUS;
  return {
    status,
    release: ready ? "release_after_report" : "hold",
    reasonAlias: status,
    sourceAlias: options.sourceAlias || "wecom_source_controlled_smoke_preflight",
    generatedAt: generatedAt(options),
    ownerHandoffs: [{
      alias: handoff.alias,
      owner: handoff.owner,
      nextAction: handoff.nextAction,
      minimumUnblockCondition: handoff.minimumUnblockCondition,
    }],
    minimumUnblockConditions: ready ? [] : [{
      alias: handoff.alias,
      owner: handoff.owner,
      condition: handoff.minimumUnblockCondition,
    }],
    safeNextSteps: ready ? [
      "只允许进入 Admin WeCom source 受控 smoke preflight 后续交接",
      "继续使用脱敏 alias，不触发真实 WeCom 同步、不查询真实 DB、不读取 Gateway/API/Insight",
      "回传时只写 status、reasonAlias、owner、最小解除条件和不能外推边界",
    ] : [
      handoff.nextAction,
      "不得触发真实 WeCom 同步、真实 DB 查询/写入、fixture、publish、gateway ingestion 或 authorization facts",
      "回传前删除下游成功、完整组织树、完整响应体、私有 URL、token、Cookie、账号、手机号和邮箱",
    ],
    doNotProceedReasons: DO_NOT_PROCEED_REASONS,
    evidenceShapeVersion: EVIDENCE_SHAPE_VERSION,
  };
}

// Controlled-smoke preflight 只消费脱敏 alias；分类顺序优先阻断真实同步/下游成功外推，再处理普通脱敏缺口。
function createWecomSourceControlledSmokePreflight(input = {}, options = {}) {
  return buildPreflight(classify(input), options);
}

module.exports = {
  createWecomSourceControlledSmokePreflight,
};
