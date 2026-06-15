const assert = require("node:assert/strict");
const test = require("node:test");

let createWecomSourceControlledSmokeOperatorDecisionHandoff;
try {
  ({
    createWecomSourceControlledSmokeOperatorDecisionHandoff,
  } = require("./wecomSourceControlledSmokeOperatorDecisionHandoff"));
} catch {
  createWecomSourceControlledSmokeOperatorDecisionHandoff = () => ({
    status: "missing_module",
    decisionStatus: "blocked",
    blockerAlias: "wecomSourceControlledSmokeOperatorDecisionHandoff_not_implemented",
    remediationAlias: "helper_not_implemented",
    decisionOptions: [],
    nextOptions: [],
    ownerHandoffLimits: [],
    minimumUnblockConditions: [],
    redLineFlags: [],
    missingPrerequisites: [],
    redactionMetadata: {},
    cannotInferBoundaries: [],
    decisionPackageMetadata: {},
    doNotDispatchUntil: "",
  });
}

function preflight(overrides = {}) {
  return {
    status: "ready-for-wecom-controlled-smoke-preflight",
    release: "release_after_report",
    reasonAlias: "ready-for-wecom-controlled-smoke-preflight",
    evidenceShapeVersion: "wecom-source-controlled-smoke-preflight/v1",
    ...overrides,
  };
}

function execution(overrides = {}) {
  return {
    status: "ready-for-controlled-smoke-execution-handoff",
    release: "release_after_report",
    reasonAlias: "ready-for-controlled-smoke-execution-handoff",
    hardRedLineFlags: [],
    minimumUnblockConditions: [],
    ...overrides,
  };
}

function resultEvidence(overrides = {}) {
  return {
    status: "passed",
    release: "release_after_report",
    reasonAlias: "wecom_source_controlled_smoke_result_passed",
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
    redactionCategory: "redacted",
    riskCategory: "low",
    redLineFlags: [],
    missingPrerequisites: [],
    ...overrides,
  };
}

function remediation(overrides = {}) {
  return {
    status: "ready",
    release: "release_after_report",
    reasonAlias: "ready",
    remediations: [],
    missingPrerequisites: [],
    redLineFlags: [],
    ownerHandoffs: [{
      alias: "wecom_source_operator_remediation_handoff",
      owner: "admin_operator",
      minimumUnblockCondition: "remediation blockers 已清空且输入只包含脱敏 summary",
    }],
    ...overrides,
  };
}

function triage(overrides = {}) {
  return {
    status: "ready-for-operator-triage-handoff",
    release: "release_after_report",
    blockerAlias: "none",
    remediationAlias: "wecom_source_operator_triage_package_ready",
    resultAliases: ["wecom_source_controlled_smoke_result_passed"],
    remediationAliases: [],
    redactionCategory: "redacted",
    riskCategory: "low",
    redLineFlags: [],
    missingPrerequisites: [],
    ownerHandoffLimits: [{
      alias: "wecom_source_controlled_smoke_operator_triage_handoff",
      owner: "admin_operator",
      minimumUnblockCondition: "result evidence handoff 为 passed，operator remediation handoff 为 ready，且无 red-line signal",
    }],
    ...overrides,
  };
}

function readyInput(overrides = {}) {
  return {
    preflightSummary: preflight(),
    executionHandoffSummary: execution(),
    resultEvidenceHandoffSummary: resultEvidence(),
    operatorRemediationHandoffSummary: remediation(),
    operatorTriageHandoffSummary: triage(),
    operatorNote: "仅生成本地脱敏 operator decision package，不声明 full-success",
    ...overrides,
  };
}

