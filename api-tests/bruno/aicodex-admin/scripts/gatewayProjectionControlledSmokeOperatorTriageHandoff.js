"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const READY_RELEASE_SUMMARY_STATUS = "ready-for-release-summary-handoff";
const READY_RESULT_EVIDENCE_STATUS = "ready-for-result-evidence-handoff";
const READY_TRIAGE_STATUS = "ready-for-operator-triage-handoff";
const KNOWN_RELEASE_SUMMARY_ALIASES = new Set([
    "controlled_smoke_release_summary_ready",
    "controlled_smoke_release_summary_ready_with_observations",
    "controlled_smoke_release_summary_blocked",
    "controlled_smoke_release_summary_needs_user_action",
    "controlled_smoke_release_summary_hard_red_line",
    "controlled_smoke_release_summary_handoff",
]);
const KNOWN_RESULT_ALIASES = new Set([
    "controlled_smoke_result_ready_for_handoff",
    "controlled_smoke_result_passed",
    "controlled_smoke_result_passed_with_observations",
    "controlled_smoke_result_failed",
    "controlled_smoke_result_partial",
    "controlled_smoke_result_missing",
    "controlled_smoke_result_blocked",
    "controlled_smoke_result_evidence_handoff",
]);
const KNOWN_BLOCKER_ALIASES = new Set([
    "none",
    "controlled_smoke_release_summary_handoff",
    "controlled_smoke_release_summary_missing",
    "controlled_smoke_release_summary_count_alias_mismatch",
    "controlled_smoke_release_summary_needs_user_action",
    "controlled_smoke_release_summary_not_handoff_ready",
    "collect_operator_release_summary_action",
    "collect_sanitized_controlled_smoke_release_summary",
    "reconcile_sanitized_release_summary_counts_and_aliases",
    "controlled_smoke_result_evidence_handoff",
    "controlled_smoke_result_evidence_missing",
    "collect_sanitized_controlled_smoke_result_evidence",
    "remove_cross_owner_success_claim",
    "sanitization_failed",
    "full_success_overclaim",
    "real_execution_signal",
]);
const SENSITIVE_FIELD_NAME_PARTS = [
    "account",
    "authorization",
    "config",
    "cookie",
    "credential",
    "diagnosticsresponse",
    "email",
    "endpoint",
    "fullorganization",
    "organizationid",
    "password",
    "phone",
    "raw",
    "responsebody",
    "secret",
    "tenant",
    "token",
];
const CANNOT_INFER_BOUNDARIES = [
    "Admin controlled smoke operator triage handoff 只证明本地脱敏 triage package 可交接",
    "该 handoff 不能外推为真实 publish、Gateway ingestion、API/Gateway/Insight 成功、authorization facts 生效或 production readiness",
    "该 handoff 不是 controlled smoke pass，也不能写成 full-success",
    "不得触发真实 endpoint、publish、真实 controlled smoke、Gateway ingestion、fixture/DB 写入、mapping confirm、gate、authorization facts 或密钥变更",
];
function unique(values = []) {
    return [...new Set(values.filter(Boolean))];
}
function toArray(value) {
    if (Array.isArray(value)) {
        return value.filter(Boolean);
    }
    return value ? [value] : [];
}
function lowerCompact(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
function includesSensitiveFieldName(key) {
    const compact = lowerCompact(key);
    return SENSITIVE_FIELD_NAME_PARTS.some((part) => compact.includes(part));
}
function containsSensitiveValue(value) {
    if (typeof value !== "string") {
        return false;
    }
    return /bearer\s+\S+/i.test(value) ||
        /authorization:\s*\S+/i.test(value) ||
        /cookie:\s*\S+/i.test(value) ||
        /secret:\/\//i.test(value) ||
        /https?:\/\/(?:localhost|127\.0\.0\.1|10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.|[^/\s]+\.internal|[^\s]+)/i.test(value) ||
        /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value) ||
        /\b(?:\+?\d[\d -]{7,}\d)\b/.test(value);
}
// 敏感扫描只返回布尔值，避免把原始字段名或字段值带入 triage 输出。
function hasSensitiveEvidence(value) {
    if (!value || typeof value !== "object") {
        return containsSensitiveValue(value);
    }
    if (Array.isArray(value)) {
        return value.some(hasSensitiveEvidence);
    }
    return Object.entries(value).some(([key, nested]) => (includesSensitiveFieldName(key) || hasSensitiveEvidence(nested)));
}
function collectText(value, output = [], key = "") {
    const compactKey = lowerCompact(key);
    if (["cannotinferboundaries", "donotdispatchuntil", "minimumunblockcondition", "minimumunblockconditions", "ownerhandofflimits", "nextsteps", "operatoractions"].includes(compactKey)) {
        return output;
    }
    if (typeof value === "string") {
        output.push(value);
        return output;
    }
    if (!value || typeof value !== "object") {
        return output;
    }
    if (Array.isArray(value)) {
        value.forEach((item) => collectText(item, output, key));
        return output;
    }
    Object.entries(value).forEach(([nestedKey, item]) => collectText(item, output, nestedKey));
    return output;
}
function hasNegatedBoundary(text, phrase) {
    const index = text.indexOf(phrase);
    if (index < 0) {
        return false;
    }
    const prefix = text.slice(Math.max(0, index - 32), index);
    return /(不是|不能|不得|不可|不要|不声明|未证明|not|cannot|can't|no)(?:\s|\S){0,10}$/i.test(prefix);
}
function collectOverclaimFlags(input = {}) {
    const text = collectText({
        operatorNote: input.operatorNote,
        claim: input.claim,
    }).join("\n").toLowerCase();
    const flags = [];
    const checks = [
        ["full-success", "full_success_overclaim"],
        ["full success", "full_success_overclaim"],
        ["production readiness", "production_readiness_overclaim"],
        ["gateway allow", "gateway_success_overclaim"],
        ["api authorization report", "api_success_overclaim"],
        ["insight success", "insight_success_overclaim"],
        ["gateway ingestion success", "gateway_ingestion_overclaim"],
        ["authorization facts success", "authorization_facts_overclaim"],
        ["controlled smoke pass", "controlled_smoke_pass_overclaim"],
        ["controlled smoke success", "controlled_smoke_pass_overclaim"],
    ];
    checks.forEach(([phrase, flag]) => {
        if (text.includes(phrase) && !hasNegatedBoundary(text, phrase)) {
            flags.push(flag);
        }
    });
    return unique(flags);
}
// 真实执行信号是 triage 硬红线；该 helper 只能处理本地脱敏摘要。
function collectRealSignalFlags(input = {}) {
    const text = collectText({
        operatorNote: input.operatorNote,
        claim: input.claim,
    }).join("\n").toLowerCase();
    const flags = [];
    const checks = [
        [/real\s+publish|真实\s*publish/i, "real_publish_signal"],
        [/real\s+controlled\s+smoke|真实\s*controlled\s*smoke|真实\s*受控\s*smoke/i, "real_controlled_smoke_signal"],
        [/gateway\s+ingestion|真实\s*ingestion/i, "gateway_ingestion_signal"],
        [/authorization\s+facts|授权事实/i, "authorization_facts_signal"],
        [/real\s+fixture|真实\s*fixture/i, "real_fixture_signal"],
        [/\bdb\s+(write|cleanup|delete|update)|database\s+(write|cleanup|delete|update)|真实\s*(db|数据库)/i, "real_db_write_signal"],
        [/production-like|production\s+endpoint|真实\s*endpoint|provider\s+token/i, "production_like_signal"],
        [/real\s+gate|真实\s*gate|mapping\s+confirm|read\s+model\s+rebuild/i, "real_environment_write_signal"],
    ];
    checks.forEach(([pattern, flag]) => {
        const match = text.match(pattern);
        if (match && !hasNegatedBoundary(text, match[0].toLowerCase())) {
            flags.push(flag);
        }
    });
    return unique(flags);
}
function ownerLimit(alias, nextAction, minimumUnblockCondition, owner = "admin_operator") {
    return {
        alias,
        owner,
        nextAction,
        minimumUnblockCondition,
    };
}
function minimumConditions(ownerHandoffLimits = []) {
    return ownerHandoffLimits.map((item) => ({
        alias: item.alias,
        owner: item.owner,
        condition: item.minimumUnblockCondition,
    })).filter((item) => item.alias || item.owner || item.condition);
}
function releaseFor(status) {
    return status === READY_TRIAGE_STATUS ? "release_after_report" : "hold";
}
function triagePackageMetadata(options = {}) {
    return {
        sourceAlias: options.sourceAlias || "local-controlled-smoke-operator-triage-handoff",
        generatedAt: options.generatedAt || new Date().toISOString(),
        packageShape: "admin-gateway-projection-controlled-smoke-operator-triage-handoff/v1",
    };
}
function defaultOwnerLimits(status, alias = "controlled_smoke_operator_triage_handoff") {
    if (status === READY_TRIAGE_STATUS) {
        return [ownerLimit(alias, "复制脱敏 triage package 给 operator 复核", "release summary handoff 与 result evidence handoff 均为 ready，且无 red-line signal")];
    }
    return [ownerLimit(alias, "清除 stable blocker 后重跑 operator triage handoff", "稳定 blocker/remediation alias 已清除，且输入仍为本地脱敏摘要")];
}
function nextStepsFor(status) {
    if (status === READY_TRIAGE_STATUS) {
        return [
            "复制脱敏 triage package 给 operator 复核",
            "只传播 status、stable alias、owner、最小解除条件、下一步和不能外推边界",
            "继续声明未证明 controlled smoke pass、full-success、production readiness、Gateway ingestion 或 authorization facts",
        ];
    }
    if (status === "needs-user-action") {
        return [
            "补齐用户动作或 approval alias 后重跑 release summary handoff",
            "用户动作未清除前不得把 triage package 标记为 ready",
        ];
    }
    if (status === "hard-red-line") {
        return [
            "删除真实 publish、真实 controlled smoke、Gateway ingestion、authorization facts、fixture/DB 或 full-success 外推信号",
            "仅保留本地脱敏 alias、计数、owner 和最小解除条件后重跑 triage handoff",
        ];
    }
    return [
        "清除 stable blocker/remediation alias 后重跑 operator triage handoff",
        "只收集本地脱敏 release summary/result evidence，不补充真实 endpoint、token、fixture、DB 或完整响应体",
    ];
}
function doNotDispatchUntil(status, extra = {}) {
    if (status === READY_TRIAGE_STATUS) {
        return "只可交接本地脱敏 operator triage package；不要外派为 controlled smoke pass、full-success、生产就绪、真实 publish、Gateway ingestion、authorization facts 或 API/Gateway/Insight 成功";
    }
    const blockers = unique([
        extra.blockerAlias,
        extra.remediationAlias,
        ...(extra.redLineFlags || []),
        ...(extra.missingPrerequisites || []),
    ]);
    return `不要外派为 full-success；等待 ${blockers.join("|") || status} 清除，并替换未知项为稳定 Admin owner handoff alias`;
}
function baseResult(status, input = {}, options = {}, overrides = {}) {
    const ownerHandoffLimits = overrides.ownerHandoffLimits || defaultOwnerLimits(status, overrides.blockerAlias);
    return {
        status,
        release: releaseFor(status),
        blockerAlias: overrides.blockerAlias || (status === READY_TRIAGE_STATUS ? "none" : "controlled_smoke_operator_triage_blocked"),
        remediationAlias: overrides.remediationAlias || (status === READY_TRIAGE_STATUS ? "operator_triage_package_ready" : "collect_sanitized_operator_triage_inputs"),
        releaseSummaryAliases: unique(toArray(input.releaseSummaryHandoffSummary?.releaseSummaryAliases)),
        resultAliases: unique(toArray(input.resultEvidenceHandoffSummary?.resultAliases)),
        releaseSummaryCounts: input.releaseSummaryHandoffSummary?.releaseSummaryCounts && typeof input.releaseSummaryHandoffSummary.releaseSummaryCounts === "object"
            ? { ...input.releaseSummaryHandoffSummary.releaseSummaryCounts }
            : {},
        resultCounts: input.resultEvidenceHandoffSummary?.resultCounts && typeof input.resultEvidenceHandoffSummary.resultCounts === "object"
            ? { ...input.resultEvidenceHandoffSummary.resultCounts }
            : {},
        redactionCategory: input.releaseSummaryHandoffSummary?.redactionCategory || input.resultEvidenceHandoffSummary?.redactionCategory || "unknown",
        riskCategory: input.releaseSummaryHandoffSummary?.riskCategory || input.resultEvidenceHandoffSummary?.riskCategory || "unknown",
        nextSteps: unique(overrides.nextSteps || nextStepsFor(status)),
        ownerHandoffLimits,
        minimumUnblockConditions: minimumConditions(ownerHandoffLimits),
        redLineFlags: unique(overrides.redLineFlags),
        missingPrerequisites: unique(overrides.missingPrerequisites),
        cannotInferBoundaries: CANNOT_INFER_BOUNDARIES,
        triagePackageMetadata: triagePackageMetadata(options),
        doNotDispatchUntil: overrides.doNotDispatchUntil || doNotDispatchUntil(status, overrides),
    };
}
function statusFromReleaseSummary(summary = {}) {
    if (summary.status === "needs-user-action" || summary.classification === "needs-user-action") {
        return "needs-user-action";
    }
    if (summary.status === "hard-red-line" || summary.classification === "hard-red-line") {
        return "hard-red-line";
    }
    if (summary.status !== READY_RELEASE_SUMMARY_STATUS) {
        return "blocked";
    }
    return READY_TRIAGE_STATUS;
}
function ownerLimitsFromSummary(summary = {}, fallbackStatus = "blocked") {
    const limits = Array.isArray(summary.ownerHandoffLimits) ? summary.ownerHandoffLimits : [];
    if (limits.length > 0) {
        return limits.map((item) => ownerLimit(item.alias || summary.blockerAlias || "controlled_smoke_operator_triage_blocked", item.nextAction || nextStepsFor(fallbackStatus)[0], item.minimumUnblockCondition || "稳定 owner-scoped alias 已清除且无 red-line signal", item.owner || "admin_operator"));
    }
    return defaultOwnerLimits(fallbackStatus, summary.blockerAlias || "controlled_smoke_operator_triage_blocked");
}
function unknownAlias(input = {}) {
    const releaseAliases = toArray(input.releaseSummaryHandoffSummary?.releaseSummaryAliases);
    const resultAliases = toArray(input.resultEvidenceHandoffSummary?.resultAliases);
    const blockers = [
        input.releaseSummaryHandoffSummary?.blockerAlias,
        input.releaseSummaryHandoffSummary?.remediationAlias,
        input.resultEvidenceHandoffSummary?.blockerAlias,
        input.resultEvidenceHandoffSummary?.remediationAlias,
    ].filter((alias) => alias && alias !== "null");
    return releaseAliases.find((alias) => !KNOWN_RELEASE_SUMMARY_ALIASES.has(alias)) ||
        resultAliases.find((alias) => !KNOWN_RESULT_ALIASES.has(alias)) ||
        blockers.find((alias) => !KNOWN_BLOCKER_ALIASES.has(alias));
}
function missingPrerequisites(input = {}) {
    const missing = [];
    if (!input.releaseSummaryHandoffSummary) {
        missing.push("releaseSummaryHandoffSummary");
    }
    if (!input.resultEvidenceHandoffSummary) {
        missing.push("resultEvidenceHandoffSummary");
    }
    if (input.resultEvidenceHandoffSummary && input.resultEvidenceHandoffSummary.status !== READY_RESULT_EVIDENCE_STATUS) {
        missing.push("resultEvidenceHandoffSummary:not_ready");
    }
    return missing;
}
/**
 * 基于本地脱敏 release summary/result evidence 生成 operator triage package。
 * 该 helper 不读取真实环境、不发网络请求、不回显敏感输入，只输出稳定 alias、owner 和下一步。
 */
function createGatewayProjectionControlledSmokeOperatorTriageHandoff(input = {}, options = {}) {
    const realSignalFlags = collectRealSignalFlags(input);
    if (realSignalFlags.length > 0) {
        return baseResult("hard-red-line", input, options, {
            blockerAlias: "real_execution_signal",
            remediationAlias: "remove_real_operator_triage_signal",
            redLineFlags: realSignalFlags,
        });
    }
    const overclaimFlags = collectOverclaimFlags(input);
    if (overclaimFlags.length > 0) {
        return baseResult("hard-red-line", input, options, {
            blockerAlias: "full_success_overclaim",
            remediationAlias: "remove_cross_owner_success_claim",
            redLineFlags: overclaimFlags,
        });
    }
    if (hasSensitiveEvidence(input)) {
        return baseResult("blocked", {}, options, {
            blockerAlias: "sanitization_failed",
            remediationAlias: "remove_sensitive_operator_triage_evidence",
            nextSteps: [
                "移除 token、Cookie、私有 endpoint、真实账号、邮箱、手机号、完整组织树、完整响应体或 credential-like 字段",
                "用稳定 alias、计数摘要和 owner handoff limit 替代原始 evidence 后重跑",
            ],
            ownerHandoffLimits: [
                ownerLimit("sanitization_failed", "替换疑似敏感 operator triage evidence", "triage package 只保留脱敏 alias、状态、计数、owner 和最小解除条件"),
            ],
        });
    }
    const missing = missingPrerequisites(input);
    if (missing.length > 0) {
        return baseResult("blocked", input, options, {
            blockerAlias: "controlled_smoke_operator_triage_missing",
            remediationAlias: "collect_sanitized_operator_triage_inputs",
            missingPrerequisites: missing,
        });
    }
    const unknown = unknownAlias(input);
    if (unknown) {
        return baseResult("blocked", input, options, {
            blockerAlias: "unknown_controlled_smoke_operator_triage_alias",
            remediationAlias: unknown,
            ownerHandoffLimits: [
                ownerLimit("unknown_controlled_smoke_operator_triage_alias", "替换未知 operator triage alias", "unknown alias 已替换为 spec/test 中定义的稳定 Admin owner handoff alias"),
            ],
        });
    }
    const releaseSummary = input.releaseSummaryHandoffSummary || {};
    const status = statusFromReleaseSummary(releaseSummary);
    if (status !== READY_TRIAGE_STATUS) {
        return baseResult(status, input, options, {
            blockerAlias: releaseSummary.blockerAlias || `controlled_smoke_operator_triage_${status}`,
            remediationAlias: releaseSummary.remediationAlias || "collect_sanitized_operator_triage_inputs",
            ownerHandoffLimits: ownerLimitsFromSummary(releaseSummary, status),
            redLineFlags: releaseSummary.redLineFlags || [],
            nextSteps: nextStepsFor(status),
        });
    }
    return baseResult(READY_TRIAGE_STATUS, input, options);
}
module.exports = {
    createGatewayProjectionControlledSmokeOperatorTriageHandoff,
};
