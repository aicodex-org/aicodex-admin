const assert = require("node:assert/strict");
const test = require("node:test");

let createGatewayProjectionControlledSmokeOperatorDecisionHandoff;
try {
  ({
    createGatewayProjectionControlledSmokeOperatorDecisionHandoff,
  } = require("./gatewayProjectionControlledSmokeOperatorDecisionHandoff"));
} catch {
  createGatewayProjectionControlledSmokeOperatorDecisionHandoff = () => ({
    status: "missing_module",
    release: "hold",
    blockerAlias: "gatewayProjectionControlledSmokeOperatorDecisionHandoff_not_implemented",
    remediationAlias: "helper_not_implemented",
    nextAdminAction: "blocked",
    decisionPackageMetadata: {},
    redLineFlags: [],
    missingPrerequisites: [],
    ownerHandoffLimits: [],
    minimumUnblockConditions: [],
    cannotInferBoundaries: [],
  });
}

function executionHandoff(overrides = {}) {
  return {
    status: "ready-for-controlled-smoke-execution",
    release: "release_after_report",
    blockerAlias: "none",
    remediationAlias: "controlled_smoke_execution_prerequisites_clear",
    missingPrerequisites: [],
    redLineFlags: [],
    ownerHandoffLimits: [{
      alias: "controlled_smoke_execution_prerequisites_clear",
      owner: "admin_operator",
      minimumUnblockCondition: "execution handoff 只包含脱敏本地执行准备摘要",
    }],
    cannotInferBoundaries: [
      "execution handoff 不能外推为 controlled smoke pass 或 full-success",
    ],
    ...overrides,
  };
}

function resultEvidenceHandoff(overrides = {}) {
  return {
    status: "ready-for-result-evidence-handoff",
    release: "release_after_report",
    blockerAlias: null,
    remediationAlias: null,
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

function releaseSummaryHandoff(overrides = {}) {
  return {
    status: "ready-for-release-summary-handoff",
    release: "release_after_report",
    classification: "release-summary",
    blockerAlias: null,
    remediationAlias: null,
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
    ownerHandoffLimits: [{
      alias: "controlled_smoke_release_summary_handoff",
      owner: "admin_operator",
      minimumUnblockCondition: "release summary 已完成本地脱敏检查",
    }],
    cannotInferBoundaries: [
      "release summary handoff 不能外推为 controlled smoke pass 或 full-success",
    ],
    ...overrides,
  };
}

function operatorTriageHandoff(overrides = {}) {
  return {
    status: "ready-for-operator-triage-handoff",
    release: "release_after_report",
    blockerAlias: "none",
    remediationAlias: "operator_triage_package_ready",
    nextSteps: ["复制脱敏 triage package 给 operator 复核"],
    ownerHandoffLimits: [{
      alias: "controlled_smoke_operator_triage_handoff",
      owner: "admin_operator",
      minimumUnblockCondition: "release summary 与 result evidence 均为 ready，且无 red-line signal",
    }],
    minimumUnblockConditions: [{
      alias: "controlled_smoke_operator_triage_handoff",
      owner: "admin_operator",
      condition: "release summary 与 result evidence 均为 ready，且无 red-line signal",
    }],
    cannotInferBoundaries: [
      "operator triage handoff 不能外推为 controlled smoke pass 或 full-success",
    ],
    ...overrides,
  };
}

function readyInput(overrides = {}) {
  return {
    operatorTriageHandoffSummary: operatorTriageHandoff(),
    resultEvidenceHandoffSummary: resultEvidenceHandoff(),
    executionHandoffSummary: executionHandoff(),
    releaseSummaryHandoffSummary: releaseSummaryHandoff(),
    operatorNote: "只生成本地 operator decision package，不声明 full-success",
    ...overrides,
  };
}

test("returns a compact ready decision package from sanitized handoff summaries", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorDecisionHandoff(readyInput(), {
    generatedAt: "2026-06-13T17:30:00.000Z",
    sourceAlias: "local-operator-decision-test",
  });

  assert.equal(handoff.status, "ready-for-operator-decision-handoff");
  assert.equal(handoff.release, "release_after_report");
  assert.equal(handoff.nextAdminAction, "operator_decision_handoff");
  assert.equal(handoff.blockerAlias, "none");
  assert.equal(handoff.remediationAlias, "operator_decision_package_ready");
  assert.equal(handoff.decisionPackageMetadata.sourceAlias, "local-operator-decision-test");
  assert.equal(handoff.decisionPackageMetadata.generatedAt, "2026-06-13T17:30:00.000Z");
  assert.deepEqual(handoff.decisionPackageMetadata.includedSummaries, [
    "operator_triage_handoff",
    "result_evidence_handoff",
    "controlled_smoke_execution_handoff",
    "release_summary_handoff",
  ]);
  assert.equal(handoff.nextSteps.some((item) => item.includes("operator decision package")), true);
  assert.equal(handoff.ownerHandoffLimits.every((item) => item.owner === "admin_operator"), true);
  assert.equal(handoff.doNotDispatchUntil.includes("full-success"), true);
  assert.equal(handoff.cannotInferBoundaries.some((item) => item.includes("真实 publish")), true);
});

test("keeps an upstream blocked triage package blocked and actionable", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorDecisionHandoff(readyInput({
    operatorTriageHandoffSummary: operatorTriageHandoff({
      status: "blocked",
      release: "hold",
      blockerAlias: "controlled_smoke_operator_triage_missing",
      remediationAlias: "collect_sanitized_operator_triage_inputs",
      ownerHandoffLimits: [{
        alias: "controlled_smoke_operator_triage_missing",
        owner: "admin_operator",
        minimumUnblockCondition: "release summary/result evidence 摘要补齐后重跑 triage",
      }],
    }),
  }));

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.blockerAlias, "controlled_smoke_operator_triage_missing");
  assert.equal(handoff.remediationAlias, "collect_sanitized_operator_triage_inputs");
  assert.equal(handoff.nextAdminAction, "clear_blocker_then_regenerate_decision_package");
  assert.equal(handoff.minimumUnblockConditions.some((item) => item.condition.includes("result evidence")), true);
});

