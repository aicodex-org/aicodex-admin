// @ts-nocheck
const EVIDENCE_SHAPE_VERSION = "wecom-source-release-decision/v1";

const BLOCKING_ALIASES = new Set([
  "wecom_config_missing",
  "wecom_config_disabled",
  "wecom_credential_not_verified",
  "wecom_latest_run_failed",
  "wecom_no_recent_success",
  "wecom_run_active",
  "sanitization_failed",
]);

const FORBIDDEN_FIELD_NAME_PARTS = [
  "authorization",
  "bearer",
  "cookie",
  "rawresponse",
  "fullresponse",
  "responsebody",
  "organizationtree",
  "organizationtreenonempty",
  "mobile",
  "phone",
  "email",
  "privateurl",
  "privateendpoint",
  "sourcetenant",
  "configref",
  "secretref",
  "token",
  "password",
  "downstreamfacts",
  "gateway",
  "insight",
  "fixture",
  "database",
  "db",
  "fullsuccess",
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

const DO_NOT_PROCEED_REASONS = [
  "不能证明组织树非空",
  "不能证明 projection 可发布",
  "不能证明 authorization facts 生效",
  "不能写成 full-success",
  "不能替代 API、Insight、Gateway 或真实 DB/fixture 验证",
];

const READY_NEXT_STEPS = [
  "只允许进入后续 owner 的组织树只读 readiness 或 controlled smoke 准备",
  "继续使用脱敏 evidence 和私有阈值验证，不触发 WeCom 手动同步写入口",
  "回传时只写 decision、reasonAlias、owner、最小解除条件和不能外推边界",
];

const BLOCKED_NEXT_STEPS = [
  "先解除 reasonAlias 对应的 Admin WeCom source readiness blocker",
  "不得触发 30-WeCom 同步/手动触发同步.yml，不查询 API/Insight/Gateway 数据",
  "删除 token、secret、Cookie、私有 URL、真实账号、手机号、邮箱、完整组织树或原始响应体后重跑",
];

const DEFAULT_HANDOFFS = {
  wecom_source_ready: {
    alias: "wecom_source_ready",
    owner: "admin_operator",
    nextAction: "只进入组织树只读 readiness 或 controlled smoke 准备",
    minimumUnblockCondition: "已取得 WeCom source readiness handoff=ready，且输入仅包含脱敏摘要",
  },
  wecom_source_readiness_not_checked: {
    alias: "wecom_source_readiness_not_checked",
    owner: "admin_operator",
    nextAction: "先运行 30-WeCom 同步/Source Readiness Handoff.yml",
    minimumUnblockCondition: "提供脱敏 source readiness handoff，包含 status、aliases 和 evidenceShapeVersion",
  },
  sanitization_failed: {
    alias: "sanitization_failed",
    owner: "admin_operator",
    nextAction: "删除敏感字段和下游成功断言后重跑 release decision",
    minimumUnblockCondition: "输入只包含脱敏 source readiness handoff、稳定 alias 和 operator metadata 别名",
  },
  wecom_config_missing: {
    alias: "wecom_config_missing",
    owner: "admin_source_owner",
    nextAction: "补齐目标组织的 WeCom organization sync 配置",
    minimumUnblockCondition: "source readiness handoff 不再返回 wecom_config_missing",
  },
  wecom_config_disabled: {
    alias: "wecom_config_disabled",
    owner: "admin_source_owner",
    nextAction: "确认是否允许启用 WeCom organization sync source",
    minimumUnblockCondition: "source readiness handoff 返回 config.isEnabled=true",
  },
  wecom_credential_not_verified: {
    alias: "wecom_credential_not_verified",
    owner: "admin_operator",
    nextAction: "只读收集 config/test 脱敏结果或最近成功 run 摘要",
    minimumUnblockCondition: "凭据验证结果为 ok，或最近存在 succeeded run；不得记录真实 secret、token 或原始响应体",
  },
  wecom_latest_run_failed: {
    alias: "wecom_latest_run_failed",
    owner: "admin_source_owner",
    nextAction: "排查最近一次 WeCom sync run 的安全错误分类",
    minimumUnblockCondition: "最近一次 run 不再是 failed/partial/error，且后续 succeeded run 可证明 source snapshot 完成",
  },
  wecom_no_recent_success: {
    alias: "wecom_no_recent_success",
    owner: "admin_operator",
    nextAction: "等待或收集最近 succeeded run 的脱敏摘要",
    minimumUnblockCondition: "配置启用且最近成功 run 落在 freshness 窗口内",
  },
  wecom_run_active: {
    alias: "wecom_run_active",
    owner: "admin_operator",
    nextAction: "等待当前 running run 进入终态后重跑只读 handoff",
    minimumUnblockCondition: "当前没有 active run，且最近终态 run 可用于 readiness 分类",
  },
};

function hasObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function normalizeKey(key) {
  return String(key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isMaskedSecret(value) {
  return value === "" || value === undefined || value === null || value === "***" || String(value).toLowerCase() === "masked";
}

// 上游 handoff 字段名本身是允许的；这里继续递归检查其内容，防止凭据或下游成功断言混入可复制摘要。
function containsSensitiveEvidence(value, key = "") {
  const normalizedKey = normalizeKey(key);
  if (normalizedKey === "sourcereadinesshandoff" || normalizedKey === "minimumunblockconditions" || normalizedKey === "ownerhandoffs" || normalizedKey === "safenextactions") {
    return Array.isArray(value)
      ? value.some((item) => containsSensitiveEvidence(item))
      : hasObject(value) && Object.entries(value).some(([nestedKey, nestedValue]) => containsSensitiveEvidence(nestedValue, nestedKey));
  }
  if (normalizedKey.includes("secret") || normalizedKey.includes("token") || normalizedKey.includes("credential") || normalizedKey.includes("password")) {
    return !isMaskedSecret(value);
  }
  if (FORBIDDEN_FIELD_NAME_PARTS.some((part) => normalizedKey.includes(part))) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsSensitiveEvidence(item));
  }
  if (hasObject(value)) {
    return Object.entries(value).some(([nestedKey, nestedValue]) => containsSensitiveEvidence(nestedValue, nestedKey));
  }
  if (typeof value === "string") {
    return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value));
  }
  return false;
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function generatedAt(options = {}) {
  return options.generatedAt || new Date().toISOString();
}

