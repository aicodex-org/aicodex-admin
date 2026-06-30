const BOUNDARIES = [
  "operator remediation handoff 只代表 Admin 侧下一步处理建议，不能外推为 API/Gateway/Insight 成功",
  "该 handoff 不证明 projection full-success、controlled smoke 已通过、生产就绪、真实 publish 成功、gateway ingestion 成功或 authorization facts 生效",
  "不得查询 API/Insight/gateway store，不得写真实 fixture、真实 DB、publish、refresh、gateway ingestion、authorization facts、read model rebuild 或 mapping confirm",
  "display name、phone、email、legacy lineage 和 user properties 不能作为 runtime projection join key",
];

const IGNORED_READY_ALIASES = new Set([
  "ready",
  "ok",
  "clear",
  "ready-for-controlled-smoke",
  "ready-for-controlled-smoke-prep",
  "ready-for-controlled-smoke-evidence-review",
  "controlled_smoke_evidence_ready_for_review",
  "controlled_smoke_release_runbook_ready",
  "api-diagnostics-clear",
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

function generatedAt(options: LooseRecord = {}) {
  return options.generatedAt || new Date().toISOString();
}

function normalizeKey(key) {
  return String(key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
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
  return /不得|不能|不是|不是真实|not\s+(?:real\s+)?(?:publish|full-success|full success|gateway ingestion|authorization facts|api success|gateway success|insight success|production ready)/i.test(text);
}

function fullSuccessFlagsFromText(text) {
  if (!text || isNegatedBoundary(text)) {
    return [];
  }
  return /full[-\s]?success|controlled smoke success|production ready|production readiness|api success|gateway success|insight success|complete projection business success|authorization facts success|gateway ingestion success|real publish success/i.test(text)
    ? ["full_success_overclaim"]
    : [];
}

function redLineFlagsFromText(text) {
  if (!text || isNegatedBoundary(text)) {
    return [];
  }
  return (/(trigger|execute|run|perform|start|create|write|rebuild|refresh|publish|ingest|confirm)\b.*\b(real|fixture|db|database|publish|ingestion|authorization facts|read model|mapping)/i.test(text) ||
      /\b(real|fixture|db|database|publish|ingestion|authorization facts|read model|mapping)\b.*\b(trigger|execute|run|perform|start|create|write|rebuild|refresh|publish|ingest|confirm)\b/i.test(text))
    ? ["real_environment_write_signal"]
    : [];
}

function collectTextFlags(value, callback, key = "") {
  const normalizedKey = normalizeKey(key);
  if (["boundaries", "donotdispatchuntil", "minimumunblockcondition", "nextaction", "actionlist"].includes(normalizedKey)) {
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

function aliasesFromObject(value: LooseRecord = {}) {
  const aliases = Array.isArray(value.aliases) ? value.aliases : [];
  return unique([
    value.alias,
    value.reasonAlias,
    value.reason,
    value.decision,
    value.localBlockerCategory,
    value.status,
    ...aliases,
  ]);
}

function collectHandoffAliases(value: LooseRecord = {}) {
  const ownerHandoffs = Array.isArray(value.ownerHandoffs) ? value.ownerHandoffs : [];
  const handoffs = Array.isArray(value.handoffs) ? value.handoffs : [];
  return [...ownerHandoffs, ...handoffs].map((item) => item.alias);
}

function collectInputAliases(input: LooseRecord = {}) {
  const aliases = [
    ...(Array.isArray(input.blockingAliases) ? input.blockingAliases : []),
    ...aliasesFromObject(input.readinessSummary),
    ...collectHandoffAliases(input.readinessSummary),
    input.readinessSummary?.observability?.alias,
    ...aliasesFromObject(input.releaseDecision),
    ...collectHandoffAliases(input.releaseDecision),
    ...aliasesFromObject(input.controlledSmokePreflight),
    ...collectHandoffAliases(input.controlledSmokePreflight),
    ...aliasesFromObject(input.controlledSmokeReleaseRunbook),
    ...collectHandoffAliases(input.controlledSmokeReleaseRunbook),
    ...aliasesFromObject(input.evidenceReadiness),
    ...collectHandoffAliases(input.evidenceReadiness),
    ...(Array.isArray(input.controlledSmokeReleaseRunbook?.missingPrerequisites) ? input.controlledSmokeReleaseRunbook.missingPrerequisites : []),
    ...(Array.isArray(input.controlledSmokeReleaseRunbook?.hardRedLineFlags) ? input.controlledSmokeReleaseRunbook.hardRedLineFlags : []),
    ...(Array.isArray(input.evidenceReadiness?.missingPrerequisites) ? input.evidenceReadiness.missingPrerequisites : []),
    ...(Array.isArray(input.evidenceReadiness?.redactionFlags) ? input.evidenceReadiness.redactionFlags : []),
    ...(Array.isArray(input.evidenceReadiness?.hardRedLineFlags) ? input.evidenceReadiness.hardRedLineFlags : []),
  ];
  return unique(aliases.map((alias) => String(alias || "").trim()).filter((alias) => alias && !IGNORED_READY_ALIASES.has(alias)));
}

function safeCounts(input: LooseRecord = {}) {
  const counts = input.readinessSummary?.mappingReadiness?.counts || {};
  return {
    active_publishable: Number(counts.active_publishable || 0),
    tombstone_publishable: Number(counts.tombstone_publishable || 0),
    mapping_missing: Number(counts.mapping_missing || 0),
    mapping_untrusted: Number(counts.mapping_untrusted || 0),
    lifecycle_not_publishable: Number(counts.lifecycle_not_publishable || 0),
    source_metadata_unavailable: Number(counts.source_metadata_unavailable || 0),
    lineage_freshness_unavailable: Number(counts.lineage_freshness_unavailable || 0),
  };
}

function remediationForAlias(alias) {
  switch (alias) {
  case "mapping_missing":
    return {
      alias,
      category: "mapping-readiness",
      owner: "admin_mapping_operator",
      actionList: [
        "在 Admin 映射页维护同 organizationId + adminSubject 的一等 PlatformApiUserMapping.ApiUserId",
        "不要使用 display name、phone、email、legacy lineage 或 user properties 作为 runtime join key",
      ],
      minimumUnblockCondition: "存在 confirmed PlatformApiUserMapping.ApiUserId，且 active subject 的 PlatformUser/PlatformApiUserMapping 状态可信",
      ownerBoundary: "Admin mapping operator 处理；API/Insight/Gateway 不在本地补算 projection",
    };
  case "mapping_untrusted":
  case "lifecycle_not_publishable":
    return {
      alias,
      category: "mapping-readiness",
      owner: "admin_mapping_operator",
      actionList: [
        "检查 PlatformUser.MappingStatus、PlatformApiUserMapping.MappingStatus 和 lifecycle readiness",
        "active subject 只接受 CONFIRMED；tombstone 仅使用 confirmed/disabled 确定 ApiUserId",
      ],
      minimumUnblockCondition: "mapping/lifecycle 状态满足 active 或 tombstone projection 信任边界",
      ownerBoundary: "Admin mapping operator 处理；不得把 display/phone/email/legacy lineage 作为发布依据",
    };
  case "source_metadata_unavailable":
  case "lineage_freshness_unavailable":
    return {
      alias,
      category: "mapping-readiness",
      owner: "admin_source_owner",
      actionList: [
        "检查 Admin source snapshot、OrgSyncBatch、orgVersion/sourceVersion 与 freshness 元数据",
        "补齐 Admin-owned source metadata 后重新运行只读 readiness",
      ],
      minimumUnblockCondition: "Admin 主模型具备可判定 lineage/source version/freshness 元数据",
      ownerBoundary: "Admin source owner 处理；不得查询 API/Insight/Gateway store 替代 source metadata",
    };
  case "source_connection_stale":
  case "source_connection_unavailable":
  case "source_connection_unknown":
    return {
      alias,
      category: "source-freshness",
      owner: "admin_source_owner",
      actionList: [
        "检查 Admin-owned source connection status/freshness、source snapshot 和 OrgSyncBatch",
        "等待 source freshness 恢复后重新读取 Gateway Projection readiness summary",
      ],
      minimumUnblockCondition: "source freshness、source snapshot、OrgSyncBatch 或 sourceVersion evidence 可判定且无 stale/unavailable/unknown blocker",
      ownerBoundary: "只在 Admin source 边界内排障；不得让 API/Insight/Gateway 本地计算 projection",
    };
  case "publisher_disabled":
  case "projection_publisher_disabled":
  case "environment_deploy_stale":
  case "mapping_readiness_unavailable":
    return {
      alias,
      category: "deploy-runtime",
      owner: "admin_deploy_owner",
      actionList: [
        "部署或切换到包含当前 observability/preflight shape 的 Admin 包",
        "只读重跑 Gateway Projection readiness summary，确认 publisher 和 diagnostics shape",
      ],
      minimumUnblockCondition: "Admin runtime 返回当前 observability shape，且 publisher/config diagnostics 不再阻断",
      ownerBoundary: "Admin deploy/runtime owner 处理；不得触发真实 publish 或 gateway ingestion",
    };
  case "refresh_disabled":
  case "projection_refresh_disabled":
    return {
      alias,
      category: "deploy-runtime",
      owner: "admin_runtime_owner",
      actionList: [
        "检查 refresh worker 配置和 freshness TTL/interval 关系",
        "只读确认 refresh diagnostics，不触发 read model rebuild 或 publish",
      ],
      minimumUnblockCondition: "refresh worker 配置可判定且 interval/freshness diagnostics 不再阻断",
      ownerBoundary: "Admin runtime owner 处理；禁止真实 refresh/write 操作",
    };
  case "gateway_contract_mismatch":
  case "contract_version_mismatch":
  case "version_mismatch":
  case "blocked-by-contract-or-config":
  case "controlled_smoke_preflight_contract_blocked":
    return {
      alias,
      category: "contract-version",
      owner: "admin_contract_owner",
      actionList: [
        "对齐 Admin projection payload/observability contract 与已接受的 API/Gateway contract",
        "修复 config/contract 后只读重跑 release decision 和 controlled smoke preflight",
      ],
      minimumUnblockCondition: "contract/config/version mismatch alias 清除，且不新增 API/Gateway 未接受字段",
      ownerBoundary: "Admin contract owner 处理；跨 API/Gateway contract 变更需要 owner 决策",
    };
  case "no_publishable_subjects":
  case "active_fixture_missing":
  case "tombstone_fixture_missing":
    return {
      alias,
      category: "fixture-prerequisite",
      owner: "fixture_owner",
      actionList: [
        "在已授权测试窗口准备受控 active/tombstone subject fixture",
        "只读重跑 mapping readiness 和 observability summary，不把空 subject 写成业务成功",
      ],
      minimumUnblockCondition: "受控 active/tombstone subject fixture 满足私有阈值，且 latest publish audit counts 达标",
      ownerBoundary: "fixture owner 准备受控 fixture；Admin helper 不写真实 fixture 或 DB",
    };
  case "api_diagnostics_missing":
  case "api_diagnostics_blocked":
  case "api_diagnostics_stale":
  case "api_diagnostics_not_ready":
    return {
      alias,
      category: "controlled-smoke-evidence",
      owner: "api_diagnostics_owner",
      actionList: [
        "由 API diagnostics owner 提供只读脱敏 diagnostics readiness/release runbook evidence",
        "Admin 不查询 API/Insight/Gateway 私有库或原始响应补算 diagnostics",
      ],
      minimumUnblockCondition: "API diagnostics evidence 已检查且无 blocked/failed/stale/rejected/unknown alias",
      ownerBoundary: "API diagnostics owner 提供脱敏证据；Admin 只消费 alias/status/owner/minimum unblock condition",
    };
  case "controlled_smoke_preflight_missing":
  case "controlled_smoke_preflight_evidence_not_checked":
  case "controlled_smoke_release_runbook_missing":
  case "controlled_smoke_release_runbook_prerequisite_missing":
  case "controlled_smoke_evidence_not_checked":
  case "admin_release_decision_missing":
  case "missing-admin-preflight":
  case "missing-admin-preflight-evidence":
    return {
      alias,
      category: "controlled-smoke-evidence",
      owner: "admin_operator",
      actionList: [
        "补齐只读脱敏 Admin release decision、controlled smoke preflight 和 release runbook evidence",
        "只在 release decision/preflight/runbook 均 ready 后进入 evidence review",
      ],
      minimumUnblockCondition: "release decision、controlled smoke preflight、release runbook 均为 ready 且无 red-line signal",
      ownerBoundary: "Admin operator 收集脱敏 evidence；不得记录 controlled smoke 已通过或生产就绪",
    };
  case "sanitization_failed":
    return {
      alias,
      category: "redaction-required",
      owner: "admin_operator",
      actionList: [
        "删除敏感字段、完整响应体、真实账号、私有 URL 或完整组织标识后重跑",
        "只保留脱敏 alias、status、decision、owner 和 minimum unblock condition",
      ],
      minimumUnblockCondition: "输入不含 token、Cookie、私有 URL、真实账号、手机号、邮箱、完整 organizationId、完整组织树或完整响应体",
      ownerBoundary: "Admin operator 负责脱敏；不得回显敏感值",
    };
  case "real_environment_write_signal":
    return {
      alias,
      category: "red-line-blocked",
      owner: "admin_operator",
      actionList: [
        "移除真实 publish、gateway ingestion、authorization facts、fixture/DB 写入或 read model rebuild 信号",
        "重新收集只读脱敏 evidence，禁止触发真实环境写入",
      ],
      minimumUnblockCondition: "所有真实环境写入、publish、ingestion、authorization facts、fixture/DB 信号清除",
      ownerBoundary: "触及真实写入必须停止并请求授权；本 helper 只做只读 handoff",
    };
  case "full_success_overclaim":
    return {
      alias,
      category: "overclaim-full-success",
      owner: "admin_operator",
      actionList: [
        "删除 full-success、生产就绪、API/Gateway/Insight 成功或 controlled smoke 已通过断言",
        "只把本结果作为 Admin remediation handoff，不作为下游成功证明",
      ],
      minimumUnblockCondition: "输出不再包含 full-success、API/Gateway/Insight 成功、生产就绪或 controlled smoke 已通过断言",
      ownerBoundary: "Admin evidence 不能证明下游授权事实或 full-success",
    };
  default:
    return {
      alias,
      category: "unknown-admin-remediation",
      owner: "admin_operator",
      actionList: [
        "回到 Admin projection readiness、release decision 或 controlled smoke runbook 收集稳定 alias",
        "在 owner 明确前不要外派为 API/Gateway/Insight 成功或 full-success",
      ],
      minimumUnblockCondition: "未知 blocker 被替换为稳定 Admin-owned alias，且对应 owner handoff 已明确",
      ownerBoundary: "未知 alias 留在 Admin operator 边界，不推断 API/Insight/Gateway authorization facts",
    };
  }
}

function statusFor(remediations) {
  if (remediations.length === 0) {
    return "ready-for-operator-handoff";
  }
  const categories = new Set(remediations.map((item) => item.category));
  if (categories.has("redaction-required")) {
    return "redaction-required";
  }
  if (categories.has("red-line-blocked")) {
    return "red-line-blocked";
  }
  if (categories.has("overclaim-full-success")) {
    return "overclaim-full-success";
  }
  return "blocked";
}

function doNotDispatchUntil(status, remediations) {
  if (status === "ready-for-operator-handoff") {
    return "只可交接 Admin operator remediation/handoff；不得外派为 API/Gateway/Insight 成功、生产就绪、authorization facts 或 full-success";
  }
  const aliases = remediations.map((item) => item.alias).join("|") || status;
  return `不要外派为 full-success；等待 ${aliases} 的最小解除条件清除，且不得触发 publish、refresh、gateway ingestion、authorization facts 或真实 fixture/DB 写入`;
}

function buildResult(input, options, remediations) {
  const status = statusFor(remediations);
  return {
    status,
    release: status === "ready-for-operator-handoff" ? "release_after_report" : "hold",
    reason: status === "ready-for-operator-handoff" ? "operator_remediation_handoff_ready" : "operator_remediation_blockers_present",
    sourceAlias: options.sourceAlias || "gateway_projection_operator_remediation_handoff",
    generatedAt: generatedAt(options),
    counts: safeCounts(input),
    remediations,
    ownerHandoffs: remediations.map((item) => ({
      alias: item.alias,
      owner: item.owner,
      nextAction: item.actionList[0],
      minimumUnblockCondition: item.minimumUnblockCondition,
    })),
    minimumUnblockConditions: remediations.map((item) => ({
      alias: item.alias,
      owner: item.owner,
      condition: item.minimumUnblockCondition,
    })),
    boundaries: BOUNDARIES,
    doNotDispatchUntil: doNotDispatchUntil(status, remediations),
  };
}

// 该 wrapper 只包装脱敏 evidence alias，输出 owner-scoped remediation；不回显原始 evidence payload。
function createGatewayProjectionOperatorRemediationHandoff(input: LooseRecord = {}, options: LooseRecord = {}) {
  if (containsSensitiveEvidence(input)) {
    return buildResult(input, options, [remediationForAlias("sanitization_failed")]);
  }

  const overclaimFlags = unique(collectTextFlags(input, fullSuccessFlagsFromText));
  if (overclaimFlags.length > 0) {
    return buildResult(input, options, overclaimFlags.map(remediationForAlias));
  }

  const redLineFlags = unique(collectTextFlags(input, redLineFlagsFromText));
  if (redLineFlags.length > 0) {
    return buildResult(input, options, redLineFlags.map(remediationForAlias));
  }

  const aliases = collectInputAliases(input);
  const remediations = unique(aliases).map(remediationForAlias);
  return buildResult(input, options, remediations);
}

module.exports = {
  createGatewayProjectionOperatorRemediationHandoff,
};
