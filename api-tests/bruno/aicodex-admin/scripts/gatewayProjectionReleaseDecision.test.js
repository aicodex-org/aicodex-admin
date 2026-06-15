const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createGatewayProjectionReleaseDecisionHandoff,
  evaluateGatewayProjectionReleaseDecision,
} = require("./gatewayProjectionReleaseDecision");

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
        projectionBatchId: "batch-redacted",
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
      totalSubjectCount: 1,
      counts: {
        active_publishable: 1,
        tombstone_publishable: 0,
        mapping_missing: 0,
        mapping_untrusted: 0,
        lifecycle_not_publishable: 0,
        source_metadata_unavailable: 0,
        lineage_freshness_unavailable: 0,
        ...counts,
      },
    },
  };
}

test("fails closed when evidence contains sensitive fields", () => {
  const decision = evaluateGatewayProjectionReleaseDecision({
    observabilityResponse: observabilityResponse(),
    mappingReadinessResponse: {
      status: "ok",
      data: {
        counts: {active_publishable: 1},
        token: "secret-value",
      },
    },
  });

  assert.equal(decision.decision, "blocked-by-contract-or-config");
  assert.equal(decision.status, "blocked");
  assert.deepEqual(decision.aliases, ["sanitization_failed"]);
  assert.equal(JSON.stringify(decision).includes("secret-value"), false);
});

test("returns not-checked for empty evidence", () => {
  const decision = evaluateGatewayProjectionReleaseDecision();

  assert.equal(decision.decision, "not-checked");
  assert.equal(decision.status, "not_checked");
  assert.equal(decision.handoffs.some(item => item.owner === "admin_operator"), true);
});

test("returns not-checked when mapping readiness is required but missing", () => {
  const decision = evaluateGatewayProjectionReleaseDecision({
    observabilityResponse: observabilityResponse(),
  }, {
    requireMappingReadiness: true,
  });

  assert.equal(decision.decision, "not-checked");
  assert.equal(decision.status, "not_checked");
  assert.equal(decision.aliases.includes("mapping_readiness_not_checked"), true);
});

