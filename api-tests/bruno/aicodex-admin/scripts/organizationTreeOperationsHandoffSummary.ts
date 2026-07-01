// @ts-nocheck
const HANDOFF_SANITIZATION_FAILED_ALIAS = "organization_tree_handoff_sanitization_failed";

const FORBIDDEN_FIELD_NAME_PARTS = [
  "account",
  "authorization",
  "body",
  "cookie",
  "email",
  "login",
  "mobile",
  "password",
  "phone",
  "privateurl",
  "rawresponse",
  "responsebody",
  "secret",
  "sourcetenant",
  "token",
  "username",
];

const FORBIDDEN_VALUE_PATTERNS = [
  /bearer\s+\S+/i,
  /cookie:\s*\S+/i,
  /https?:\/\/\S+/i,
  /\b(?:10|127)\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/,
  /\b172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}\b/,
  /\b192\.168\.\d{1,3}\.\d{1,3}\b/,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /(?:\+?\d[\s-]?){10,}/,
];

const REQUIRED_BOUNDARIES = [
  "handoff summary 不是 subjectCount>=1 证明",
  "handoff summary 不能替代受控 60 smoke、真实 fixture 授权、真实 read model 重建或数据库核验",
  "handoff summary 不能外推为 API/Gateway/Insight 授权事实，也不能要求下游本地补算组织树或 scope",
  "handoff summary 不包含完整组织树节点列表、完整诊断响应、完整来源响应体、token、Cookie、私有 URL、账号、邮箱或手机号",
];

function hasObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function generatedAt(options = {}) {
  return options.generatedAt || new Date().toISOString();
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function hasForbiddenFieldName(key) {
  const normalized = String(key || "").toLowerCase();
  return FORBIDDEN_FIELD_NAME_PARTS.some((part) => normalized.includes(part)) ||
    normalized.endsWith("configref") ||
    normalized.endsWith("secretref");
}

function hasForbiddenStringValue(value) {
  return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

function containsUnsafeHandoffInput(value) {
  if (Array.isArray(value)) {
    return value.some(containsUnsafeHandoffInput);
  }
  if (hasObject(value)) {
    return Object.entries(value).some(([key, nested]) => (
      hasForbiddenFieldName(key) || containsUnsafeHandoffInput(nested)
    ));
  }
  return typeof value === "string" && hasForbiddenStringValue(value);
}

function stableCounts(counts = {}) {
  return {
    nodeCount: Number(counts.nodeCount) || 0,
    visibleNodeCount: Number(counts.visibleNodeCount) || 0,
    filteredNodeCount: Number(counts.filteredNodeCount) || 0,
    sourceConnectionCount: Number(counts.sourceConnectionCount) || 0,
  };
}

function stableOwnerHandoffs(handoffs = []) {
  return handoffs.map((handoff) => ({
    alias: handoff.alias,
    owner: handoff.owner || "admin_operator",
    nextAction: handoff.nextAction,
    minimumUnblockCondition: handoff.minimumUnblockCondition,
  })).filter((handoff) => handoff.alias);
}

function stableMinimumUnblockConditions(source = {}) {
  if (Array.isArray(source.minimumUnblockConditions) && source.minimumUnblockConditions.length > 0) {
    return source.minimumUnblockConditions.map((condition) => ({
      alias: condition.alias,
      owner: condition.owner || "admin_operator",
      condition: condition.condition,
    })).filter((condition) => condition.alias);
  }
  return stableOwnerHandoffs(source.handoffs).map((handoff) => ({
    alias: handoff.alias,
    owner: handoff.owner,
    condition: handoff.minimumUnblockCondition,
  }));
}

function boundariesFrom(source = {}) {
  return unique([...(source.boundaries || []), ...REQUIRED_BOUNDARIES]);
}

function localBlockerCategory(status, aliases = []) {
  if (status === "ready") {
    return "none";
  }
  if (aliases.includes(HANDOFF_SANITIZATION_FAILED_ALIAS) ||
    aliases.includes("organization_tree_evidence_sanitization_failed") ||
    aliases.includes("sanitization_failed")) {
    return "sanitization_failed";
  }
  if (status === "not_checked") {
    return "local_evidence_not_checked";
  }
  if (aliases.some((alias) => ["read_model_untrusted", "source_connection_stale", "lineage_missing"].includes(alias))) {
    return "admin_source_or_read_model_blocked";
  }
  if (aliases.some((alias) => ["empty_tree", "non_empty_fixture_missing", "refresh_status_unavailable"].includes(alias))) {
    return "fixture_or_local_check_blocked";
  }
  return "local_handoff_blocked";
}

function doNotDispatchUntil(status, aliases = [], minimumUnblockConditions = []) {
  if (status === "ready") {
    return "可回传给协调层；仍不得替代受控 60 smoke、真实 fixture 授权、真实 read model 重建或数据库核验";
  }
  const aliasText = aliases.length > 0 ? aliases.join("|") : "unknown_alias";
  const conditions = minimumUnblockConditions.map((item) => item.condition).filter(Boolean);
  return `不要外派为 full-success；等待 ${aliasText} 的最小解除条件清除${conditions.length > 0 ? `：${conditions.join("；")}` : ""}`;
}

function sanitizationFailureHandoff(options = {}) {
  const alias = HANDOFF_SANITIZATION_FAILED_ALIAS;
  const minimumUnblockConditions = [{
    alias,
    owner: "admin_operator",
    condition: "删除 token、Cookie、Bearer、私有 URL、账号、邮箱、手机号、完整组织树节点列表或完整响应体后重跑 handoff summary",
  }];
  return {
    status: "blocked",
    release: "hold",
    localBlockerCategory: "sanitization_failed",
    sourceAlias: "organization_tree_handoff",
    generatedAt: generatedAt(options),
    aliases: [alias],
    counts: stableCounts(),
    ownerHandoffs: [{
      alias,
      owner: "admin_operator",
      nextAction: "删除敏感或原始响应输入后重跑 handoff summary",
      minimumUnblockCondition: minimumUnblockConditions[0].condition,
    }],
    minimumUnblockConditions,
    boundaries: REQUIRED_BOUNDARIES,
    doNotDispatchUntil: doNotDispatchUntil("blocked", [alias], minimumUnblockConditions),
  };
}

// Handoff wrapper 只保留协调层可复制字段；输入若出现凭据、私有 URL 或原始响应迹象即 fail closed。
function createOrganizationTreeOperationsHandoffSummary(input = {}, options = {}) {
  if (containsUnsafeHandoffInput(input) || containsUnsafeHandoffInput(options)) {
    return sanitizationFailureHandoff(options);
  }

  const source = input.evidenceSnapshot || input.summary || input;
  const status = source.status === "ready" ? "ready" : source.status === "not_checked" ? "not_checked" : "blocked";
  const aliases = unique(source.aliases || []);
  const minimumUnblockConditions = stableMinimumUnblockConditions(source);

  return {
    status,
    release: status === "ready" ? "release_after_report" : "hold",
    localBlockerCategory: localBlockerCategory(status, aliases),
    sourceAlias: options.sourceAlias || "organization_tree_handoff",
    generatedAt: generatedAt(options),
    aliases,
    counts: stableCounts(source.counts),
    ownerHandoffs: stableOwnerHandoffs(source.handoffs),
    minimumUnblockConditions,
    boundaries: boundariesFrom(source),
    doNotDispatchUntil: doNotDispatchUntil(status, aliases, minimumUnblockConditions),
  };
}

module.exports = {
  HANDOFF_SANITIZATION_FAILED_ALIAS,
  createOrganizationTreeOperationsHandoffSummary,
};
