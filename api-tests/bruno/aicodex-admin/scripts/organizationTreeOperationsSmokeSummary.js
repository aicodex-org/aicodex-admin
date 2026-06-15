const SANITIZATION_FAILED_ALIAS = "sanitization_failed";
const EMPTY_TREE_ALIAS = "empty_tree";
const NON_EMPTY_FIXTURE_MISSING_ALIAS = "non_empty_fixture_missing";
const READ_MODEL_UNTRUSTED_ALIAS = "read_model_untrusted";
const SOURCE_CONNECTION_STALE_ALIAS = "source_connection_stale";
const LINEAGE_MISSING_ALIAS = "lineage_missing";
const REFRESH_STATUS_UNAVAILABLE_ALIAS = "refresh_status_unavailable";

const TRUSTED_READ_MODEL_SOURCES = new Set([
  "platform_department",
  "mixed_platform_group",
  "compat_group",
]);

const FORBIDDEN_FIELD_NAME_PARTS = [
  "authorization",
  "cookie",
  "email",
  "mobile",
  "phone",
  "secret",
  "token",
];

const FORBIDDEN_VALUE_PATTERNS = [
  /bearer\s+\S+/i,
  /authorization:\s*\S+/i,
  /cookie:\s*\S+/i,
  /secret:\/\//i,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /(?:\+?\d[\s-]?){10,}/,
];

function hasObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function toNumber(value, defaultValue = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

// Summary 可能被粘贴完整响应调用，先 fail closed 避免把凭据或可识别主体写入控制台和验证记录。
function containsSensitiveValue(value) {
  if (Array.isArray(value)) {
    return value.some(containsSensitiveValue);
  }
  if (hasObject(value)) {
    return Object.entries(value).some(([key, nested]) => {
      const normalizedKey = key.toLowerCase();
      const hasSensitiveName = FORBIDDEN_FIELD_NAME_PARTS.some((part) => normalizedKey.includes(part)) ||
        normalizedKey.includes("sourcetenant") ||
        normalizedKey.endsWith("configref") ||
        normalizedKey.endsWith("secretref");
      return hasSensitiveName || containsSensitiveValue(nested);
    });
  }
  if (typeof value === "string") {
    return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value));
  }
  return false;
}

function addAlias(aliases, alias) {
  if (alias && !aliases.includes(alias)) {
    aliases.push(alias);
  }
}

function addHandoff(handoffs, item) {
  if (!handoffs.some((existing) => existing.owner === item.owner && existing.alias === item.alias)) {
    handoffs.push(item);
  }
}

function handoffForAlias(alias) {
  switch (alias) {
  case EMPTY_TREE_ALIAS:
  case NON_EMPTY_FIXTURE_MISSING_ALIAS:
    return {
      alias,
      owner: "fixture_owner",
      nextAction: "使用已知具备可管理组织树的测试账号或受控 fixture 后重新运行只读 summary",
      minimumUnblockCondition: "诊断或可选组织树响应能证明 Admin-owned 非空 nodes，且不依赖 consumer-only 或 Insight fallback",
    };
  case READ_MODEL_UNTRUSTED_ALIAS:
    return {
      alias,
      owner: "admin_read_model_owner",
      nextAction: "检查 Admin 组织树 read model source、生命周期和 fail-closed 诊断，不让下游本地补算",
      minimumUnblockCondition: "readModelSource 为 platform_department、mixed_platform_group、compat_group 或等价可信 Admin source",
    };
  case SOURCE_CONNECTION_STALE_ALIAS:
    return {
      alias,
      owner: "admin_source_owner",
      nextAction: "检查 Admin-owned SourceConnection 状态、freshness、source snapshot 和同步批次",
      minimumUnblockCondition: "SourceConnection 不再 stale/disabled/unavailable/unknown，且 freshness 可判定",
    };
  case LINEAGE_MISSING_ALIAS:
    return {
      alias,
      owner: "admin_source_owner",
      nextAction: "补齐 Admin 主模型 lineage、sourceVersion、orgVersion/scopeVersion 或 sync batch 摘要后重跑",
      minimumUnblockCondition: "诊断 summary 包含脱敏 lineage 或等价 source/version/batch 摘要",
    };
  case REFRESH_STATUS_UNAVAILABLE_ALIAS:
    return {
      alias,
      owner: "admin_operator",
      nextAction: "只读调用 refresh_status 并确认返回 traceId、triggerType=refresh_status 和稳定诊断摘要",
      minimumUnblockCondition: "refresh_status 响应 status=ok，且包含 traceId 与 diagnostics.summary",
    };
  case SANITIZATION_FAILED_ALIAS:
    return {
      alias,
      owner: "admin_operator",
      nextAction: "删除 token、Cookie、邮箱、手机号、source tenant metadata、完整组织树或完整来源响应体后重跑",
      minimumUnblockCondition: "summary 输入只包含脱敏诊断、counts、alias 和必要状态字段",
    };
  default:
    return {
      alias,
      owner: "admin_operator",
      nextAction: "根据组织树运营 smoke runbook 处理该 alias 后重跑 summary",
      minimumUnblockCondition: "阻断 alias 消失，且只读 summary 返回 ready 或明确 not_checked",
    };
  }
}

