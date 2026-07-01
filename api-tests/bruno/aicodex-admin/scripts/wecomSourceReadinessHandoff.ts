// @ts-nocheck
const EVIDENCE_SHAPE_VERSION = "wecom-source-readiness-handoff/v1";
const DEFAULT_RECENT_SUCCESS_WINDOW_HOURS = 72;

const RUNNING_STATUSES = new Set(["running", "started", "pending", "in_progress"]);
const SUCCESS_STATUSES = new Set(["succeeded", "success", "ok"]);
const FAILED_STATUSES = new Set(["failed", "error", "partial"]);

const FORBIDDEN_FIELD_NAME_PARTS = [
  "authorization",
  "cookie",
  "rawresponse",
  "fullresponse",
  "responsebody",
  "organizationtree",
  "mobile",
  "phone",
  "email",
  "privateurl",
  "privateendpoint",
  "sourcetenant",
  "configref",
  "secretref",
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

function normalizeKey(key) {
  return String(key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isMaskedSecret(value) {
  return value === "" || value === undefined || value === null || value === "***" || String(value).toLowerCase() === "masked";
}

function containsSensitiveEvidence(value, key = "") {
  const normalizedKey = normalizeKey(key);
  if (normalizedKey === "credentialverified") {
    return false;
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

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function configPayload(response = {}) {
  return response.data || {};
}

function syncConfig(response = {}) {
  return configPayload(response).config || {};
}

function latestRun(runsResponse = {}) {
  return asArray(runsResponse.data)[0];
}

function latestSuccessfulRun(runsResponse = {}) {
  return asArray(runsResponse.data).find((item) => SUCCESS_STATUSES.has(String(item?.status || "").toLowerCase()));
}

function parseTime(value) {
  if (!value) {
    return undefined;
  }
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? undefined : time;
}

function isRecent(run, options = {}) {
  const finishedAt = parseTime(run?.finishedAt || run?.updatedAt || run?.createdAt);
  if (!finishedAt) {
    return false;
  }
  const now = parseTime(options.now) || new Date();
  const windowHours = Number(options.recentSuccessWindowHours || DEFAULT_RECENT_SUCCESS_WINDOW_HOURS);
  return now.getTime() - finishedAt.getTime() <= windowHours * 60 * 60 * 1000;
}

function credentialVerified(input = {}) {
  const connection = input.connectionTestResponse;
  const connectionData = connection?.data || {};
  if (connection?.status === "ok" && (connectionData.credentialVerified === true || connectionData.missingFields?.length === 0)) {
    return true;
  }
  return Boolean(latestSuccessfulRun(input.runsResponse));
}

function handoffFor(alias) {
  switch (alias) {
  case "wecom_config_missing":
    return {
      alias,
      owner: "admin_source_owner",
      nextAction: "补齐目标组织的 WeCom organization sync 配置",
      condition: "只读配置接口返回 isConfigured=true，且配置包含启用状态、Corp ID 和脱敏 secret 占位",
    };
  case "wecom_config_disabled":
    return {
      alias,
      owner: "admin_source_owner",
      nextAction: "确认是否允许启用 WeCom organization sync source",
      condition: "只读配置接口返回 config.isEnabled=true",
    };
  case "wecom_credential_not_verified":
    return {
      alias,
      owner: "admin_operator",
      nextAction: "只读收集 config/test 脱敏结果或最近成功 run 摘要",
      condition: "凭据验证结果为 ok，或最近存在 succeeded run；不得记录真实 secret、token 或原始响应体",
    };
  case "wecom_latest_run_failed":
    return {
      alias,
      owner: "admin_source_owner",
      nextAction: "排查最近一次 WeCom sync run 的安全错误分类",
      condition: "最近一次 run 不再是 failed/partial/error，且后续 succeeded run 可证明 source snapshot 完成",
    };
  case "wecom_no_recent_success":
    return {
      alias,
      owner: "admin_operator",
      nextAction: "等待或收集最近 succeeded run 的脱敏摘要",
      condition: "配置启用且最近成功 run 落在 freshness 窗口内",
    };
  case "wecom_run_active":
    return {
      alias,
      owner: "admin_operator",
      nextAction: "等待当前 running run 进入终态后重跑只读 handoff",
      condition: "当前没有 active run，且最近终态 run 可用于 readiness 分类",
    };
  case "sanitization_failed":
    return {
      alias,
      owner: "admin_operator",
      nextAction: "删除 token、secret、Cookie、私有 URL、账号、手机号、邮箱、完整组织树或原始响应体后重跑",
      condition: "输入只包含脱敏 status、run/config 摘要和稳定 alias",
    };
  default:
    return {
      alias,
      owner: "admin_operator",
      nextAction: "继续保持只读观察，不触发手动同步或跨 owner 查询",
      condition: "无本地 blocking alias",
    };
  }
}

function statusFor(alias) {
  if (alias === "wecom_source_ready") {
    return "ready";
  }
  if (alias === "wecom_run_active") {
    return "not_ready";
  }
  return "blocked";
}

function safeNextActions(alias) {
  if (alias === "wecom_source_ready") {
    return [
      "可以把该 WeCom source readiness handoff 交给组织树/projection 后续 owner 判断",
      "继续只读验证组织树或 projection 前置条件，不外推为 full-success",
    ];
  }
  return [
    handoffFor(alias).nextAction,
    "不要触发 30-WeCom 同步/手动触发同步.yml，不查询 API/Insight/Gateway 数据，不记录真实凭据或原始响应体",
  ];
}

function buildResult(alias) {
  const aliases = [alias];
  const ownerHandoffs = alias === "wecom_source_ready" ? [] : [handoffFor(alias)];
  return {
    status: statusFor(alias),
    aliases,
    ownerHandoffs: ownerHandoffs.map((handoff) => ({
      alias: handoff.alias,
      owner: handoff.owner,
      nextAction: handoff.nextAction,
    })),
    minimumUnblockConditions: ownerHandoffs.map((handoff) => ({
      alias: handoff.alias,
      owner: handoff.owner,
      condition: handoff.condition,
    })),
    safeNextActions: safeNextActions(alias),
    evidenceShapeVersion: EVIDENCE_SHAPE_VERSION,
  };
}

// 只读生成 operator handoff：输入必须是脱敏 Admin-owned config/runs 摘要，输出不得外推为组织树或 projection 成功。
function createWecomSourceReadinessHandoff(input = {}, options = {}) {
  if (containsSensitiveEvidence(input)) {
    return buildResult("sanitization_failed");
  }

  const payload = configPayload(input.configResponse);
  const config = syncConfig(input.configResponse);
  if (input.configResponse?.status !== "ok" || payload.isConfigured !== true || !config.corpId) {
    return buildResult("wecom_config_missing");
  }
  if (config.isEnabled !== true) {
    return buildResult("wecom_config_disabled");
  }
  if (!credentialVerified(input)) {
    return buildResult("wecom_credential_not_verified");
  }

  const currentRun = latestRun(input.runsResponse);
  const currentStatus = String(currentRun?.status || "").toLowerCase();
  if (RUNNING_STATUSES.has(currentStatus)) {
    return buildResult("wecom_run_active");
  }
  if (FAILED_STATUSES.has(currentStatus)) {
    return buildResult("wecom_latest_run_failed");
  }

  const success = latestSuccessfulRun(input.runsResponse);
  if (!isRecent(success, options)) {
    return buildResult("wecom_no_recent_success");
  }
  return buildResult("wecom_source_ready");
}

module.exports = {
  createWecomSourceReadinessHandoff,
};
