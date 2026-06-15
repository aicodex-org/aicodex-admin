const {
  evaluateGatewayProjectionReadinessSummary,
} = require("./gatewayProjectionReadinessSummary");

const SOURCE_FRESHNESS_ALIASES = new Set([
  "source_connection_stale",
]);

const MAPPING_READINESS_ALIASES = new Set([
  "mapping_missing",
  "mapping_untrusted",
  "source_metadata_unavailable",
  "lineage_freshness_unavailable",
  "lifecycle_not_publishable",
  "mapping_readiness_unavailable",
]);

const BOUNDARIES = [
  "release decision 只代表本地 Admin preflight/readiness evidence 分类，不是真实 publish 成功",
  "release decision 不是 gateway ingestion 成功、authorization facts 生效，也不是完整 projection 业务成功",
  "不得查询 API/Insight/gateway store，不得写真实 fixture、完整响应体或密钥",
  "display name、phone、email、legacy lineage 和 user properties 不能作为 runtime projection join key",
];

// 每个 decision 都给出稳定 owner/action，避免 operator 从 alias 自行外推跨 owner 处置。
const DECISION_HANDOFFS = {
  "ready-for-controlled-smoke": {
    alias: "ready_for_controlled_smoke",
    owner: "admin_operator",
    nextAction: "只进入受控 smoke 准备，继续使用私有环境阈值和脱敏 evidence 验证",
    minimumUnblockCondition: "本地 observability、readiness summary 和 mapping readiness evidence 已检查且无 blocking alias",
  },
  "blocked-by-source-freshness": {
    alias: "source_connection_stale",
    owner: "admin_source_owner",
    nextAction: "检查 Admin-owned source connection status/freshness、source snapshot 和 OrgSyncBatch",
    minimumUnblockCondition: "source freshness 恢复 fresh，source snapshot/OrgSyncBatch/sourceVersion 可判定，且不要求 API/Insight/gateway store 本地补算",
  },
  "blocked-by-mapping-readiness": {
    alias: "mapping_readiness_blocked",
    owner: "admin_mapping_operator",
    nextAction: "维护一等 PlatformApiUserMapping.ApiUserId 和可信 mapping/lifecycle/source readiness",
    minimumUnblockCondition: "存在同 organizationId + adminSubject 的 confirmed ApiUserId；不得使用 display name、phone、email、legacy lineage 或 user properties 作为 runtime join key",
  },
  "blocked-by-contract-or-config": {
    alias: "contract_or_config_blocked",
    owner: "admin_deploy_owner",
    nextAction: "修复部署 shape、contract/config、latest audit、subject fixture gate 或 sanitization failure 后重跑只读 decision",
    minimumUnblockCondition: "阻断 alias 消失，输入只包含脱敏 status、counts、alias、owner 和最小解除条件",
  },
  "not-checked": {
    alias: "release_evidence_not_checked",
    owner: "admin_operator",
    nextAction: "先生成脱敏 observability preflight、readiness summary 和必要的 mapping readiness evidence",
    minimumUnblockCondition: "not checked evidence 已补齐，且不含敏感字段、完整响应体或真实 organizationId",
  },
};

function notChecked(reason, aliases = []) {
  return {
    status: "not_checked",
    decision: "not-checked",
    reason,
    aliases,
    handoffs: [{
      alias: aliases[0] || "release_evidence_not_checked",
      owner: "admin_operator",
      nextAction: "先生成脱敏 observability preflight、readiness summary 和必要的 mapping readiness evidence",
      minimumUnblockCondition: "本地只读 evidence 已提供且不含敏感字段、完整响应体或真实 organizationId",
    }],
    boundaries: BOUNDARIES,
  };
}

