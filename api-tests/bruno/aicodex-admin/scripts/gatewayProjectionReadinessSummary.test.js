const assert = require("node:assert/strict");
const test = require("node:test");

const {
  evaluateGatewayProjectionReadinessSummary,
} = require("./gatewayProjectionReadinessSummary");

function observabilityResponse(latestPublish = {}) {
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
        projectionBatchId: "batch-sensitive",
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

function mappingReadiness(counts = {}) {
  return {
    status: "ok",
    data: {
      totalSubjectCount: 3,
      counts: {
        active_publishable: 1,
        tombstone_publishable: 0,
        mapping_missing: 0,
        mapping_untrusted: 0,
        source_metadata_unavailable: 0,
        lineage_freshness_unavailable: 0,
        ...counts,
      },
      filters: {
        organizationId: "org-real-value-must-not-leak",
      },
      candidates: [{
        adminSubject: "org-real-value-must-not-leak/alice",
        displayName: "Alice",
        email: "alice@example.invalid",
      }],
    },
  };
}

test("blocks stale deployment shape with deploy owner handoff", () => {
  const response = observabilityResponse({sourceConnectionSummary: undefined});

  const summary = evaluateGatewayProjectionReadinessSummary({
    observabilityResponse: response,
    mappingReadinessResponse: mappingReadiness(),
  });

  assert.equal(summary.status, "blocked");
  assert.equal(summary.aliases.includes("environment_deploy_stale"), true);
  assert.equal(summary.handoffs[0].owner, "admin_deploy_owner");
  assert.equal(summary.handoffs[0].minimumUnblockCondition.includes("sourceConnectionSummary"), true);
  assert.equal(JSON.stringify(summary).includes("batch-sensitive"), false);
});

test("blocks mapping_missing separately from deployment readiness", () => {
  const summary = evaluateGatewayProjectionReadinessSummary({
    observabilityResponse: observabilityResponse(),
    mappingReadinessResponse: mappingReadiness({
      active_publishable: 0,
      mapping_missing: 2,
    }),
  });

  assert.equal(summary.status, "blocked");
  assert.equal(summary.aliases.includes("mapping_missing"), true);
  assert.equal(summary.aliases.includes("environment_deploy_stale"), false);
  assert.deepEqual(summary.mappingReadiness.counts.mapping_missing, 2);
  assert.equal(summary.handoffs.some(item => item.owner === "admin_mapping_operator"), true);
  assert.equal(JSON.stringify(summary).includes("alice@example.invalid"), false);
  assert.equal(JSON.stringify(summary).includes("org-real-value-must-not-leak"), false);
});

test("blocks stale source freshness with Admin source owner handoff", () => {
  const summary = evaluateGatewayProjectionReadinessSummary({
    observabilityResponse: observabilityResponse({
      sourceConnectionStatus: "ENABLED",
      sourceConnectionSummary: {
        total: 1,
        statusCounts: {ENABLED: 1},
        freshnessCounts: {STALE: 1},
        hasStaleFreshness: true,
        hasUnavailableFreshness: false,
        hasUnknownFreshness: false,
      },
    }),
    mappingReadinessResponse: mappingReadiness(),
  });

  assert.equal(summary.status, "blocked");
  assert.equal(summary.aliases.includes("source_connection_stale"), true);
  assert.equal(summary.handoffs.some(item => item.owner === "admin_source_owner"), true);
});

test("preserves no_publishable_subjects alias for subject fixture gates", () => {
  const summary = evaluateGatewayProjectionReadinessSummary({
    observabilityResponse: observabilityResponse({subjectCount: 0}),
    mappingReadinessResponse: mappingReadiness({active_publishable: 0}),
  }, {
    minSubjectCount: 1,
  });

  assert.equal(summary.status, "blocked");
  assert.equal(summary.aliases.includes("no_publishable_subjects"), true);
  assert.equal(summary.handoffs.some(item => item.owner === "fixture_owner"), true);
});

test("marks mapping readiness as not_checked when no mapping input is provided", () => {
  const summary = evaluateGatewayProjectionReadinessSummary({
    observabilityResponse: observabilityResponse(),
  });

  assert.equal(summary.status, "partial");
  assert.equal(summary.mappingReadiness.status, "not_checked");
  assert.equal(summary.handoffs.some(item => item.owner === "admin_mapping_operator"), true);
});

test("fails closed when summary inputs contain credential-like fields", () => {
  const summary = evaluateGatewayProjectionReadinessSummary({
    observabilityResponse: observabilityResponse(),
    mappingReadinessResponse: {
      status: "ok",
      data: {
        counts: {active_publishable: 1},
        token: "secret-value",
      },
    },
  });

  assert.equal(summary.status, "blocked");
  assert.deepEqual(summary.aliases, ["sanitization_failed"]);
  assert.equal(summary.handoffs[0].owner, "admin_operator");
});

test("fails closed on source tenant metadata without blocking stable metadata categories", () => {
  const summary = evaluateGatewayProjectionReadinessSummary({
    observabilityResponse: observabilityResponse(),
    mappingReadinessResponse: {
      status: "ok",
      data: {
        counts: {source_metadata_unavailable: 1},
        sourceTenantMetadata: {tenant: "tenant-sensitive"},
      },
    },
  });

  assert.equal(summary.status, "blocked");
  assert.deepEqual(summary.aliases, ["sanitization_failed"]);
});