function firstReasonAlias(handoff = {}) {
  const aliases = Array.isArray(handoff.aliases) ? handoff.aliases : [];
  if (aliases.includes("sanitization_failed")) {
    return "sanitization_failed";
  }
  if (aliases.includes("wecom_source_ready") && handoff.status === "ready") {
    return "wecom_source_ready";
  }
  return aliases.find((alias) => BLOCKING_ALIASES.has(alias)) || "wecom_source_readiness_not_checked";
}

function normalizeOwnerHandoffs(handoff = {}, alias) {
  const fallback = DEFAULT_HANDOFFS[alias] || DEFAULT_HANDOFFS.wecom_source_readiness_not_checked;
  if (alias === "sanitization_failed" || alias === "wecom_source_readiness_not_checked") {
    return [fallback];
  }
  const sourceHandoffs = Array.isArray(handoff.ownerHandoffs) && handoff.ownerHandoffs.length > 0
    ? handoff.ownerHandoffs
    : [fallback];
  return sourceHandoffs.map((item) => ({
    alias: item.alias || fallback.alias,
    owner: item.owner || fallback.owner,
    nextAction: item.nextAction || fallback.nextAction,
    minimumUnblockCondition: item.minimumUnblockCondition || item.condition || fallback.minimumUnblockCondition,
  })).filter((item) => item.alias);
}

function normalizeConditions(handoff = {}, ownerHandoffs = [], alias) {
  const provided = Array.isArray(handoff.minimumUnblockConditions) ? handoff.minimumUnblockConditions : [];
  const source = provided.length > 0 ? provided : ownerHandoffs;
  const fallback = DEFAULT_HANDOFFS[alias] || DEFAULT_HANDOFFS.wecom_source_readiness_not_checked;
  if (alias === "sanitization_failed" || alias === "wecom_source_readiness_not_checked") {
    return [{
      alias: fallback.alias,
      owner: fallback.owner,
      condition: fallback.minimumUnblockCondition,
    }];
  }
  return source.map((item) => ({
    alias: item.alias || fallback.alias,
    owner: item.owner || fallback.owner,
    condition: item.condition || item.minimumUnblockCondition || fallback.minimumUnblockCondition,
  })).filter((item) => item.alias);
}

function buildDecision(alias, input = {}, options = {}) {
  const handoff = input.sourceReadinessHandoff || {};
  const ready = alias === "wecom_source_ready" && handoff.status === "ready";
  const ownerHandoffs = ready ? [DEFAULT_HANDOFFS.wecom_source_ready] : normalizeOwnerHandoffs(handoff, alias);
  const minimumUnblockConditions = ready ? [] : normalizeConditions(handoff, ownerHandoffs, alias);

  return {
    status: ready ? "ready" : alias === "wecom_source_readiness_not_checked" ? "not_checked" : "blocked",
    release: ready ? "release_after_report" : "hold",
    decision: ready ? "ready_for_org_tree_readiness" : "blocked",
    reasonAlias: alias,
    sourceAlias: options.sourceAlias || "wecom_source_release_decision",
    generatedAt: generatedAt(options),
    aliases: ready ? ["wecom_source_ready"] : unique([alias, ...(handoff.aliases || [])]),
    ownerHandoffs,
    minimumUnblockConditions,
    safeNextSteps: ready ? READY_NEXT_STEPS : [
      DEFAULT_HANDOFFS[alias]?.nextAction || BLOCKED_NEXT_STEPS[0],
      ...BLOCKED_NEXT_STEPS.slice(1),
    ],
    doNotProceedReasons: DO_NOT_PROCEED_REASONS,
    evidenceShapeVersion: EVIDENCE_SHAPE_VERSION,
  };
}

// Release decision 只消费 source readiness handoff 的脱敏摘要，不读取组织树/API/Gateway/Insight 或写入同步入口。
function createWecomSourceReleaseDecision(input = {}, options = {}) {
  if (!input.sourceReadinessHandoff) {
    return buildDecision("wecom_source_readiness_not_checked", input, options);
  }
  if (containsSensitiveEvidence(input)) {
    return buildDecision("sanitization_failed", {}, options);
  }
  return buildDecision(firstReasonAlias(input.sourceReadinessHandoff), input, options);
}

module.exports = {
  createWecomSourceReleaseDecision,
};