test("preserves needs-user-action from release summary handoff", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorDecisionHandoff(readyInput({
    releaseSummaryHandoffSummary: releaseSummaryHandoff({
      status: "needs-user-action",
      release: "hold",
      classification: "needs-user-action",
      blockerAlias: "controlled_smoke_release_summary_needs_user_action",
      remediationAlias: "collect_operator_release_summary_action",
      ownerHandoffLimits: [{
        alias: "controlled_smoke_release_summary_needs_user_action",
        owner: "admin_operator",
        minimumUnblockCondition: "operator action alias 已清除",
      }],
    }),
  }));

  assert.equal(handoff.status, "needs-user-action");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.blockerAlias, "controlled_smoke_release_summary_needs_user_action");
  assert.equal(handoff.remediationAlias, "collect_operator_release_summary_action");
  assert.equal(handoff.nextSteps.some((item) => item.includes("用户动作")), true);
});

test("preserves a single blocked upstream release summary alias", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorDecisionHandoff(readyInput({
    releaseSummaryHandoffSummary: releaseSummaryHandoff({
      status: "blocked",
      release: "hold",
      classification: "blocked",
      blockerAlias: "controlled_smoke_release_summary_count_alias_mismatch",
      remediationAlias: "reconcile_sanitized_release_summary_counts_and_aliases",
      ownerHandoffLimits: [{
        alias: "controlled_smoke_release_summary_count_alias_mismatch",
        owner: "admin_operator",
        minimumUnblockCondition: "release summary counts 与 aliases 已重新对齐",
      }],
    }),
  }));

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.blockerAlias, "controlled_smoke_release_summary_count_alias_mismatch");
  assert.equal(handoff.remediationAlias, "reconcile_sanitized_release_summary_counts_and_aliases");
  assert.equal(handoff.minimumUnblockConditions.some((item) => item.condition.includes("counts")), true);
});

