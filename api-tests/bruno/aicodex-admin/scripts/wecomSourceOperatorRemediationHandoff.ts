// @ts-nocheck
const EVIDENCE_SHAPE_VERSION = "wecom-source-operator-remediation-handoff/v1";

const LOCAL_READONLY_SCOPES = new Set([
  "local-readonly-operator-remediation-handoff",
  "local_readonly_operator_remediation_handoff",
  "readonly-local",
  "read-only-local",
]);

const READY_ALIASES = new Set([
  "ready",
  "wecom_source_ready",
  "ready_for_org_tree_readiness",
  "ready-for-wecom-controlled-smoke-preflight",
  "ready-for-controlled-smoke-evidence-handoff",
  "release_after_report",
]);

const EMPTY_BLOCKING_ALIASES = new Set(["", "none", "no_blocker", "not_blocked", "clear"]);
const IGNORED_SUMMARY_ALIASES = new Set(["blocked", "hold", "not_checked"]);
const REDACTED_ALIASES = new Set(["redacted", "sanitized", "safe", "none"]);

const BOUNDARIES = [
  "operator remediation handoff 只代表 Admin WeCom source 失败修复交接状态，不能外推为 controlled smoke 已通过",
  "该 handoff 不证明组织树非空、Gateway/API/Insight 成功、authorization facts 生效、生产就绪或 full-success",
  "不得触发真实 WeCom 同步、写真实 fixture/DB、publish、gateway ingestion、authorization facts 或查询 API/Insight/Gateway store",
  "只复制稳定 alias、owner、nextAction、missingPrerequisites、redLineFlags、minimumUnblockConditions 和不能外推边界",
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
  /non[-\s]?empty organization tree/i,
  /production ready/i,
  /publish success/i,
  /real sync/i,
];

const SAFE_TEXT_KEYS = new Set([
  "boundaries",
  "donotdispatchuntil",
  "donotproceedreasons",
  "minimumunblockcondition",
  "minimumunblockconditions",
  "nextaction",
  "operatornextactions",
  "safenextactions",
]);