test("maps source freshness blockers to source freshness decision", () => {
  const decision = evaluateGatewayProjectionReleaseDecision({
    observabilityResponse: observabilityResponse({
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

  assert.equal(decision.decision, "blocked-by-source-freshness");
  assert.equal(decision.status, "blocked");
  assert.equal(decision.handoffs.some(item => item.owner === "admin_source_owner"), true);
});

test("maps mapping blockers to mapping readiness decision", () => {
  const decision = evaluateGatewayProjectionReleaseDecision({
    observabilityResponse: observabilityResponse(),
    mappingReadinessResponse: mappingReadiness({
      active_publishable: 0,
      mapping_missing: 1,
    }),
  });

  assert.equal(decision.decision, "blocked-by-mapping-readiness");
  assert.equal(decision.status, "blocked");
  assert.equal(decision.aliases.includes("mapping_missing"), true);
});

test("maps contract and config blockers to contract decision", () => {
  const decision = evaluateGatewayProjectionReleaseDecision({
    observabilityResponse: observabilityResponse({sourceConnectionSummary: undefined}),
    mappingReadinessResponse: mappingReadiness(),
  });

  assert.equal(decision.decision, "blocked-by-contract-or-config");
  assert.equal(decision.status, "blocked");
  assert.equal(decision.aliases.includes("environment_deploy_stale"), true);
});

test("returns ready-for-controlled-smoke when local evidence is checked and clear", () => {
  const decision = evaluateGatewayProjectionReleaseDecision({
    observabilityResponse: observabilityResponse(),
    mappingReadinessResponse: mappingReadiness(),
  }, {
    requireMappingReadiness: true,
  });

  assert.equal(decision.decision, "ready-for-controlled-smoke");
  assert.equal(decision.status, "ready");
  assert.equal(decision.aliases.length, 0);
});

test("always states local evidence cannot be extrapolated to publish or full success", () => {
  const decision = evaluateGatewayProjectionReleaseDecision({
    observabilityResponse: observabilityResponse(),
    mappingReadinessResponse: mappingReadiness(),
  });

  assert.equal(decision.boundaries.some(item => item.includes("不是真实 publish 成功")), true);
  assert.equal(decision.boundaries.some(item => item.includes("不是完整 projection 业务成功")), true);
});

test("creates releasable handoff only for controlled smoke preparation", () => {
  const handoff = createGatewayProjectionReleaseDecisionHandoff({
    observabilityResponse: observabilityResponse(),
    mappingReadinessResponse: mappingReadiness(),
  }, {
    requireMappingReadiness: true,
    generatedAt: "2026-06-13T10:00:00.000Z",
    sourceAlias: "local-dry-run",
  });

  assert.equal(handoff.status, "ready");
  assert.equal(handoff.release, "release_after_report");
  assert.equal(handoff.localBlockerCategory, "none");
  assert.equal(handoff.decision, "ready-for-controlled-smoke");
  assert.equal(handoff.generatedAt, "2026-06-13T10:00:00.000Z");
  assert.equal(handoff.sourceAlias, "local-dry-run");
  assert.equal(handoff.doNotDispatchUntil.includes("受控 smoke"), true);
  assert.equal(handoff.doNotDispatchUntil.includes("full-success"), true);
  assert.equal(handoff.boundaries.some(item => item.includes("不是真实 publish 成功")), true);
});

test("creates source freshness handoff with Admin source owner condition", () => {
  const handoff = createGatewayProjectionReleaseDecisionHandoff({
    observabilityResponse: observabilityResponse({
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

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.localBlockerCategory, "admin_source_blocked");
  assert.equal(handoff.decision, "blocked-by-source-freshness");
  assert.equal(handoff.ownerHandoffs.some(item => item.owner === "admin_source_owner"), true);
  assert.equal(handoff.minimumUnblockConditions.some(item => item.condition.includes("source freshness")), true);
  assert.equal(handoff.doNotDispatchUntil.includes("source_connection_stale"), true);
});

test("creates mapping handoff without suggesting legacy or display join keys", () => {
  const handoff = createGatewayProjectionReleaseDecisionHandoff({
    observabilityResponse: observabilityResponse(),
    mappingReadinessResponse: mappingReadiness({
      active_publishable: 0,
      mapping_missing: 1,
    }),
  });

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.localBlockerCategory, "admin_mapping_blocked");
  assert.equal(handoff.decision, "blocked-by-mapping-readiness");
  assert.equal(handoff.ownerHandoffs.some(item => item.owner === "admin_mapping_operator"), true);
  assert.equal(JSON.stringify(handoff).includes("display name"), true);
  assert.equal(JSON.stringify(handoff).includes("phone"), true);
  assert.equal(JSON.stringify(handoff).includes("email"), true);
});

test("creates contract/config handoff for sanitization failure without leaking input", () => {
  const handoff = createGatewayProjectionReleaseDecisionHandoff({
    observabilityResponse: observabilityResponse(),
    mappingReadinessResponse: {
      status: "ok",
      data: {
        counts: {active_publishable: 1},
        token: "secret-value",
      },
    },
  });

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.localBlockerCategory, "contract_or_config_blocked");
  assert.equal(handoff.decision, "blocked-by-contract-or-config");
  assert.deepEqual(handoff.aliases, ["sanitization_failed"]);
  assert.equal(JSON.stringify(handoff).includes("secret-value"), false);
});

test("creates contract/config handoff for unknown observability status", () => {
  const handoff = createGatewayProjectionReleaseDecisionHandoff({
    observabilityResponse: {
      status: "unknown",
      data: {},
    },
    mappingReadinessResponse: mappingReadiness(),
  });

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.localBlockerCategory, "contract_or_config_blocked");
  assert.equal(handoff.decision, "blocked-by-contract-or-config");
  assert.equal(handoff.aliases.includes("environment_deploy_stale"), true);
});

test("creates not-checked handoff with read-only next action", () => {
  const handoff = createGatewayProjectionReleaseDecisionHandoff({}, {
    generatedAt: "2026-06-13T10:05:00.000Z",
  });

  assert.equal(handoff.status, "not_checked");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.localBlockerCategory, "local_evidence_not_checked");
  assert.equal(handoff.decision, "not-checked");
  assert.equal(handoff.ownerHandoffs.some(item => item.owner === "admin_operator"), true);
  assert.equal(handoff.doNotDispatchUntil.includes("not checked"), true);
});
