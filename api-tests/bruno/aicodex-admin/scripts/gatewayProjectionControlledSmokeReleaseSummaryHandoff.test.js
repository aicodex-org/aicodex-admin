const assert = require("node:assert/strict");
const test = require("node:test");

let createGatewayProjectionControlledSmokeReleaseSummaryHandoff;
try {
  ({
    createGatewayProjectionControlledSmokeReleaseSummaryHandoff,
  } = require("./gatewayProjectionControlledSmokeReleaseSummaryHandoff"));
} catch {
  createGatewayProjectionControlledSmokeReleaseSummaryHandoff = () => ({
    status: "missing_module",
    release: "hold",
    classification: "blocked",
    blockerAlias: "gatewayProjectionControlledSmokeReleaseSummaryHandoff_not_implemented",
    remediationAlias: "helper_not_implemented",
    releaseSummaryAliases: [],
    releaseSummaryCounts: {},
    operatorActions: [],
    ownerHandoffLimits: [],
    redLineFlags: [],
    missingPrerequisites: [],
    cannotInferBoundaries: [],
  });
}

function resultEvidenceHandoff(overrides = {}) {
  return {
    status: "ready-for-result-evidence-handoff",
    release: "release_after_report",
    resultAliases: ["controlled_smoke_result_ready_for_handoff"],
    resultCounts: {
      expected: 3,
      observed: 3,
      passed: 3,
      failed: 0,
      partial: 0,
      blocked: 0,
      missing: 0,
      unauthorized: 0,
    },
    redactionCategory: "sanitized",
    riskCategory: "low",
    ownerHandoffLimits: [{
      alias: "controlled_smoke_result_evidence_handoff",
      owner: "admin_operator",
      minimumUnblockCondition: "result evidence 已完成本地脱敏检查",
    }],
    cannotInferBoundaries: [
      "result evidence handoff 不能外推为 controlled smoke pass 或 full-success",
    ],
    ...overrides,
  };
}

function readyInput(overrides = {}) {
  return {
    resultEvidenceHandoffSummary: resultEvidenceHandoff(),
    releaseSummaryStatus: "ready-for-handoff",
    releaseSummaryAliases: ["controlled_smoke_release_summary_ready"],
    releaseSummaryCounts: {
      sectionsExpected: 4,
      sectionsObserved: 4,
      blockedItems: 0,
      needsUserActionItems: 0,
      hardRedLineItems: 0,
    },
    redactionCategory: "sanitized",
    riskCategory: "low",
    operatorNextAction: "交接脱敏 release summary 给后续 operator 复核",
    ...overrides,
  };
}

test("returns ready release summary handoff for sanitized result summary", () => {
  const handoff = createGatewayProjectionControlledSmokeReleaseSummaryHandoff(readyInput(), {
    generatedAt: "2026-06-13T15:00:00.000Z",
    sourceAlias: "local-release-summary-test",
  });

  assert.equal(handoff.status, "ready-for-release-summary-handoff");
  assert.equal(handoff.release, "release_after_report");
  assert.equal(handoff.classification, "release-summary");
  assert.equal(handoff.generatedAt, "2026-06-13T15:00:00.000Z");
  assert.equal(handoff.sourceAlias, "local-release-summary-test");
  assert.deepEqual(handoff.releaseSummaryAliases, ["controlled_smoke_release_summary_ready"]);
  assert.equal(handoff.releaseSummaryCounts.sectionsObserved, 4);
  assert.equal(handoff.operatorActions.some((item) => item.includes("交接脱敏 release summary")), true);
  assert.equal(handoff.ownerHandoffLimits.some((item) => item.owner === "admin_operator"), true);
  assert.equal(handoff.cannotInferBoundaries.some((item) => item.includes("controlled smoke pass")), true);
  assert.equal(handoff.doNotDispatchUntil.includes("full-success"), true);
});

test("blocks missing or non-ready result evidence summary", () => {
  const missing = createGatewayProjectionControlledSmokeReleaseSummaryHandoff({});

  assert.equal(missing.status, "blocked");
  assert.equal(missing.release, "hold");
  assert.equal(missing.classification, "blocked");
  assert.equal(missing.blockerAlias, "controlled_smoke_release_summary_missing");
  assert.equal(missing.missingPrerequisites.includes("resultEvidenceHandoffSummary"), true);
  assert.equal(missing.minimumUnblockConditions.some((item) => item.alias === "controlled_smoke_release_summary_missing"), true);

  const blocked = createGatewayProjectionControlledSmokeReleaseSummaryHandoff(readyInput({
    resultEvidenceHandoffSummary: resultEvidenceHandoff({
      status: "blocked",
      blockerAlias: "controlled_smoke_result_count_alias_mismatch",
      remediationAlias: "reconcile_sanitized_result_counts_and_aliases",
      ownerHandoffLimits: [{
        alias: "controlled_smoke_result_count_alias_mismatch",
        owner: "admin_operator",
        minimumUnblockCondition: "resultCounts 与 resultAliases 已重新对齐",
      }],
    }),
  }));

  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.blockerAlias, "controlled_smoke_result_count_alias_mismatch");
  assert.equal(blocked.remediationAlias, "reconcile_sanitized_result_counts_and_aliases");
  assert.equal(blocked.minimumUnblockConditions.some((item) => item.condition.includes("resultCounts")), true);
});

