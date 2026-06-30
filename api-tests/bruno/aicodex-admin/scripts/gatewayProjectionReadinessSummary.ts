const {
  DEPLOY_STALE_ALIAS,
  NO_PUBLISHABLE_SUBJECTS_ALIAS,
  SANITIZATION_FAILED_ALIAS,
  evaluateGatewayProjectionObservabilityPreflight,
} = require("./gatewayProjectionObservabilityPreflight");

const SOURCE_STALE_ALIAS = "source_connection_stale";
const MAPPING_MISSING_ALIAS = "mapping_missing";
const MAPPING_UNTRUSTED_ALIAS = "mapping_untrusted";
const SOURCE_METADATA_UNAVAILABLE_ALIAS = "source_metadata_unavailable";
const LINEAGE_FRESHNESS_UNAVAILABLE_ALIAS = "lineage_freshness_unavailable";
const LIFECYCLE_NOT_PUBLISHABLE_ALIAS = "lifecycle_not_publishable";

const FORBIDDEN_FIELD_NAME_PARTS = [
  "authorization",
  "cookie",
  "token",
  "metadata",
];

const FORBIDDEN_VALUE_PATTERNS = [
  /bearer\s+\S+/i,
  /authorization:\s*\S+/i,
  /cookie:\s*\S+/i,
  /secret:\/\//i,
];

function hasObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function toNumber(value, defaultValue = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function containsCredentialLikeValue(value) {
  if (Array.isArray(value)) {
    return value.some(containsCredentialLikeValue);
  }
  if (hasObject(value)) {
    return Object.entries(value).some(([key, nested]) => {
      const normalizedKey = key.toLowerCase();
      const hasSensitiveName = FORBIDDEN_FIELD_NAME_PARTS.includes(normalizedKey) ||
        normalizedKey.includes("sourcetenant") ||
        normalizedKey.endsWith("configref") ||
        normalizedKey.endsWith("secretref");
      return hasSensitiveName || containsCredentialLikeValue(nested);
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
  case DEPLOY_STALE_ALIAS:
    return {
      alias,
      owner: "admin_deploy_owner",
      nextAction: "部署包含当前 Admin observability/preflight shape 的运行包后重新读取 readiness summary",
      minimumUnblockCondition: "observability latestPublish 返回 sourceConnectionSummary、statusCounts、freshnessCounts 和 freshness boolean signals",
    };
  case NO_PUBLISHABLE_SUBJECTS_ALIAS:
    return {
      alias,
      owner: "fixture_owner",
      nextAction: "在已授权测试窗口准备受控 active/tombstone subject fixture 后重新运行只读 summary",
      minimumUnblockCondition: "latest publish audit 的 subjectCount/tombstoneSubjectCount 达到私有环境阈值",
    };
  case SOURCE_STALE_ALIAS:
    return {
      alias,
      owner: "admin_source_owner",
      nextAction: "检查 Admin-owned source connection status/freshness 和 source snapshot，不查询 API/Insight/gateway store",
      minimumUnblockCondition: "source freshness 不再 stale/unavailable/unknown，或存在更具体的 publish/build 失败分类",
    };
  case MAPPING_MISSING_ALIAS:
    return {
      alias,
      owner: "admin_mapping_operator",
      nextAction: "在 Admin 映射页维护同 organizationId + adminSubject 的一等 PlatformApiUserMapping.ApiUserId",
      minimumUnblockCondition: "存在 confirmed PlatformApiUserMapping.ApiUserId，且不使用 display/phone/email/legacy lineage 作为 join key",
    };
  case MAPPING_UNTRUSTED_ALIAS:
    return {
      alias,
      owner: "admin_mapping_operator",
      nextAction: "检查 PlatformUser.MappingStatus 和 PlatformApiUserMapping.MappingStatus 后重新读取 readiness counts",
      minimumUnblockCondition: "active subject 的平台用户和 API mapping 均为 CONFIRMED；tombstone 仅使用 confirmed/disabled 确定 ApiUserId",
    };
  case SOURCE_METADATA_UNAVAILABLE_ALIAS:
  case LINEAGE_FRESHNESS_UNAVAILABLE_ALIAS:
    return {
      alias,
      owner: "admin_source_owner",
      nextAction: "检查 Admin source snapshot、OrgSyncBatch、orgVersion/sourceVersion 与 freshness 元数据",
      minimumUnblockCondition: "Admin 主模型具备可判定 lineage/source version/freshness 元数据",
    };
  case LIFECYCLE_NOT_PUBLISHABLE_ALIAS:
    return {
      alias,
      owner: "admin_mapping_operator",
      nextAction: "等待或触发已授权的 Admin source 同步，使 lifecycle 收敛到可发布或 tombstone 状态",
      minimumUnblockCondition: "subject lifecycle 为 ACTIVE 或受支持 tombstone 状态，且映射满足对应信任边界",
    };
  default:
    return {
      alias,
      owner: "admin_operator",
      nextAction: "根据 alias/reason 查阅 Admin projection readiness runbook",
      minimumUnblockCondition: "阻断 alias 消失且只读 summary 返回 ok",
    };
  }
}

function sanitizeCounts(counts: LooseRecord = {}) {
  return {
    active_publishable: toNumber(counts.active_publishable),
    tombstone_publishable: toNumber(counts.tombstone_publishable),
    mapping_missing: toNumber(counts.mapping_missing),
    mapping_untrusted: toNumber(counts.mapping_untrusted),
    lifecycle_not_publishable: toNumber(counts.lifecycle_not_publishable),
    source_metadata_unavailable: toNumber(counts.source_metadata_unavailable),
    lineage_freshness_unavailable: toNumber(counts.lineage_freshness_unavailable),
  };
}

function summarizeMappingReadiness(response, aliases, handoffs) {
  if (!response) {
    addHandoff(handoffs, {
      alias: "mapping_readiness_not_checked",
      owner: "admin_mapping_operator",
      nextAction: "提供脱敏 organization alias 后只读调用 /api/get-platform-api-user-mapping-readiness",
      minimumUnblockCondition: "summary 输入包含 mapping readiness counts，且验证记录不写完整 organizationId 或候选明细",
    });
    return {
      status: "not_checked",
      counts: sanitizeCounts(),
    };
  }
  if (response.status !== "ok" || !hasObject(response.data)) {
    addAlias(aliases, "mapping_readiness_unavailable");
    addHandoff(handoffs, handoffForAlias("mapping_readiness_unavailable"));
    return {
      status: "blocked",
      counts: sanitizeCounts(),
    };
  }

  const counts = sanitizeCounts(response.data.counts);
  const mappingAliases: Array<[string, number]> = [
    [MAPPING_MISSING_ALIAS, counts.mapping_missing],
    [MAPPING_UNTRUSTED_ALIAS, counts.mapping_untrusted],
    [LIFECYCLE_NOT_PUBLISHABLE_ALIAS, counts.lifecycle_not_publishable],
    [SOURCE_METADATA_UNAVAILABLE_ALIAS, counts.source_metadata_unavailable],
    [LINEAGE_FRESHNESS_UNAVAILABLE_ALIAS, counts.lineage_freshness_unavailable],
  ];
  for (const [alias, count] of mappingAliases) {
    if (count > 0) {
      addAlias(aliases, alias);
      addHandoff(handoffs, handoffForAlias(alias));
    }
  }
  return {
    status: mappingAliases.some(([, count]) => count > 0) ? "blocked" : "ok",
    totalSubjectCount: toNumber(response.data.totalSubjectCount),
    counts,
  };
}

function addSourceFreshnessSignals(preflightSummary, aliases, handoffs) {
  const sourceSummary = preflightSummary?.sourceConnectionSummary || {};
  if (sourceSummary.hasStaleFreshness || sourceSummary.hasUnavailableFreshness || sourceSummary.hasUnknownFreshness) {
    addAlias(aliases, SOURCE_STALE_ALIAS);
    addHandoff(handoffs, handoffForAlias(SOURCE_STALE_ALIAS));
  }
}

function statusFor(aliases, mappingStatus) {
  if (aliases.length > 0) {
    return "blocked";
  }
  if (mappingStatus === "not_checked") {
    return "partial";
  }
  return "ok";
}

// evaluateGatewayProjectionReadinessSummary 汇总只读 operator 诊断；输出只包含 alias/counts/handoff，不携带原始响应。
function evaluateGatewayProjectionReadinessSummary(input: LooseRecord = {}, options: LooseRecord = {}) {
  if (containsCredentialLikeValue(input)) {
    return {
      status: "blocked",
      aliases: [SANITIZATION_FAILED_ALIAS],
      observability: {status: "blocked", alias: SANITIZATION_FAILED_ALIAS, reason: "sensitive_field_present"},
      mappingReadiness: {status: "not_evaluated", counts: sanitizeCounts()},
      handoffs: [handoffForAlias(SANITIZATION_FAILED_ALIAS)],
    };
  }

  const aliases = [];
  const handoffs = [];
  const observability = evaluateGatewayProjectionObservabilityPreflight(input.observabilityResponse, options);
  if (observability.alias) {
    addAlias(aliases, observability.alias);
    addHandoff(handoffs, handoffForAlias(observability.alias));
  }
  if (observability.status === "ok") {
    addSourceFreshnessSignals(observability.summary, aliases, handoffs);
  }

  const mappingReadiness = summarizeMappingReadiness(input.mappingReadinessResponse, aliases, handoffs);

  return {
    status: statusFor(aliases, mappingReadiness.status),
    aliases,
    observability: {
      status: observability.status,
      alias: observability.alias,
      reason: observability.reason,
      summary: observability.summary,
    },
    mappingReadiness,
    handoffs,
    boundaries: [
      "summary 只代表 Admin producer/operator readiness，不是 gateway authorization facts",
      "不得查询 API/Insight/gateway store，不得写真实 fixture 或完整响应体",
      "display name、phone、email、legacy lineage 和 user properties 不能作为 runtime projection join key",
    ],
  };
}

module.exports = {
  evaluateGatewayProjectionReadinessSummary,
};