const HANDOFFS = {
  "wecom_config_missing": {
    alias: "wecom_config_missing",
    category: "source-readiness",
    owner: "admin_source_owner",
    nextAction: "补齐目标组织的 WeCom organization sync 配置后重跑 Source Readiness Handoff",
    minimumUnblockCondition: "只读配置 summary 返回 isConfigured=true，且配置仅包含脱敏 Corp ID 和 secret 占位",
  },
  "wecom_config_disabled": {
    alias: "wecom_config_disabled",
    category: "source-readiness",
    owner: "admin_source_owner",
    nextAction: "确认是否允许启用 WeCom organization sync source",
    minimumUnblockCondition: "只读配置 summary 返回 config.isEnabled=true",
  },
  "wecom_credential_not_verified": {
    alias: "wecom_credential_not_verified",
    category: "source-readiness",
    owner: "admin_operator",
    nextAction: "只读收集 config/test 脱敏结果或最近成功 run 摘要后重跑 Source Readiness Handoff",
    minimumUnblockCondition: "凭据验证结果为 ok，或最近存在 succeeded run；不得记录真实 secret、token 或原始响应体",
  },
  "wecom_latest_run_failed": {
    alias: "wecom_latest_run_failed",
    category: "source-readiness",
    owner: "admin_source_owner",
    nextAction: "排查最近一次 WeCom sync run 的安全错误分类",
    minimumUnblockCondition: "最近一次 run 不再是 failed/partial/error，且后续 succeeded run 可证明 source snapshot 完成",
  },
  "wecom_no_recent_success": {
    alias: "wecom_no_recent_success",
    category: "source-readiness",
    owner: "admin_operator",
    nextAction: "等待或收集最近 succeeded run 的脱敏摘要",
    minimumUnblockCondition: "配置启用且最近成功 run 落在 freshness 窗口内",
  },
  "wecom_run_active": {
    alias: "wecom_run_active",
    category: "source-readiness",
    owner: "admin_operator",
    nextAction: "等待当前 running run 进入终态后重跑只读 handoff",
    minimumUnblockCondition: "当前没有 active run，且最近终态 run 可用于 readiness 分类",
  },
  "missing-readiness-summary": {
    alias: "missing-readiness-summary",
    category: "missing-prerequisite",
    owner: "admin_operator",
    nextAction: "先运行 30-WeCom 同步/Source Readiness Handoff.yml",
    minimumUnblockCondition: "提供脱敏 source readiness summary，包含 status、aliases 和 evidenceShapeVersion",
  },
  "missing-release-decision-summary": {
    alias: "missing-release-decision-summary",
    category: "missing-prerequisite",
    owner: "admin_operator",
    nextAction: "先运行 30-WeCom 同步/Source Release Decision.yml",
    minimumUnblockCondition: "提供脱敏 release decision summary，包含 decision、reasonAlias 和 evidenceShapeVersion",
  },
  "missing-controlled-smoke-preflight-summary": {
    alias: "missing-controlled-smoke-preflight-summary",
    category: "missing-prerequisite",
    owner: "admin_operator",
    nextAction: "先运行 30-WeCom 同步/Controlled Smoke Preflight.yml",
    minimumUnblockCondition: "提供脱敏 controlled smoke preflight summary，包含 status、reasonAlias 和 evidenceShapeVersion",
  },
  "missing-controlled-smoke-evidence-handoff-summary": {
    alias: "missing-controlled-smoke-evidence-handoff-summary",
    category: "missing-prerequisite",
    owner: "admin_operator",
    nextAction: "先运行 30-WeCom 同步/Controlled Smoke Evidence Handoff.yml",
    minimumUnblockCondition: "提供脱敏 evidence handoff summary，包含 status、reasonAlias、missingPrerequisites 和 hardRedLineFlags",
  },
  "unknown-wecom-source-blocker": {
    alias: "unknown-wecom-source-blocker",
    category: "unknown-admin-remediation",
    owner: "admin_operator",
    nextAction: "回到 WeCom source readiness/release/preflight/evidence helper 收集稳定 alias",
    minimumUnblockCondition: "未知 blocker 被替换为稳定 Admin-owned WeCom source alias",
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

function collectBlockingAliases(input = {}) {
  const aliases = [
    ...aliasesOf(input.readinessSummary),
    ...aliasesOf(input.releaseDecision),
    ...aliasesOf(input.controlledSmokePreflight),
    ...aliasesOf(input.evidenceHandoff),
    ...asArray(input.blockingAliases).map(normalizeAlias),
    ...asArray(input.evidenceHandoff?.missingPrerequisites).map((item) => normalizeAlias(item.alias || item)),
  ];
  return unique(aliases.filter((alias) => alias && !READY_ALIASES.has(alias) && !EMPTY_BLOCKING_ALIASES.has(alias) && !IGNORED_SUMMARY_ALIASES.has(alias)));
}

function missingPrerequisitesFromInput(input = {}) {
  const missing = [];
  if (!input.readinessSummary) {
    missing.push("missing-readiness-summary");
  }
  if (!input.releaseDecision) {
    missing.push("missing-release-decision-summary");
  }
  if (!input.controlledSmokePreflight) {
    missing.push("missing-controlled-smoke-preflight-summary");
  }
  if (!input.evidenceHandoff) {
    missing.push("missing-controlled-smoke-evidence-handoff-summary");
  }
  return missing;
}

function remediationForAlias(alias) {
  return HANDOFFS[alias] || {
    ...HANDOFFS["unknown-wecom-source-blocker"],
    alias,
  };
}

function redLineFlags(input = {}) {
  const flags = [];
  if (containsSensitiveEvidence(input)) {
    flags.push({
      alias: "sensitive-evidence-rejected",
      owner: "admin_operator",
      action: "删除敏感字段、完整响应体、真实账号、私有 URL、手机号、邮箱、完整组织树或 token 后重跑",
    });
  }
  if (containsOverclaim(input)) {
    flags.push({
      alias: "full-success-overclaim",
      owner: "admin_operator",
      action: "删除 Gateway/API/Insight 成功、authorization facts、生产就绪或 full-success 断言后重跑",
    });
  }
  if (input.realEnvironmentWriteSignal === true) {
    flags.push({
      alias: "real-environment-write-signal",
      owner: "admin_operator",
      action: "停止真实环境写入、publish、gateway ingestion、authorization facts 或 fixture/DB 操作",
    });
  }
  if (!LOCAL_READONLY_SCOPES.has(normalizeAlias(input.operatorScope))) {
    flags.push({
      alias: "non-local-readonly-scope",
      owner: "admin_operator",
      action: "将 operator scope 恢复为 local-readonly-operator-remediation-handoff",
    });
  }
  if (!REDACTED_ALIASES.has(normalizeAlias(input.redactionSignal))) {
    flags.push({
      alias: "redaction-required",
      owner: "admin_operator",
      action: "先确认输入只包含脱敏 summary 和稳定 alias，再运行 operator remediation handoff",
    });
  }
  for (const check of asArray(input.evidenceHandoff?.redactionChecks)) {
    if (check?.passed === false) {
      flags.push({
        alias: normalizeAlias(check.alias) || "redaction-required",
        owner: "admin_operator",
        action: "先修复 evidence handoff redaction check，再运行 operator remediation handoff",
      });
    }
  }
  for (const flag of asArray(input.evidenceHandoff?.hardRedLineFlags)) {
    const alias = normalizeAlias(flag.alias || flag);
    if (alias && !READY_ALIASES.has(alias)) {
      flags.push({
        alias,
        owner: flag.owner || "admin_operator",
        action: flag.action || "先清除 evidence handoff hard red-line flag",
      });
    }
  }
  return unique(flags.map((item) => item.alias)).map((alias) => flags.find((item) => item.alias === alias));
}

function buildResult(status, input = {}, options = {}, details = {}) {
  const remediations = details.remediations || [];
  const missingPrerequisites = details.missingPrerequisites || [];
  const redLines = details.redLineFlags || [];
  const ownerHandoffs = [...remediations, ...missingPrerequisites].map((item) => ({
    alias: item.alias,
    owner: item.owner,
    nextAction: item.nextAction,
    minimumUnblockCondition: item.minimumUnblockCondition,
  }));

  return {
    status,
    release: status === "ready" ? "release_after_report" : "hold",
    reasonAlias: details.reasonAlias || status,
    sourceAlias: options.sourceAlias || "wecom_source_operator_remediation_handoff",
    generatedAt: generatedAt(options),
    remediations,
    missingPrerequisites,
    redLineFlags: redLines,
    ownerHandoffs,
    minimumUnblockConditions: [...remediations, ...missingPrerequisites].map((item) => ({
      alias: item.alias,
      owner: item.owner,
      condition: item.minimumUnblockCondition,
    })),
    operatorNextActions: status === "ready" ? [
      "可以交接 Admin WeCom source operator remediation handoff；后续 controlled smoke 或人工执行仍需单独验证",
      "继续只复制脱敏 summary 和稳定 alias，不写成 controlled smoke 已通过或 full-success",
    ] : [
      ...unique(redLines.map((item) => item.action)),
      redLines.length === 0 ? (missingPrerequisites[0]?.nextAction || remediations[0]?.nextAction || "先解除 WeCom source operator remediation blocker") : undefined,
      "不得触发真实 WeCom 同步、真实 DB 查询/写入、fixture、publish、gateway ingestion 或 authorization facts",
    ].filter(Boolean),
    boundaries: BOUNDARIES,
    doNotDispatchUntil: status === "ready"
      ? "只可交接 Admin WeCom source remediation handoff；不得外派为 controlled smoke passed、production ready 或 full-success"
      : "等待 remediation alias、missing prerequisite 或 red-line flag 清除；不得外派为 full-success",
    evidenceShapeVersion: EVIDENCE_SHAPE_VERSION,
  };
}

// 本 wrapper 只消费脱敏 summary/alias 并输出 operator remediation；不回显输入 payload。
function createWecomSourceOperatorRemediationHandoff(input = {}, options = {}) {
  const redLines = redLineFlags(input);
  if (redLines.length > 0) {
    return buildResult("hard-red-line", input, options, {
      reasonAlias: ["sensitive-evidence-rejected", "redaction-required"].includes(redLines[0].alias) ? redLines[0].alias : "hard-red-line",
      redLineFlags: redLines,
    });
  }

  const missingAliases = missingPrerequisitesFromInput(input);
  if (missingAliases.length > 0) {
    const missingPrerequisites = missingAliases.map(remediationForAlias);
    return buildResult("needs-user-action", input, options, {
      reasonAlias: missingAliases[0],
      missingPrerequisites,
    });
  }

  const remediations = collectBlockingAliases(input).map(remediationForAlias);
  if (remediations.length > 0) {
    return buildResult("blocked", input, options, {
      reasonAlias: remediations[0].alias,
      remediations,
      missingPrerequisites: remediations,
    });
  }

  return buildResult("ready", input, options);
}

module.exports = {
  createWecomSourceOperatorRemediationHandoff,
};