test("classifies explicit user action as needs-user-action with stable owner condition", () => {
  const handoff = createGatewayProjectionControlledSmokeReleaseSummaryHandoff(readyInput({
    releaseSummaryStatus: "needs-user-action",
    releaseSummaryAliases: ["controlled_smoke_release_summary_needs_user_action"],
    releaseSummaryCounts: {
      sectionsExpected: 4,
      sectionsObserved: 3,
      blockedItems: 0,
      needsUserActionItems: 1,
      hardRedLineItems: 0,
    },
    operatorNextAction: "补齐 operator approval alias 后重跑 release summary handoff",
  }));

  assert.equal(handoff.status, "needs-user-action");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.classification, "needs-user-action");
  assert.equal(handoff.blockerAlias, "controlled_smoke_release_summary_needs_user_action");
  assert.equal(handoff.ownerHandoffLimits[0].owner, "admin_operator");
  assert.equal(handoff.minimumUnblockConditions[0].condition.includes("operator"), true);
});

test("hard red-lines real publish, gateway ingestion and DB write signals", () => {
  const handoff = createGatewayProjectionControlledSmokeReleaseSummaryHandoff(readyInput({
    operatorNote: "real publish completed, gateway ingestion succeeded, and DB write cleanup was performed",
  }));

  assert.equal(handoff.status, "hard-red-line");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.classification, "hard-red-line");
  assert.equal(handoff.redLineFlags.includes("real_publish_signal"), true);
  assert.equal(handoff.redLineFlags.includes("gateway_ingestion_signal"), true);
  assert.equal(handoff.redLineFlags.includes("real_db_write_signal"), true);
});

test("does not echo sensitive values when redaction fails", () => {
  const handoff = createGatewayProjectionControlledSmokeReleaseSummaryHandoff(readyInput({
    operatorMetadata: {
      token: "secret-value",
      privateEndpoint: "https://gateway.internal/api",
      email: "alice@example.invalid",
      rawGatewayResponseBody: { accepted: true },
    },
  }));

  const serialized = JSON.stringify(handoff);
  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.blockerAlias, "sanitization_failed");
  assert.equal(serialized.includes("secret-value"), false);
  assert.equal(serialized.includes("gateway.internal"), false);
  assert.equal(serialized.includes("alice@example.invalid"), false);
  assert.equal(serialized.includes("rawGatewayResponseBody"), false);
});

test("blocks cross-owner full-success and controlled smoke pass overclaims", () => {
  const handoff = createGatewayProjectionControlledSmokeReleaseSummaryHandoff(readyInput({
    operatorNote: "Gateway allow, API authorization report full-success and controlled smoke pass prove production readiness",
  }));

  assert.equal(handoff.status, "hard-red-line");
  assert.equal(handoff.blockerAlias, "full_success_overclaim");
  assert.equal(handoff.redLineFlags.includes("full_success_overclaim"), true);
  assert.equal(handoff.cannotInferBoundaries.some((item) => item.includes("production readiness")), true);
});

test("keeps unknown sanitized release aliases blocked and Admin scoped", () => {
  const handoff = createGatewayProjectionControlledSmokeReleaseSummaryHandoff(readyInput({
    releaseSummaryAliases: ["unexpected_release_summary_alias"],
  }));

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.classification, "blocked");
  assert.equal(handoff.blockerAlias, "unknown_controlled_smoke_release_summary_alias");
  assert.equal(handoff.remediationAlias, "unexpected_release_summary_alias");
  assert.equal(handoff.ownerHandoffLimits[0].owner, "admin_operator");
});

test("blocks count and alias inconsistency", () => {
  const handoff = createGatewayProjectionControlledSmokeReleaseSummaryHandoff(readyInput({
    releaseSummaryAliases: ["controlled_smoke_release_summary_ready"],
    releaseSummaryCounts: {
      sectionsExpected: 4,
      sectionsObserved: 4,
      blockedItems: 1,
      needsUserActionItems: 0,
      hardRedLineItems: 0,
    },
  }));

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.blockerAlias, "controlled_smoke_release_summary_count_alias_mismatch");
  assert.equal(handoff.remediationAlias, "reconcile_sanitized_release_summary_counts_and_aliases");
});
