// @ts-nocheck
const assert = require("node:assert/strict");
const test = require("node:test");

let createWecomSourceControlledSmokeResultEvidenceHandoff;
try {
  ({
    createWecomSourceControlledSmokeResultEvidenceHandoff,
  } = require("./wecomSourceControlledSmokeResultEvidenceHandoff"));
} catch {
  createWecomSourceControlledSmokeResultEvidenceHandoff = () => ({
    status: "missing_module",
    release: "hold",
    reasonAlias: "wecomSourceControlledSmokeResultEvidenceHandoff_not_implemented",
    resultAliases: [],
    missingPrerequisites: [],
    ownerHandoffLimits: [],
    operatorActions: [],
    redLineFlags: [],
    cannotInferBoundaries: [],
  });
}

function executionHandoff(overrides = {}) {
  return {
    status: "ready-for-controlled-smoke-execution-handoff",
    release: "release_after_report",
    reasonAlias: "ready-for-controlled-smoke-execution-handoff",
    evidenceShapeVersion: "wecom-source-controlled-smoke-execution-handoff/v1",
    ...overrides,
  };
}

function deploymentSummary(overrides = {}) {
  return {
    status: "deployed",
    aliases: ["wecom_source_controlled_smoke_deployed"],
    evidenceShapeVersion: "wecom-source-controlled-smoke-deployment/v1",
    ...overrides,
  };
}

function authorizationSummary(overrides = {}) {
  return {
    status: "authorized",
    aliases: ["wecom_source_controlled_smoke_authorized"],
    evidenceShapeVersion: "wecom-source-controlled-smoke-authorization/v1",
    ...overrides,
  };
}

function readyInput(overrides = {}) {
  return {
    executionHandoffSummary: executionHandoff(),
    resultStatus: "passed",
    resultAliases: ["wecom_source_controlled_smoke_result_passed"],
    resultCounts: {
      expected: 2,
      observed: 2,
      passed: 2,
      partial: 0,
      failed: 0,
      blocked: 0,
      missing: 0,
      unauthorized: 0,
    },
    deploymentSummary: deploymentSummary(),
    authorizationSummary: authorizationSummary(),
    redactionSignal: "redacted",
    riskCategory: "low",
    operatorScope: "local-readonly-controlled-smoke-result-evidence-handoff",
    resultModeAlias: "controlled-smoke-result-evidence-handoff-only",
    ...overrides,
  };
}

test("returns passed for sanitized source result evidence with bounded handoff output", () => {
  const handoff = createWecomSourceControlledSmokeResultEvidenceHandoff(readyInput(), {
    generatedAt: "2026-06-13T18:00:00.000Z",
    sourceAlias: "local-wecom-result-evidence-test",
  });

  assert.equal(handoff.status, "passed");
  assert.equal(handoff.release, "release_after_report");
  assert.equal(handoff.reasonAlias, "wecom_source_controlled_smoke_result_passed");
  assert.equal(handoff.generatedAt, "2026-06-13T18:00:00.000Z");
  assert.equal(handoff.sourceAlias, "local-wecom-result-evidence-test");
  assert.deepEqual(handoff.resultAliases, ["wecom_source_controlled_smoke_result_passed"]);
  assert.equal(handoff.resultCounts.passed, 2);
  assert.deepEqual(handoff.missingPrerequisites, []);
  assert.equal(handoff.ownerHandoffLimits.some((item) => item.owner === "admin_operator"), true);
  assert.equal(handoff.operatorActions.some((item) => item.includes("交接脱敏 controlled smoke result evidence")), true);
  assert.equal(handoff.cannotInferBoundaries.some((item) => item.includes("full-success")), true);
  assert.equal(handoff.evidenceShapeVersion, "wecom-source-controlled-smoke-result-evidence-handoff/v1");
});

test("returns partial-handoff for partial sanitized evidence without failed or unauthorized counts", () => {
  const handoff = createWecomSourceControlledSmokeResultEvidenceHandoff(readyInput({
    resultStatus: "partial-handoff",
    resultAliases: ["wecom_source_controlled_smoke_result_partial_handoff"],
    resultCounts: {
      expected: 3,
      observed: 2,
      passed: 2,
      partial: 1,
      failed: 0,
      blocked: 0,
      missing: 0,
      unauthorized: 0,
    },
    riskCategory: "medium",
  }));

  assert.equal(handoff.status, "partial-handoff");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.reasonAlias, "wecom_source_controlled_smoke_result_partial_handoff");
  assert.equal(handoff.ownerHandoffLimits.some((item) => item.alias === "partial_result_evidence_handoff"), true);
  assert.equal(handoff.operatorActions.some((item) => item.includes("补齐缺失的本地脱敏 result evidence")), true);
});