test("hard red-lines real publish gateway ingestion authorization facts and full-success claims", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorDecisionHandoff(readyInput({
    operatorNote: "real publish completed, gateway ingestion success, authorization facts success, full-success",
  }));

  assert.equal(handoff.status, "hard-red-line");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.blockerAlias, "full_success_overclaim");
  assert.equal(handoff.redLineFlags.includes("real_publish_signal"), true);
  assert.equal(handoff.redLineFlags.includes("gateway_ingestion_signal"), true);
  assert.equal(handoff.redLineFlags.includes("authorization_facts_signal"), true);
  assert.equal(handoff.redLineFlags.includes("full_success_overclaim"), true);
});

test("blocks missing summaries and non-ready result evidence", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorDecisionHandoff({
    operatorTriageHandoffSummary: operatorTriageHandoff(),
    resultEvidenceHandoffSummary: resultEvidenceHandoff({
      status: "blocked",
      release: "hold",
      blockerAlias: "controlled_smoke_result_evidence_missing",
      remediationAlias: "collect_sanitized_controlled_smoke_result_evidence",
    }),
  });

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.blockerAlias, "controlled_smoke_operator_decision_missing");
  assert.equal(handoff.missingPrerequisites.includes("executionHandoffSummary"), true);
  assert.equal(handoff.missingPrerequisites.includes("releaseSummaryHandoffSummary"), true);
  assert.equal(handoff.missingPrerequisites.includes("resultEvidenceHandoffSummary:not_ready"), true);
});

test("blocks missing triage and non-ready execution or release summaries", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorDecisionHandoff({
    resultEvidenceHandoffSummary: resultEvidenceHandoff(),
    executionHandoffSummary: executionHandoff({
      status: "blocked",
      release: "hold",
    }),
    releaseSummaryHandoffSummary: releaseSummaryHandoff({
      status: "blocked",
      release: "hold",
    }),
  });

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.blockerAlias, "controlled_smoke_operator_decision_missing");
  assert.equal(handoff.missingPrerequisites.includes("operatorTriageHandoffSummary"), true);
  assert.equal(handoff.missingPrerequisites.includes("executionHandoffSummary:not_ready"), true);
  assert.equal(handoff.missingPrerequisites.includes("releaseSummaryHandoffSummary:not_ready"), true);
});

test("preserves upstream hard red-line summaries", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorDecisionHandoff(readyInput({
    operatorTriageHandoffSummary: operatorTriageHandoff({
      status: "hard-red-line",
      release: "hold",
      blockerAlias: "real_execution_signal",
      remediationAlias: "remove_real_operator_triage_signal",
      redLineFlags: ["gateway_ingestion_signal"],
      ownerHandoffLimits: [],
    }),
  }));

  assert.equal(handoff.status, "hard-red-line");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.blockerAlias, "real_execution_signal");
  assert.equal(handoff.remediationAlias, "remove_real_operator_triage_signal");
  assert.equal(handoff.redLineFlags.includes("gateway_ingestion_signal"), true);
  assert.equal(handoff.ownerHandoffLimits.some((item) => item.alias === "real_execution_signal"), true);
});

test("does not echo sensitive values when redaction fails", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorDecisionHandoff(readyInput({
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

test("keeps unknown sanitized aliases blocked and Admin scoped", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorDecisionHandoff(readyInput({
    operatorTriageHandoffSummary: operatorTriageHandoff({
      remediationAlias: "unexpected_operator_decision_alias",
    }),
  }));

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.blockerAlias, "unknown_controlled_smoke_operator_decision_alias");
  assert.equal(handoff.remediationAlias, "unexpected_operator_decision_alias");
  assert.equal(handoff.ownerHandoffLimits.some((item) => item.owner === "admin_operator"), true);
  assert.equal(handoff.doNotDispatchUntil.includes("稳定 Admin owner handoff alias"), true);
});

test("ignores non-extrapolation boundary text", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorDecisionHandoff(readyInput({
    operatorNote: "不是 full-success，不能证明 controlled smoke pass，也不得触发 gateway ingestion",
    claim: ["cannot infer production readiness", "no authorization facts success"],
    cannotInferBoundaries: [
      "不能外推为 Gateway ingestion success",
      "不是 API authorization report full-success",
    ],
  }));

  assert.equal(handoff.status, "ready-for-operator-decision-handoff");
  assert.equal(handoff.redLineFlags.length, 0);
});