test("returns ready operator decision package for sanitized ready handoffs", () => {
  const handoff = createWecomSourceControlledSmokeOperatorDecisionHandoff(readyInput(), {
    generatedAt: "2026-06-13T20:00:00.000Z",
    sourceAlias: "local-wecom-operator-decision-test",
  });

  assert.equal(handoff.status, "ready-for-operator-decision-handoff");
  assert.equal(handoff.decisionStatus, "ready-for-operator-release-decision");
  assert.equal(handoff.blockerAlias, "none");
  assert.equal(handoff.remediationAlias, "wecom_source_operator_decision_package_ready");
  assert.equal(handoff.decisionOptions.includes("handoff_to_release_operator"), true);
  assert.equal(handoff.nextOptions.some((item) => item.includes("复制本地脱敏 decision package")), true);
  assert.equal(handoff.ownerHandoffLimits.some((item) => item.owner === "admin_operator"), true);
  assert.equal(handoff.minimumUnblockConditions.some((item) => item.alias === "wecom_source_controlled_smoke_operator_decision_handoff"), true);
  assert.equal(handoff.redactionMetadata.category, "redacted");
  assert.equal(handoff.decisionPackageMetadata.sourceAlias, "local-wecom-operator-decision-test");
  assert.equal(handoff.decisionPackageMetadata.generatedAt, "2026-06-13T20:00:00.000Z");
  assert.equal(handoff.cannotInferBoundaries.some((item) => item.includes("controlled smoke pass")), true);
  assert.equal(handoff.doNotDispatchUntil.includes("full-success"), true);
});

test("needs user action when a required upstream handoff is missing", () => {
  const handoff = createWecomSourceControlledSmokeOperatorDecisionHandoff({
    preflightSummary: preflight(),
    resultEvidenceHandoffSummary: resultEvidence(),
    operatorRemediationHandoffSummary: remediation(),
    operatorTriageHandoffSummary: triage(),
  });

  assert.equal(handoff.status, "needs-user-action");
  assert.equal(handoff.blockerAlias, "missing_execution_handoff_summary");
  assert.equal(handoff.missingPrerequisites.includes("executionHandoffSummary"), true);
  assert.equal(handoff.minimumUnblockConditions.some((item) => item.condition.includes("Controlled Smoke Execution Handoff")), true);
});

test("blocks non-ready upstream result evidence with stable owner limits", () => {
  const handoff = createWecomSourceControlledSmokeOperatorDecisionHandoff(readyInput({
    resultEvidenceHandoffSummary: resultEvidence({
      status: "partial-handoff",
      release: "hold",
      reasonAlias: "wecom_source_controlled_smoke_result_partial_handoff",
      ownerHandoffLimits: [{
        alias: "wecom_source_controlled_smoke_result_partial_handoff",
        owner: "admin_operator",
        minimumUnblockCondition: "补齐缺失本地 result evidence",
      }],
    }),
  }));

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.blockerAlias, "wecom_source_controlled_smoke_result_partial_handoff");
  assert.equal(handoff.remediationAlias, "rerun_wecom_source_result_evidence_handoff");
  assert.equal(handoff.minimumUnblockConditions.some((item) => item.condition.includes("补齐缺失")), true);
});

test("uses fallback blocker and minimum condition for sparse non-ready upstream summary", () => {
  const handoff = createWecomSourceControlledSmokeOperatorDecisionHandoff(readyInput({
    executionHandoffSummary: {
      status: "blocked-prerequisite",
      release: "hold",
    },
  }));

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.blockerAlias, "blocked-prerequisite");
  assert.equal(handoff.remediationAlias, "rerun_wecom_source_execution_handoff");
  assert.equal(handoff.ownerHandoffLimits.some((item) => item.minimumUnblockCondition.includes("Controlled Smoke Execution Handoff")), true);
});

test("uses configured fallback alias when sparse upstream summary has no status fields", () => {
  const handoff = createWecomSourceControlledSmokeOperatorDecisionHandoff(readyInput({
    executionHandoffSummary: {},
  }));

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.blockerAlias, "wecom_source_controlled_smoke_execution_handoff_not_ready");
  assert.equal(handoff.minimumUnblockConditions.some((item) => item.alias === "wecom_source_controlled_smoke_execution_handoff_not_ready"), true);
});