function pushBlocked(checks, aliases, handoffs, checkName, alias, reason) {
  addAlias(aliases, alias);
  addHandoff(handoffs, handoffForAlias(alias));
  checks[checkName] = {status: "blocked", alias, reason};
}

function pushNotChecked(checks, aliases, handoffs, checkName, alias, reason) {
  addAlias(aliases, alias);
  addHandoff(handoffs, handoffForAlias(alias));
  checks[checkName] = {status: "not_checked", alias, reason};
}

function isTrustedReadModelSource(readModelSource) {
  const normalized = String(readModelSource || "").toLowerCase();
  return TRUSTED_READ_MODEL_SOURCES.has(normalized);
}

// orgVersion/generatedAt 只能说明版本时间，不足以替代来源 lineage 或 sync batch 证明。
function hasLineage(summary = {}) {
  const lineage = summary.lineage || summary.lineageSummary;
  return Boolean(
    lineage ||
    summary.sourceVersion ||
    summary.latestSyncBatch ||
    summary.syncBatch,
  );
}

// SourceConnection stale/unknown 必须阻断非空能力声明，避免下游把不可信 read model 外推成授权事实。
function hasStaleSource(summary = {}, sourceConnections = []) {
  const sourceSummary = summary.sourceConnectionSummary || {};
  if (sourceSummary.hasStaleFreshness || sourceSummary.hasUnavailableFreshness || sourceSummary.hasUnknownFreshness) {
    return true;
  }
  const statusCounts = sourceSummary.statusCounts || {};
  const freshnessCounts = sourceSummary.freshnessCounts || {};
  const staleStatusCount = ["DISABLED", "DELETED", "CONFLICTED", "STALE", "UNKNOWN", "UNAVAILABLE"]
    .some((key) => toNumber(statusCounts[key]) > 0);
  const staleFreshnessCount = ["STALE", "UNKNOWN", "UNAVAILABLE"]
    .some((key) => toNumber(freshnessCounts[key]) > 0);
  if (staleStatusCount || staleFreshnessCount) {
    return true;
  }
  return sourceConnections.some((connection) => {
    const status = String(connection.status || connection.sourceConnectionStatus || "").toUpperCase();
    const freshness = String(connection.freshness || connection.freshnessStatus || "").toUpperCase();
    return ["DISABLED", "DELETED", "CONFLICTED", "STALE", "UNKNOWN", "UNAVAILABLE"].includes(status) ||
      ["STALE", "UNKNOWN", "UNAVAILABLE"].includes(freshness);
  });
}

function extractNodes(response) {
  if (!response) {
    return undefined;
  }
  const data = response.data || response;
  if (Array.isArray(data.nodes)) {
    return data.nodes;
  }
  if (Array.isArray(data.tree)) {
    return data.tree;
  }
  if (Array.isArray(data.items)) {
    return data.items;
  }
  return undefined;
}

function evaluateDiagnostics(response, checks, aliases, handoffs) {
  const data = response?.data;
  const summary = data?.summary || {};
  if (response?.status !== "ok" || !data || !hasObject(summary)) {
    pushBlocked(checks, aliases, handoffs, "diagnostics", READ_MODEL_UNTRUSTED_ALIAS, "diagnostics_unavailable");
    return {data: {}, summary: {}, nodes: []};
  }

  checks.diagnostics = {status: "ready"};

  if (!isTrustedReadModelSource(summary.readModelSource) || data.consumerOnly || data.insightFallback) {
    pushBlocked(checks, aliases, handoffs, "readModel", READ_MODEL_UNTRUSTED_ALIAS, "read_model_source_untrusted");
  } else {
    checks.readModel = {status: "ready"};
  }

  if (!hasLineage(summary)) {
    pushBlocked(checks, aliases, handoffs, "lineage", LINEAGE_MISSING_ALIAS, "lineage_summary_missing");
  } else {
    checks.lineage = {status: "ready"};
  }

  if (hasStaleSource(summary, data.sourceConnections || [])) {
    pushBlocked(checks, aliases, handoffs, "sourceConnection", SOURCE_CONNECTION_STALE_ALIAS, "source_connection_not_fresh");
  } else {
    checks.sourceConnection = {status: "ready"};
  }

  return {
    data,
    summary,
    nodes: Array.isArray(data.nodes) ? data.nodes : [],
  };
}

