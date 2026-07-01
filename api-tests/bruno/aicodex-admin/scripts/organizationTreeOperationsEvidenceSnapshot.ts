// @ts-nocheck
const {
  evaluateOrganizationTreeOperationsSmokeSummary,
} = require("./organizationTreeOperationsSmokeSummary");

const EVIDENCE_SANITIZATION_FAILED_ALIAS = "organization_tree_evidence_sanitization_failed";

const FORBIDDEN_FIELD_NAME_PARTS = [
  "account",
  "authorization",
  "cookie",
  "email",
  "login",
  "mobile",
  "password",
  "phone",
  "secret",
  "sourcetenant",
  "token",
  "username",
];

const RAW_RESPONSE_FIELD_NAMES = new Set([
  "body",
  "rawbody",
  "responsebody",
  "rawresponse",
  "fullresponse",
]);

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

function hasObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function generatedAt(options = {}) {
  return options.generatedAt || new Date().toISOString();
}

function hasForbiddenFieldName(key) {
  const normalized = String(key || "").toLowerCase();
  return RAW_RESPONSE_FIELD_NAMES.has(normalized) ||
    FORBIDDEN_FIELD_NAME_PARTS.some((part) => normalized.includes(part)) ||
    normalized.endsWith("configref") ||
    normalized.endsWith("secretref");
}

function hasForbiddenStringValue(value) {
  return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

function looksLikeCompleteTreeNode(node) {
  if (!hasObject(node)) {
    return false;
  }
  const keys = Object.keys(node).map((key) => key.toLowerCase());
  const hasStableId = keys.some((key) => key === "id" || key.endsWith("id"));
  const hasReadableLabel = keys.some((key) => ["name", "displayname", "label", "title"].includes(key));
  const hasTreeShape = keys.some((key) => ["children", "parentid", "path", "ancestors"].includes(key));
  return hasStableId && (hasReadableLabel || hasTreeShape);
}

// 单根树带 children/path 也可能还原完整组织结构，因此不能只按节点数量判断。
function containsCompleteTreeNodeList(value) {
  if (!Array.isArray(value)) {
    return false;
  }
  const objectItems = value.filter(hasObject);
  return objectItems.some((item) => {
    if (!looksLikeCompleteTreeNode(item)) {
      return false;
    }
    return objectItems.length > 1 ||
      Array.isArray(item.children) ||
      item.parentId !== undefined ||
      item.path !== undefined ||
      item.ancestors !== undefined;
  });
}

// Evidence snapshot 面向可提交材料；任何原始响应体、可识别主体或完整树迹象都先 fail closed。
function containsUnsafeEvidenceInput(value) {
  if (Array.isArray(value)) {
    return containsCompleteTreeNodeList(value) || value.some(containsUnsafeEvidenceInput);
  }
  if (hasObject(value)) {
    return Object.entries(value).some(([key, nested]) => {
      if (hasForbiddenFieldName(key)) {
        return true;
      }
      return containsUnsafeEvidenceInput(nested);
    });
  }
  if (typeof value === "string") {
    return hasForbiddenStringValue(value);
  }
  return false;
}

function evidenceBoundaries(summaryBoundaries = []) {
  return [
    ...summaryBoundaries,
    "evidence snapshot 不是 subjectCount>=1 证明",
    "evidence snapshot 不能替代受控 60 smoke 或真实 fixture 授权",
    "evidence snapshot 不包含完整诊断响应、完整来源响应体或完整组织树节点列表",
  ];
}

function sanitizationFailureSnapshot(options = {}) {
  const alias = EVIDENCE_SANITIZATION_FAILED_ALIAS;
  return {
    status: "blocked",
    aliases: [alias],
    counts: {nodeCount: 0, visibleNodeCount: 0, filteredNodeCount: 0, sourceConnectionCount: 0},
    checks: {
      sanitization: {status: "blocked", alias, reason: "sensitive_or_raw_evidence_input_present"},
    },
    handoffs: [{
      alias,
      owner: "admin_operator",
      nextAction: "删除 token、Cookie、Bearer、私有 URL、账号、邮箱、手机号、完整组织树节点列表或完整响应体后重跑",
      minimumUnblockCondition: "输入只保留脱敏诊断、counts、稳定 alias、检查状态和必要的受控响应摘要",
    }],
    minimumUnblockConditions: [{
      alias,
      condition: "删除敏感或原始响应字段后重跑 evidence snapshot",
    }],
    boundaries: evidenceBoundaries(),
    evidence: {
      generatedAt: generatedAt(options),
      summaryStatus: "blocked",
      aliases: [alias],
      counts: {nodeCount: 0, visibleNodeCount: 0, filteredNodeCount: 0, sourceConnectionCount: 0},
      checkStatuses: {sanitization: "blocked"},
    },
    leaseReleaseRecommendation: "blocked_until_sanitized_input",
  };
}

function toCheckStatuses(checks = {}) {
  return Object.fromEntries(
    Object.entries(checks).map(([name, check]) => [name, check.status]),
  );
}

function toMinimumUnblockConditions(handoffs = []) {
  return handoffs.map((handoff) => ({
    alias: handoff.alias,
    owner: handoff.owner,
    condition: handoff.minimumUnblockCondition,
  }));
}

// 生成可提交/回传的最小证据快照；输入一旦出现原始响应或可识别主体，先返回稳定阻断别名。
function createOrganizationTreeOperationsEvidenceSnapshot(input = {}, options = {}) {
  if (containsUnsafeEvidenceInput(input)) {
    return sanitizationFailureSnapshot(options);
  }

  const summary = evaluateOrganizationTreeOperationsSmokeSummary(input, options);
  const checkStatuses = toCheckStatuses(summary.checks);
  return {
    status: summary.status,
    aliases: summary.aliases,
    counts: summary.counts,
    checks: summary.checks,
    handoffs: summary.handoffs,
    minimumUnblockConditions: toMinimumUnblockConditions(summary.handoffs),
    boundaries: evidenceBoundaries(summary.boundaries),
    evidence: {
      generatedAt: generatedAt(options),
      summaryStatus: summary.status,
      aliases: summary.aliases,
      counts: summary.counts,
      checkStatuses,
    },
    leaseReleaseRecommendation: summary.status === "ready" ? "release_after_report" : "hold_until_minimum_unblock_conditions_clear",
  };
}

module.exports = {
  EVIDENCE_SANITIZATION_FAILED_ALIAS,
  createOrganizationTreeOperationsEvidenceSnapshot,
};