function generatedAt(options = {}) {
  return options.generatedAt || new Date().toISOString();
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function classifyAliases(aliases) {
  if (aliases.some(alias => SOURCE_FRESHNESS_ALIASES.has(alias))) {
    return "blocked-by-source-freshness";
  }
  if (aliases.some(alias => MAPPING_READINESS_ALIASES.has(alias))) {
    return "blocked-by-mapping-readiness";
  }
  return "blocked-by-contract-or-config";
}

// Release decision 只消费脱敏本地证据，避免把 preflight/readiness summary 外推为真实发布成功。
function evaluateGatewayProjectionReleaseDecision(input = {}, options = {}) {
  if (!input.observabilityResponse) {
    return notChecked("observability_evidence_not_checked");
  }

  const summary = evaluateGatewayProjectionReadinessSummary(input, options);
  const aliases = Array.isArray(summary.aliases) ? summary.aliases : [];
  const mappingNotChecked = summary.mappingReadiness?.status === "not_checked";

  if (mappingNotChecked && options.requireMappingReadiness) {
    return notChecked("mapping_readiness_not_checked", ["mapping_readiness_not_checked"]);
  }
  if (mappingNotChecked) {
    return notChecked("mapping_readiness_not_checked", ["mapping_readiness_not_checked"]);
  }
  if (summary.status === "blocked" || aliases.length > 0) {
    return {
      status: "blocked",
      decision: classifyAliases(aliases),
      reason: summary.observability?.reason || "release_evidence_blocked",
      aliases,
      observability: summary.observability,
      mappingReadiness: summary.mappingReadiness,
      handoffs: summary.handoffs || [],
      boundaries: BOUNDARIES,
    };
  }

  return {
    status: "ready",
    decision: "ready-for-controlled-smoke",
    reason: "local_evidence_ready_for_controlled_smoke",
    aliases,
    observability: summary.observability,
    mappingReadiness: summary.mappingReadiness,
    handoffs: summary.handoffs || [],
    boundaries: BOUNDARIES,
  };
}

function localBlockerCategory(decision) {
  switch (decision) {
  case "ready-for-controlled-smoke":
    return "none";
  case "blocked-by-source-freshness":
    return "admin_source_blocked";
  case "blocked-by-mapping-readiness":
    return "admin_mapping_blocked";
  case "blocked-by-contract-or-config":
    return "contract_or_config_blocked";
  case "not-checked":
    return "local_evidence_not_checked";
  default:
    return "contract_or_config_blocked";
  }
}

function stableOwnerHandoffs(decisionResult = {}) {
  const fallback = DECISION_HANDOFFS[decisionResult.decision] || DECISION_HANDOFFS["blocked-by-contract-or-config"];
  const handoffs = Array.isArray(decisionResult.handoffs) && decisionResult.handoffs.length > 0
    ? decisionResult.handoffs
    : [fallback];
  return handoffs.map((handoff) => ({
    alias: handoff.alias || fallback.alias,
    owner: handoff.owner || fallback.owner,
    nextAction: handoff.nextAction || fallback.nextAction,
    minimumUnblockCondition: handoff.minimumUnblockCondition || fallback.minimumUnblockCondition,
  })).filter((handoff) => handoff.alias);
}

function stableMinimumUnblockConditions(ownerHandoffs = []) {
  return ownerHandoffs.map((handoff) => ({
    alias: handoff.alias,
    owner: handoff.owner,
    condition: handoff.minimumUnblockCondition,
  })).filter((condition) => condition.alias);
}

function doNotDispatchUntil(decisionResult, minimumUnblockConditions = []) {
  if (decisionResult.decision === "ready-for-controlled-smoke") {
    return "只可回传进入受控 smoke 准备；不得外派为真实 publish、gateway ingestion、authorization facts 或 full-success";
  }
  const aliases = unique(decisionResult.aliases || []);
  const aliasText = decisionResult.decision === "not-checked"
    ? "not checked"
    : aliases.length > 0 ? aliases.join("|") : decisionResult.decision || "not checked";
  const conditions = minimumUnblockConditions.map((item) => item.condition).filter(Boolean);
  return `不要外派为 full-success；等待 ${aliasText} 的最小解除条件清除${conditions.length > 0 ? `：${conditions.join("；")}` : ""}`;
}

// Handoff summary 只保留 operator 可复制字段，不回显原始 observability 或 mapping readiness 输入。
function createGatewayProjectionReleaseDecisionHandoff(input = {}, options = {}) {
  const decisionResult = evaluateGatewayProjectionReleaseDecision(input, options);
  const ownerHandoffs = stableOwnerHandoffs(decisionResult);
  const minimumUnblockConditions = stableMinimumUnblockConditions(ownerHandoffs);

  return {
    status: decisionResult.status,
    release: decisionResult.decision === "ready-for-controlled-smoke" ? "release_after_report" : "hold",
    localBlockerCategory: localBlockerCategory(decisionResult.decision),
    decision: decisionResult.decision,
    reason: decisionResult.reason,
    sourceAlias: options.sourceAlias || "gateway_projection_release_decision",
    generatedAt: generatedAt(options),
    aliases: unique(decisionResult.aliases || []),
    ownerHandoffs,
    minimumUnblockConditions,
    boundaries: unique([...(decisionResult.boundaries || []), ...BOUNDARIES]),
    doNotDispatchUntil: doNotDispatchUntil(decisionResult, minimumUnblockConditions),
  };
}

module.exports = {
  createGatewayProjectionReleaseDecisionHandoff,
  evaluateGatewayProjectionReleaseDecision,
};
