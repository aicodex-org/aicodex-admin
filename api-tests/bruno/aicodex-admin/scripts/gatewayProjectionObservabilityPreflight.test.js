const assert = require("node:assert/strict");
const test = require("node:test");

const {
  evaluateGatewayProjectionObservabilityPreflight,
} = require("./gatewayProjectionObservabilityPreflight");

function baseResponse(latestPublish = {}) {
  return {
    status: "ok",
    data: {
      publisher: {
        enabled: true,
        configured: true,
        freshnessTtlSeconds: 1800,
      },
      refresh: {
        enabled: true,
        intervalLessThanTtl: true,
      },
      latestPublish: {
        projectionBatchId: "batch-test",
        subjectCount: 1,
        tombstoneSubjectCount: 0,
        sourceConnectionStatus: "ENABLED",
        sourceConnectionSummary: {
          total: 1,
          statusCounts: {ENABLED: 1},
          freshnessCounts: {FRESH: 1},
          hasStaleFreshness: false,
          hasUnavailableFreshness: false,
          hasUnknownFreshness: false,
        },
        ...latestPublish,
      },
    },
  };
}

test("blocks old runtime shape without sourceConnectionSummary as environment_deploy_stale", () => {
  const response = baseResponse({sourceConnectionSummary: undefined});

  const result = evaluateGatewayProjectionObservabilityPreflight(response);

  assert.equal(result.status, "blocked");
  assert.equal(result.alias, "environment_deploy_stale");
  assert.equal(result.reason, "source_connection_summary_missing");
});

test("blocks missing latest publish audit when required without triggering writes", () => {
  const response = baseResponse();
  delete response.data.latestPublish;

  const result = evaluateGatewayProjectionObservabilityPreflight(response, {
    requireLatestAudit: true,
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.alias, "environment_deploy_stale");
  assert.equal(result.reason, "latest_publish_audit_missing");
});

test("accepts current source freshness shape and returns sanitized summary", () => {
  const result = evaluateGatewayProjectionObservabilityPreflight(baseResponse());

  assert.equal(result.status, "ok");
  assert.equal(result.alias, null);
  assert.deepEqual(result.summary.sourceConnectionSummary.freshnessCounts, {FRESH: 1});
  assert.equal(JSON.stringify(result).includes("batch-test"), false);
});

test("preserves fixture readiness alias when subject count is below threshold", () => {
  const result = evaluateGatewayProjectionObservabilityPreflight(baseResponse({subjectCount: 0}), {
    minSubjectCount: 1,
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.alias, "no_publishable_subjects");
  assert.equal(result.reason, "subject_count_below_minimum");
});

test("blocks observability responses that contain sensitive fields", () => {
  const response = baseResponse({
    sourceConnectionSummary: {
      total: 1,
      statusCounts: {ENABLED: 1},
      freshnessCounts: {FRESH: 1},
      hasStaleFreshness: false,
      hasUnavailableFreshness: false,
      hasUnknownFreshness: false,
      secretRef: "secret://do-not-print",
    },
  });

  const result = evaluateGatewayProjectionObservabilityPreflight(response);

  assert.equal(result.status, "blocked");
  assert.equal(result.alias, "sanitization_failed");
  assert.equal(result.reason, "sensitive_field_present");
});

test("allows stable diagnostic categories that contain token wording without credentials", () => {
  const response = baseResponse({
    status: "failed",
    errorCategory: "projection_token_missing",
  });

  const result = evaluateGatewayProjectionObservabilityPreflight(response);

  assert.equal(result.status, "ok");
  assert.equal(result.alias, null);
});
