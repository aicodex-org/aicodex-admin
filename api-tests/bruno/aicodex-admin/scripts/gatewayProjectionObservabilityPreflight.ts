const DEPLOY_STALE_ALIAS = "environment_deploy_stale";
const NO_PUBLISHABLE_SUBJECTS_ALIAS = "no_publishable_subjects";
const SANITIZATION_FAILED_ALIAS = "sanitization_failed";

const FORBIDDEN_FIELD_NAME_PARTS = [
  "authorization",
  "cookie",
  "token",
  "sourceTenantId",
  "metadata",
  "configRef",
  "secretRef",
];

const FORBIDDEN_VALUE_PATTERNS = [
  /bearer\s+\S+/i,
  /authorization:\s*\S+/i,
  /cookie:\s*\S+/i,
  /secret:\/\//i,
];

function blocked(alias, reason, summary: LooseRecord = {}) {
  return {
    status: "blocked",
    alias,
    reason,
    summary,
  };
}

function ok(summary) {
  return {
    status: "ok",
    alias: null,
    reason: "source_freshness_shape_ready",
    summary,
  };
}

function toNumber(value, defaultValue = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function containsSensitiveField(value) {
  if (Array.isArray(value)) {
    return value.some(containsSensitiveField);
  }
  if (hasObject(value)) {
    return Object.entries(value).some(([key, nested]) => {
      const normalizedKey = key.toLowerCase();
      const hasSensitiveName = FORBIDDEN_FIELD_NAME_PARTS.some((name) => normalizedKey.includes(name.toLowerCase()));
      return hasSensitiveName || containsSensitiveField(nested);
    });
  }
  if (typeof value === "string") {
    return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value));
  }
  return false;
}

function hasObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function sanitizeSummary(data) {
  const latest = data.latestPublish || {};
  const sourceSummary = latest.sourceConnectionSummary || {};
  return {
    publisher: {
      enabled: data.publisher.enabled,
      configured: data.publisher.configured,
      freshnessTtlSeconds: data.publisher.freshnessTtlSeconds,
    },
    refresh: {
      enabled: data.refresh.enabled,
      intervalLessThanTtl: data.refresh.intervalLessThanTtl,
    },
    latestPublish: {
      hasAudit: Boolean(latest.projectionBatchId),
      subjectCount: latest.subjectCount,
      tombstoneSubjectCount: latest.tombstoneSubjectCount,
      sourceConnectionStatus: latest.sourceConnectionStatus,
    },
    sourceConnectionSummary: {
      total: sourceSummary.total,
      statusCounts: sourceSummary.statusCounts,
      freshnessCounts: sourceSummary.freshnessCounts,
      hasStaleFreshness: sourceSummary.hasStaleFreshness,
      hasUnavailableFreshness: sourceSummary.hasUnavailableFreshness,
      hasUnknownFreshness: sourceSummary.hasUnknownFreshness,
    },
  };
}

function validateEnvelope(response) {
  const status = response && response.status;
  const data = response && response.data;
  if (status !== "ok" || !hasObject(data) || !hasObject(data.publisher) || !hasObject(data.refresh)) {
    return blocked(DEPLOY_STALE_ALIAS, "observability_envelope_invalid");
  }
  if (typeof data.publisher.enabled !== "boolean" || typeof data.publisher.configured !== "boolean") {
    return blocked(DEPLOY_STALE_ALIAS, "publisher_diagnostics_missing");
  }
  if (typeof data.publisher.freshnessTtlSeconds !== "number" || data.publisher.freshnessTtlSeconds <= 0) {
    return blocked(DEPLOY_STALE_ALIAS, "freshness_ttl_missing");
  }
  if (typeof data.refresh.enabled !== "boolean" || typeof data.refresh.intervalLessThanTtl !== "boolean") {
    return blocked(DEPLOY_STALE_ALIAS, "refresh_diagnostics_missing");
  }
  if (data.refresh.enabled && !data.refresh.intervalLessThanTtl) {
    return blocked(DEPLOY_STALE_ALIAS, "refresh_interval_not_less_than_ttl");
  }
  return null;
}

function validateLatestPublish(data, options) {
  const latest = data.latestPublish;
  if (options.requireLatestAudit && !latest?.projectionBatchId) {
    return blocked(DEPLOY_STALE_ALIAS, "latest_publish_audit_missing", sanitizeSummary(data));
  }
  if (!latest?.projectionBatchId) {
    return ok(sanitizeSummary(data));
  }
  if (typeof latest.sourceConnectionStatus !== "string") {
    return blocked(DEPLOY_STALE_ALIAS, "source_connection_status_missing", sanitizeSummary(data));
  }
  const sourceSummary = latest.sourceConnectionSummary;
  if (!hasObject(sourceSummary)) {
    return blocked(DEPLOY_STALE_ALIAS, "source_connection_summary_missing", sanitizeSummary(data));
  }
  if (typeof sourceSummary.total !== "number" || !hasObject(sourceSummary.statusCounts) || !hasObject(sourceSummary.freshnessCounts)) {
    return blocked(DEPLOY_STALE_ALIAS, "source_connection_summary_counts_missing", sanitizeSummary(data));
  }
  for (const flag of ["hasStaleFreshness", "hasUnavailableFreshness", "hasUnknownFreshness"]) {
    if (typeof sourceSummary[flag] !== "boolean") {
      return blocked(DEPLOY_STALE_ALIAS, "source_connection_summary_flags_missing", sanitizeSummary(data));
    }
  }
  if (options.minSubjectCount > 0 && (typeof latest.subjectCount !== "number" || latest.subjectCount < options.minSubjectCount)) {
    return blocked(NO_PUBLISHABLE_SUBJECTS_ALIAS, "subject_count_below_minimum", sanitizeSummary(data));
  }
  if (options.minTombstoneSubjectCount > 0 && (typeof latest.tombstoneSubjectCount !== "number" || latest.tombstoneSubjectCount < options.minTombstoneSubjectCount)) {
    return blocked(NO_PUBLISHABLE_SUBJECTS_ALIAS, "tombstone_subject_count_below_minimum", sanitizeSummary(data));
  }
  return ok(sanitizeSummary(data));
}

// 只读 preflight 只返回脱敏 alias/reason/counts，避免将运行态旧 shape 误报为完整成功。
function evaluateGatewayProjectionObservabilityPreflight(response, rawOptions: LooseRecord = {}) {
  if (containsSensitiveField(response)) {
    return blocked(SANITIZATION_FAILED_ALIAS, "sensitive_field_present");
  }
  const envelopeResult = validateEnvelope(response);
  if (envelopeResult) {
    return envelopeResult;
  }
  const options = {
    requireLatestAudit: Boolean(rawOptions.requireLatestAudit),
    minSubjectCount: toNumber(rawOptions.minSubjectCount),
    minTombstoneSubjectCount: toNumber(rawOptions.minTombstoneSubjectCount),
  };
  return validateLatestPublish(response.data, options);
}

module.exports = {
  DEPLOY_STALE_ALIAS,
  NO_PUBLISHABLE_SUBJECTS_ALIAS,
  SANITIZATION_FAILED_ALIAS,
  evaluateGatewayProjectionObservabilityPreflight,
};
