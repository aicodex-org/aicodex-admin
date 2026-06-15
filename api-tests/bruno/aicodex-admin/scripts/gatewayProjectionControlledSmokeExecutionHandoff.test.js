const assert = require("node:assert/strict");
const test = require("node:test");

let createGatewayProjectionControlledSmokeExecutionHandoff;
try {
  ({
    createGatewayProjectionControlledSmokeExecutionHandoff,
  } = require("./gatewayProjectionControlledSmokeExecutionHandoff"));
} catch {
  createGatewayProjectionControlledSmokeExecutionHandoff = () => ({
    status: "missing_module",
    blockerAlias: "gatewayProjectionControlledSmokeExecutionHandoff_not_implemented",
    remediationAlias: "helper_not_implemented",
    missingPrerequisites: [],
    operatorActions: [],
    ownerHandoffLimits: [],
    redLineFlags: [],
    cannotInferBoundaries: [],
    evidencePackageMetadata: {},
  });
}

function preflight(overrides = {}) {
  return {
    status: "ready",
    release: "release_after_report",
    decision: "ready-for-controlled-smoke-prep",
    aliases: ["ready_for_controlled_smoke_prep"],
    ownerHandoffs: [{
      alias: "ready_for_controlled_smoke_prep",
      owner: "admin_operator",
      minimumUnblockCondition: "controlled smoke preflight evidence 已检查且无 blocker",
    }],
    ...overrides,
  };
}

function evidenceReadiness(overrides = {}) {
  return {
    status: "ready-for-controlled-smoke-evidence-review",
    release: "release_after_report",
    reason: "controlled_smoke_evidence_ready_for_review",
    missingPrerequisites: [],
    hardRedLineFlags: [],
    ownerHandoffs: [{
      alias: "controlled_smoke_evidence_ready_for_review",
      owner: "admin_operator",
      minimumUnblockCondition: "evidence readiness 已检查且无 red-line signal",
    }],
    ...overrides,
  };
}

function releaseRunbook(overrides = {}) {
  return {
    status: "ready",
    release: "release_after_report",
    reason: "controlled_smoke_release_runbook_ready",
    missingPrerequisites: [],
    hardRedLineFlags: [],
    ownerHandoffs: [{
      alias: "controlled_smoke_release_runbook_ready",
      owner: "admin_operator",
      minimumUnblockCondition: "release runbook evidence 已检查且无 red-line signal",
    }],
    ...overrides,
  };
}

function operatorRemediation(overrides = {}) {
  return {
    status: "ready-for-operator-handoff",
    release: "release_after_report",
    reason: "operator_remediation_handoff_ready",
    remediations: [],
    ownerHandoffs: [],
    ...overrides,
  };
}

function remediationResult(overrides = {}) {
  return {
    status: "ready-for-controlled-smoke-evidence-review",
    reason: "remediation_result_evidence_ready",
    evidenceAliases: [
      "mapping_remediation_cleared",
      "source_freshness_remediation_cleared",
      "deploy_runtime_shape_confirmed",
      "fixture_authorized",
      "subject_count_ge_1_authorized",
      "controlled_smoke_evidence_prerequisites_clear",
      "api_diagnostics_clear",
    ],
    ownerHandoffs: [],
    minimumUnblockConditions: [],
    ...overrides,
  };
}

function readyInput(overrides = {}) {
  return {
    preflightSummary: preflight(),
    evidenceReadinessSummary: evidenceReadiness(),
    releaseRunbookSummary: releaseRunbook(),
    operatorRemediationHandoffSummary: operatorRemediation(),
    remediationResultEvidenceHandoffSummary: remediationResult(),
    redactionSignal: "sanitized",
    executionScope: "local-readonly-controlled-smoke-execution-handoff",
    ...overrides,
  };
}

function hasOwner(result, owner) {
  return result.ownerHandoffLimits.some((item) => item.owner === owner);
}

test("returns bounded ready execution handoff only for sanitized ready summaries", () => {
  const handoff = createGatewayProjectionControlledSmokeExecutionHandoff(readyInput(), {
    generatedAt: "2026-06-13T14:00:00.000Z",
    sourceAlias: "local-dry-run",
  });

  assert.equal(handoff.status, "ready-for-controlled-smoke-execution");
  assert.equal(handoff.blockerAlias, "none");
  assert.equal(handoff.remediationAlias, "controlled_smoke_execution_prerequisites_clear");
  assert.equal(handoff.missingPrerequisites.length, 0);
  assert.equal(handoff.redLineFlags.length, 0);
  assert.equal(handoff.operatorActions.some((item) => item.includes("controlled smoke execution preparation")), true);
  assert.equal(handoff.ownerHandoffLimits.some((item) => item.boundary.includes("Admin local-only handoff")), true);
  assert.equal(handoff.cannotInferBoundaries.some((item) => item.includes("API/Gateway/Insight 成功")), true);
  assert.equal(handoff.evidencePackageMetadata.sourceAlias, "local-dry-run");
  assert.equal(handoff.evidencePackageMetadata.generatedAt, "2026-06-13T14:00:00.000Z");
  assert.equal(handoff.doNotDispatchUntil.includes("full-success"), true);
});