test("preserves upstream needs-user-action instead of marking decision ready", () => {
  const handoff = createWecomSourceControlledSmokeOperatorDecisionHandoff(readyInput({
    operatorTriageHandoffSummary: triage({
      status: "needs-user-action",
      release: "hold",
      blockerAlias: "missing-operator-approval-alias",
      minimumUnblockConditions: [{
        alias: "missing-operator-approval-alias",
        owner: "admin_operator",
        condition: "补齐脱敏 approval alias",
      }],
    }),
  }));

  assert.equal(handoff.status, "needs-user-action");
  assert.equal(handoff.blockerAlias, "missing-operator-approval-alias");
  assert.equal(handoff.nextOptions.some((item) => item.includes("用户动作")), true);
});

test("hard red-lines real execution downstream and full-success claims", () => {
  const handoff = createWecomSourceControlledSmokeOperatorDecisionHandoff(readyInput({
    operatorNote: "real WeCom sync and real controlled smoke passed; Gateway/API/Insight success, authorization facts and full-success are production ready",
  }));

  assert.equal(handoff.status, "hard-red-line");
  assert.equal(handoff.blockerAlias, "real_execution_signal");
  assert.equal(handoff.redLineFlags.includes("real_sync_signal"), true);
  assert.equal(handoff.redLineFlags.includes("real_controlled_smoke_signal"), true);
  assert.equal(handoff.redLineFlags.includes("downstream_success_overclaim"), true);
  assert.equal(handoff.redLineFlags.includes("authorization_facts_overclaim"), true);
  assert.equal(handoff.redLineFlags.includes("full_success_overclaim"), true);
});

test("hard red-lines upstream summary red-line flags", () => {
  const handoff = createWecomSourceControlledSmokeOperatorDecisionHandoff(readyInput({
    executionHandoffSummary: execution({
      hardRedLineFlags: ["synthetic_audit_projection_signal"],
    }),
  }));

  assert.equal(handoff.status, "hard-red-line");
  assert.equal(handoff.redLineFlags.includes("synthetic_audit_projection_signal"), true);
  assert.equal(handoff.blockerAlias, "full_success_overclaim");
});

test("rejects sensitive evidence without echoing values or field names", () => {
  const handoff = createWecomSourceControlledSmokeOperatorDecisionHandoff(readyInput({
    operatorMetadata: {
      token: "redacted-sensitive-value",
      privateEndpoint: "redacted-private-url",
      email: "redacted-email",
      rawResponseBody: { ok: true },
    },
  }));

  const serialized = JSON.stringify(handoff);
  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.blockerAlias, "sanitization_failed");
  assert.equal(handoff.redactionMetadata.rejectedSensitiveEvidence, true);
  assert.equal(serialized.includes("redacted-sensitive-value"), false);
  assert.equal(serialized.includes("privateEndpoint"), false);
  assert.equal(serialized.includes("redacted-email"), false);
  assert.equal(serialized.includes("rawResponseBody"), false);
});

test("blocks unknown sanitized aliases", () => {
  const handoff = createWecomSourceControlledSmokeOperatorDecisionHandoff(readyInput({
    operatorTriageHandoffSummary: triage({
      blockerAlias: "unexpected-wecom-triage-alias",
    }),
  }));

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.blockerAlias, "unknown_wecom_source_operator_decision_alias");
  assert.equal(handoff.remediationAlias, "unexpected-wecom-triage-alias");
  assert.equal(handoff.doNotDispatchUntil.includes("稳定 Admin WeCom source handoff alias"), true);
});

test("ignores explicit non-extrapolation boundary text", () => {
  const handoff = createWecomSourceControlledSmokeOperatorDecisionHandoff(readyInput({
    operatorNote: "不是 full-success，不能证明 controlled smoke pass，也不得触发真实 WeCom 同步",
  }));

  assert.equal(handoff.status, "ready-for-operator-decision-handoff");
  assert.equal(handoff.redLineFlags.length, 0);
});