test("needs user action when required result evidence summaries are missing", () => {
  const handoff = createWecomSourceControlledSmokeResultEvidenceHandoff({});

  assert.equal(handoff.status, "needs-user-action");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.reasonAlias, "missing_result_evidence_prerequisite");
  assert.equal(handoff.missingPrerequisites.includes("executionHandoffSummary"), true);
  assert.equal(handoff.missingPrerequisites.includes("resultStatus"), true);
  assert.equal(handoff.missingPrerequisites.includes("deploymentSummary"), true);
  assert.equal(handoff.operatorActions.some((item) => item.includes("补齐脱敏 controlled smoke result evidence")), true);
});

test("blocks undeployed or unauthorized result evidence", () => {
  const undeployed = createWecomSourceControlledSmokeResultEvidenceHandoff(readyInput({
    deploymentSummary: deploymentSummary({ status: "not-deployed", aliases: ["not_deployed"] }),
  }));
  const unauthorized = createWecomSourceControlledSmokeResultEvidenceHandoff(readyInput({
    authorizationSummary: authorizationSummary({ status: "unauthorized", aliases: ["unauthorized"] }),
  }));

  assert.equal(undeployed.status, "blocked");
  assert.equal(undeployed.reasonAlias, "controlled_smoke_result_not_deployed");
  assert.equal(unauthorized.status, "blocked");
  assert.equal(unauthorized.reasonAlias, "controlled_smoke_result_unauthorized");
});

test("blocks failed counts, unknown aliases, and count mismatches", () => {
  const failed = createWecomSourceControlledSmokeResultEvidenceHandoff(readyInput({
    resultCounts: {
      expected: 2,
      observed: 2,
      passed: 1,
      partial: 0,
      failed: 1,
      blocked: 0,
      missing: 0,
      unauthorized: 0,
    },
  }));
  const unknownAlias = createWecomSourceControlledSmokeResultEvidenceHandoff(readyInput({
    resultAliases: ["unexpected_result_alias"],
  }));

  assert.equal(failed.status, "blocked");
  assert.equal(failed.reasonAlias, "controlled_smoke_result_count_alias_mismatch");
  assert.equal(unknownAlias.status, "blocked");
  assert.equal(unknownAlias.reasonAlias, "unknown_controlled_smoke_result_alias");
});

test("rejects sensitive result evidence without echoing values", () => {
  const handoff = createWecomSourceControlledSmokeResultEvidenceHandoff(readyInput({
    resultEvidence: {
      token: "redacted-token-like-value",
      privateUrl: "<redacted-url>",
      email: "alice@example.invalid",
      rawResponseBody: { ok: true },
    },
  }));

  const serialized = JSON.stringify(handoff);
  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.reasonAlias, "sanitization_failed");
  assert.equal(serialized.includes("redacted-token-like-value"), false);
  assert.equal(serialized.includes("<redacted-url>"), false);
  assert.equal(serialized.includes("alice@example.invalid"), false);
  assert.equal(serialized.includes("rawResponseBody"), false);
});

test("hard red-lines real execution, fixture, DB, projection, and full-success claims", () => {
  const handoff = createWecomSourceControlledSmokeResultEvidenceHandoff(readyInput({
    operatorNote: "real DB write and real fixture with synthetic audit projection prove Gateway/API/Insight full-success and authorization facts",
  }));

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.reasonAlias, "hard_red_line_signal");
  assert.equal(handoff.redLineFlags.includes("real_db_write_signal"), true);
  assert.equal(handoff.redLineFlags.includes("real_fixture_signal"), true);
  assert.equal(handoff.redLineFlags.includes("synthetic_audit_projection_signal"), true);
  assert.equal(handoff.redLineFlags.includes("full_success_overclaim"), true);
});

test("fails closed when scope or mode is not local handoff-only", () => {
  const handoff = createWecomSourceControlledSmokeResultEvidenceHandoff(readyInput({
    operatorScope: "real-controlled-smoke-result",
    resultModeAlias: "real-result-writer",
  }));

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.reasonAlias, "hard_red_line_signal");
  assert.equal(handoff.redLineFlags.includes("non_local_readonly_scope"), true);
  assert.equal(handoff.redLineFlags.includes("non_handoff_only_mode"), true);
});