test("blocks when preflight, evidence readiness or remediation result evidence is missing", () => {
  const handoff = createGatewayProjectionControlledSmokeExecutionHandoff(readyInput({
    preflightSummary: undefined,
    remediationResultEvidenceHandoffSummary: undefined,
  }));

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.blockerAlias, "controlled_smoke_execution_prerequisite_missing");
  assert.equal(handoff.missingPrerequisites.includes("controlled_smoke_preflight_missing"), true);
  assert.equal(handoff.missingPrerequisites.includes("remediation_result_evidence_handoff_missing"), true);
  assert.equal(handoff.operatorActions.some((item) => item.includes("只读脱敏")), true);
});

test("preserves stable blocker and remediation aliases from blocked owner handoffs", () => {
  const handoff = createGatewayProjectionControlledSmokeExecutionHandoff(readyInput({
    operatorRemediationHandoffSummary: operatorRemediation({
      status: "blocked",
      release: "hold",
      reason: "operator_remediation_mapping_required",
      ownerHandoffs: [{
        alias: "mapping_missing",
        owner: "admin_mapping_operator",
        nextAction: "补齐一等 PlatformApiUserMapping.ApiUserId",
        minimumUnblockCondition: "mapping readiness alias cleared",
      }],
    }),
  }));

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.blockerAlias, "mapping_missing");
  assert.equal(handoff.remediationAlias, "operator_remediation_mapping_required");
  assert.equal(hasOwner(handoff, "admin_mapping_operator"), true);
  assert.equal(handoff.ownerHandoffLimits[0].minimumUnblockCondition, "mapping readiness alias cleared");
});

test("hard red-lines real fixture, DB write, production-like and real gate signals", () => {
  const handoff = createGatewayProjectionControlledSmokeExecutionHandoff(readyInput({
    operatorNote: "execute real fixture, write DB rows, open production gate, then run real gateway ingestion",
  }));

  assert.equal(handoff.status, "hard-red-line");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.redLineFlags.includes("real_fixture_signal"), true);
  assert.equal(handoff.redLineFlags.includes("real_db_write_signal"), true);
  assert.equal(handoff.redLineFlags.includes("production_like_signal"), true);
  assert.equal(handoff.redLineFlags.includes("real_gate_signal"), true);
  assert.equal(handoff.operatorActions.some((item) => item.includes("删除真实执行")), true);
});

test("does not echo sensitive values when redaction fails", () => {
  const handoff = createGatewayProjectionControlledSmokeExecutionHandoff(readyInput({
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
});

test("blocks cross-owner full-success and downstream success overclaims", () => {
  const handoff = createGatewayProjectionControlledSmokeExecutionHandoff(readyInput({
    operatorNote: "Gateway allow, API authorization report full-success and Insight success prove production readiness",
  }));

  assert.equal(handoff.status, "hard-red-line");
  assert.equal(handoff.blockerAlias, "full_success_overclaim");
  assert.equal(handoff.redLineFlags.includes("full_success_overclaim"), true);
  assert.equal(handoff.cannotInferBoundaries.some((item) => item.includes("production readiness")), true);
});

test("unknown sanitized aliases remain blocked and Admin scoped", () => {
  const handoff = createGatewayProjectionControlledSmokeExecutionHandoff(readyInput({
    remediationResultEvidenceHandoffSummary: remediationResult({
      evidenceAliases: ["unexpected_execution_alias"],
    }),
  }));

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.blockerAlias, "unknown_controlled_smoke_execution_alias");
  assert.equal(handoff.remediationAlias, "unexpected_execution_alias");
  assert.equal(hasOwner(handoff, "admin_operator"), true);
  assert.equal(handoff.doNotDispatchUntil.includes("稳定 Admin owner handoff alias"), true);
});

test("ignores non-extrapolation boundary text", () => {
  const handoff = createGatewayProjectionControlledSmokeExecutionHandoff(readyInput({
    operatorNote: "不是 full-success，不能证明 API/Gateway/Insight 成功，也不得触发 gateway ingestion",
  }));

  assert.equal(handoff.status, "ready-for-controlled-smoke-execution");
  assert.equal(handoff.redLineFlags.length, 0);
});
