const assert = require("node:assert/strict");
const test = require("node:test");

let createGatewayProjectionControlledSmokeResultEvidenceHandoff;
try {
  ({
    createGatewayProjectionControlledSmokeResultEvidenceHandoff,
  } = require("./gatewayProjectionControlledSmokeResultEvidenceHandoff"));
} catch {
  createGatewayProjectionControlledSmokeResultEvidenceHandoff = () => ({
    status: "missing_module",
    release: "hold",
    blockerAlias: "gatewayProjectionControlledSmokeResultEvidenceHandoff_not_implemented",
    remediationAlias: "helper_not_implemented",
    resultAliases: [],
    operatorActions: [],
    ownerHandoffLimits: [],
    redLineFlags: [],
    missingPrerequisites: [],
    cannotInferBoundaries: [],
  });
}

function executionHandoff(overrides = {}) {
  return {
    status: "ready-for-controlled-smoke-execution",
    release: "release_after_report",
    blockerAlias: null,
    remediationAlias: null,
    ownerHandoffLimits: [{
      alias: "controlled_smoke_execution_ready",
      owner: "admin_operator",
      minimumUnblockCondition: "controlled smoke execution handoff 已完成本地脱敏检查",
    }],
    cannotInferBoundaries: [
      "execution handoff 不能外推为 API/Gateway/Insight 成功、production readiness 或 full-success",
    ],
    ...overrides,
  };
}

function readyInput(overrides = {}) {
  return {
    executionHandoffSummary: executionHandoff(),
    resultStatus: "ready-for-handoff",
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
    operatorNextAction: "交接脱敏 controlled smoke result evidence 给后续操作者复核",
    ...overrides,
  };
}

test("returns ready-for-result-evidence-handoff for sanitized result evidence", () => {
  const handoff = createGatewayProjectionControlledSmokeResultEvidenceHandoff(readyInput(), {
    generatedAt: "2026-06-13T12:00:00.000Z",
    sourceAlias: "local-result-evidence-test",
  });

  assert.equal(handoff.status, "ready-for-result-evidence-handoff");
  assert.equal(handoff.release, "release_after_report");
  assert.equal(handoff.generatedAt, "2026-06-13T12:00:00.000Z");
  assert.equal(handoff.sourceAlias, "local-result-evidence-test");
  assert.deepEqual(handoff.resultAliases, ["controlled_smoke_result_ready_for_handoff"]);
  assert.equal(handoff.resultCounts.passed, 3);
  assert.equal(handoff.redactionCategory, "sanitized");
  assert.equal(handoff.riskCategory, "low");
  assert.equal(handoff.operatorActions.some((item) => item.includes("交接脱敏 controlled smoke result evidence")), true);
  assert.equal(handoff.ownerHandoffLimits.some((item) => item.owner === "admin_operator"), true);
  assert.equal(handoff.cannotInferBoundaries.some((item) => item.includes("controlled smoke pass")), true);
  assert.equal(handoff.doNotDispatchUntil.includes("full-success"), true);
});

test("blocks missing or non-ready execution and result evidence", () => {
  const missing = createGatewayProjectionControlledSmokeResultEvidenceHandoff({});
  assert.equal(missing.status, "blocked");
  assert.equal(missing.release, "hold");
  assert.equal(missing.missingPrerequisites.includes("executionHandoffSummary"), true);
  assert.equal(missing.missingPrerequisites.includes("resultStatus"), true);
  assert.equal(missing.operatorActions.some((item) => item.includes("补齐脱敏 controlled smoke result evidence")), true);

  const failed = createGatewayProjectionControlledSmokeResultEvidenceHandoff(readyInput({
    resultStatus: "failed",
    resultAliases: ["controlled_smoke_result_failed"],
  }));
  assert.equal(failed.status, "blocked");
  assert.equal(failed.blockerAlias, "controlled_smoke_result_not_handoff_ready");
  assert.equal(failed.remediationAlias, "collect_sanitized_controlled_smoke_result_evidence");
});

test("does not echo sensitive values when redaction fails", () => {
  const handoff = createGatewayProjectionControlledSmokeResultEvidenceHandoff(readyInput({
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

test("blocks config or secret references without echoing them", () => {
  const handoff = createGatewayProjectionControlledSmokeResultEvidenceHandoff(readyInput({
    operatorMetadata: {
      configRef: "admin-controlled-smoke-private-config",
    },
  }));

  const serialized = JSON.stringify(handoff);
  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.blockerAlias, "sanitization_failed");
  assert.equal(serialized.includes("admin-controlled-smoke-private-config"), false);
});

test("hard red-lines real publish, fixture and DB signals", () => {
  const handoff = createGatewayProjectionControlledSmokeResultEvidenceHandoff(readyInput({
    operatorNote: "real publish signal with real fixture write and DB cleanup was observed",
  }));

  assert.equal(handoff.status, "hard-red-line");
  assert.equal(handoff.blockerAlias, "real_execution_signal");
  assert.equal(handoff.redLineFlags.includes("real_publish_signal"), true);
  assert.equal(handoff.redLineFlags.includes("real_fixture_signal"), true);
  assert.equal(handoff.redLineFlags.includes("real_db_write_signal"), true);
});

test("blocks count and alias inconsistency", () => {
  const handoff = createGatewayProjectionControlledSmokeResultEvidenceHandoff(readyInput({
    resultAliases: ["controlled_smoke_result_ready_for_handoff"],
    resultCounts: {
      expected: 3,
      observed: 3,
      passed: 2,
      failed: 1,
      partial: 0,
      blocked: 0,
      missing: 0,
      unauthorized: 0,
    },
  }));

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.blockerAlias, "controlled_smoke_result_count_alias_mismatch");
  assert.equal(handoff.remediationAlias, "reconcile_sanitized_result_counts_and_aliases");
  assert.equal(handoff.operatorActions.some((item) => item.includes("重新收集")), true);
});

test("blocks cross-owner success and full-success overclaims", () => {
  const handoff = createGatewayProjectionControlledSmokeResultEvidenceHandoff(readyInput({
    operatorNote: "Gateway allow and API authorization report full-success prove Insight success and production readiness",
  }));

  assert.equal(handoff.status, "hard-red-line");
  assert.equal(handoff.blockerAlias, "full_success_overclaim");
  assert.equal(handoff.redLineFlags.includes("full_success_overclaim"), true);
  assert.equal(handoff.cannotInferBoundaries.some((item) => item.includes("production readiness")), true);
});

test("keeps unknown sanitized aliases blocked and Admin scoped", () => {
  const handoff = createGatewayProjectionControlledSmokeResultEvidenceHandoff(readyInput({
    resultAliases: ["unexpected_result_alias"],
  }));

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.blockerAlias, "unknown_controlled_smoke_result_alias");
  assert.equal(handoff.remediationAlias, "unexpected_result_alias");
  assert.equal(handoff.ownerHandoffLimits.some((item) => item.owner === "admin_operator"), true);
});