function evaluateNonEmptyTree(input, options, diagnosticsResult, checks, aliases, handoffs) {
  const treeNodes = extractNodes(input.organizationTreeResponse);
  if (options.requireTreeResponse && treeNodes === undefined) {
    pushNotChecked(checks, aliases, handoffs, "nonEmptyTree", NON_EMPTY_FIXTURE_MISSING_ALIAS, "organization_tree_response_not_provided");
    return;
  }

  const nodes = treeNodes === undefined ? diagnosticsResult.nodes : treeNodes;
  const count = Array.isArray(nodes) ? nodes.length : toNumber(diagnosticsResult.summary.nodeCount);
  if (count > 0) {
    checks.nonEmptyTree = {status: "ready"};
    return;
  }

  if (options.requireNonEmptyTree || options.requireTreeResponse) {
    pushBlocked(checks, aliases, handoffs, "nonEmptyTree", EMPTY_TREE_ALIAS, diagnosticsResult.data.emptyTreeClass || "node_count_zero");
    return;
  }

  checks.nonEmptyTree = {status: "not_checked", reason: "non_empty_tree_not_required"};
}

function evaluateRefreshStatus(response, options, checks, aliases, handoffs) {
  if (!response) {
    if (options.requireRefreshStatus) {
      pushNotChecked(checks, aliases, handoffs, "refreshStatus", REFRESH_STATUS_UNAVAILABLE_ALIAS, "refresh_status_response_not_provided");
      return;
    }
    checks.refreshStatus = {status: "not_checked", reason: "refresh_status_not_provided"};
    return;
  }
  const data = response.data || {};
  if (response.status !== "ok" || data.triggerType !== "refresh_status" || data.status !== "ok" || !data.traceId || !data.diagnostics?.summary) {
    pushBlocked(checks, aliases, handoffs, "refreshStatus", REFRESH_STATUS_UNAVAILABLE_ALIAS, "refresh_status_response_unavailable");
    return;
  }
  checks.refreshStatus = {status: "ready"};
}

function statusFor(checks) {
  const statuses = Object.values(checks).map((check) => check.status);
  if (statuses.includes("blocked")) {
    return "blocked";
  }
  if (statuses.includes("not_checked")) {
    return "not_checked";
  }
  return "ready";
}

// evaluateOrganizationTreeOperationsSmokeSummary 只汇总脱敏 readiness，不输出原始节点或完整响应体。
function evaluateOrganizationTreeOperationsSmokeSummary(input = {}, options = {}) {
  if (containsSensitiveValue(input)) {
    return {
      status: "blocked",
      aliases: [SANITIZATION_FAILED_ALIAS],
      counts: {nodeCount: 0, visibleNodeCount: 0, filteredNodeCount: 0, sourceConnectionCount: 0},
      checks: {
        sanitization: {status: "blocked", alias: SANITIZATION_FAILED_ALIAS, reason: "sensitive_input_present"},
      },
      handoffs: [handoffForAlias(SANITIZATION_FAILED_ALIAS)],
      boundaries: summaryBoundaries(),
    };
  }

  const aliases = [];
  const handoffs = [];
  const checks = {};
  const diagnosticsResult = evaluateDiagnostics(input.diagnosticsResponse, checks, aliases, handoffs);
  evaluateNonEmptyTree(input, options, diagnosticsResult, checks, aliases, handoffs);
  evaluateRefreshStatus(input.refreshStatusResponse, options, checks, aliases, handoffs);

  return {
    status: statusFor(checks),
    aliases,
    counts: {
      nodeCount: toNumber(diagnosticsResult.summary.nodeCount, diagnosticsResult.nodes.length),
      visibleNodeCount: toNumber(diagnosticsResult.summary.visibleNodeCount),
      filteredNodeCount: toNumber(diagnosticsResult.summary.filteredNodeCount),
      sourceConnectionCount: Array.isArray(diagnosticsResult.data.sourceConnections) ?
        diagnosticsResult.data.sourceConnections.length :
        toNumber(diagnosticsResult.summary.sourceConnectionSummary?.total),
    },
    checks,
    handoffs,
    boundaries: summaryBoundaries(),
  };
}

function summaryBoundaries() {
  return [
    "summary 只代表 Admin 组织树运营 smoke readiness，不是 API/Gateway authorization facts",
    "普通空树、consumer-only 结果或 Insight fallback 不能外推为 Admin 非空组织树能力通过",
    "不得查询 API/Insight/gateway store，不得写真实 fixture、重建 read model 或记录完整响应体",
  ];
}

module.exports = {
  evaluateOrganizationTreeOperationsSmokeSummary,
};
