const assert = require("node:assert/strict");
const test = require("node:test");

let createGatewayProjectionControlledSmokeOperatorTriageHandoff;
try {
  ({
    createGatewayProjectionControlledSmokeOperatorTriageHandoff,
  } = require("./gatewayProjectionControlledSmokeOperatorTriageHandoff"));
} catch {
  createGatewayProjectionControlledSmokeOperatorTriageHandoff = () => ({
    status: "missing_module",
    release: "hold",
    blockerAlias: "gatewayProjectionControlledSmokeOperatorTriageHandoff_not_implemented",
    remediationAlias: "helper_not_implemented",
    nextSteps: [],
    ownerHandoffLimits: [],
    minimumUnblockConditions: [],
    redLineFlags: [],
    cannotInferBoundaries: [],
    triagePackageMetadata: {},
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

function releaseSummaryHandoff(overrides = {}) {
  return {
    status: "ready-for-release-summary-handoff",
    release: "release_after_report",
    classification: "release-summary",
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
    blockerAlias: null,
    remediationAlias: null,
    ownerHandoffLimits: [{
      alias: "controlled_smoke_release_summary_handoff",
      owner: "admin_operator",
      nextAction: "交接脱敏 controlled smoke release summary",
      minimumUnblockCondition: "result evidence 与 release summary 均为稳定脱敏摘要且无 red-line signal",
    }],
    minimumUnblockConditions: [{
      alias: "controlled_smoke_release_summary_handoff",
      owner: "admin_operator",
      condition: "result evidence 与 release summary 均为稳定脱敏摘要且无 red-line signal",
    }],
    cannotInferBoundaries: [
      "release summary handoff 不能外推为 controlled smoke pass 或 full-success",
    ],
    doNotDispatchUntil: "只可交接本地脱敏 release summary；不要外派为 controlled smoke pass 或 full-success",
    ...overrides,
  };
}

function readyInput(overrides = {}) {
  return {
    releaseSummaryHandoffSummary: releaseSummaryHandoff(),
    resultEvidenceHandoffSummary: resultEvidenceHandoff(),
    operatorNote: "仅生成本地脱敏 triage package，不声明 full-success",
    ...overrides,
  };
}

test("returns ready operator triage package for sanitized release summary handoff", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorTriageHandoff(readyInput(), {
    generatedAt: "2026-06-13T16:00:00.000Z",
    sourceAlias: "local-operator-triage-test",
  });

  assert.equal(handoff.status, "ready-for-operator-triage-handoff");
  assert.equal(handoff.release, "release_after_report");
  assert.equal(handoff.blockerAlias, "none");
  assert.equal(handoff.remediationAlias, "operator_triage_package_ready");
  assert.equal(handoff.nextSteps.some((item) => item.includes("复制脱敏 triage package")), true);
  assert.equal(handoff.ownerHandoffLimits.some((item) => item.owner === "admin_operator"), true);
  assert.equal(handoff.minimumUnblockConditions.some((item) => item.alias === "controlled_smoke_operator_triage_handoff"), true);
  assert.equal(handoff.triagePackageMetadata.sourceAlias, "local-operator-triage-test");
  assert.equal(handoff.triagePackageMetadata.generatedAt, "2026-06-13T16:00:00.000Z");
  assert.equal(handoff.doNotDispatchUntil.includes("full-success"), true);
  assert.equal(handoff.cannotInferBoundaries.some((item) => item.includes("controlled smoke pass")), true);
});

test("keeps blocked release summary actionable with stable aliases", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorTriageHandoff(readyInput({
    releaseSummaryHandoffSummary: releaseSummaryHandoff({
      status: "blocked",
      release: "hold",
      classification: "blocked",
      blockerAlias: "controlled_smoke_release_summary_count_alias_mismatch",
      remediationAlias: "reconcile_sanitized_release_summary_counts_and_aliases",
      ownerHandoffLimits: [{
        alias: "controlled_smoke_release_summary_count_alias_mismatch",
        owner: "admin_operator",
        minimumUnblockCondition: "releaseSummaryCounts 与 releaseSummaryAliases 已重新对齐",
      }],
    }),
  }));

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.blockerAlias, "controlled_smoke_release_summary_count_alias_mismatch");
  assert.equal(handoff.remediationAlias, "reconcile_sanitized_release_summary_counts_and_aliases");
  assert.equal(handoff.minimumUnblockConditions.some((item) => item.condition.includes("releaseSummaryCounts")), true);
  assert.equal(handoff.nextSteps.some((item) => item.includes("清除 stable blocker")), true);
});

test("blocks missing release summary or non-ready result evidence prerequisites", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorTriageHandoff({
    resultEvidenceHandoffSummary: resultEvidenceHandoff({
      status: "blocked",
      release: "hold",
      blockerAlias: "controlled_smoke_result_evidence_missing",
    }),
  });

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.blockerAlias, "controlled_smoke_operator_triage_missing");
  assert.equal(handoff.missingPrerequisites.includes("releaseSummaryHandoffSummary"), true);
  assert.equal(handoff.missingPrerequisites.includes("resultEvidenceHandoffSummary:not_ready"), true);
});

test("preserves needs-user-action without downgrading to ready", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorTriageHandoff(readyInput({
    releaseSummaryHandoffSummary: releaseSummaryHandoff({
      status: "needs-user-action",
      release: "hold",
      classification: "needs-user-action",
      blockerAlias: "controlled_smoke_release_summary_needs_user_action",
      remediationAlias: "collect_operator_release_summary_action",
      ownerHandoffLimits: [{
        alias: "controlled_smoke_release_summary_needs_user_action",
        owner: "admin_operator",
        minimumUnblockCondition: "operator action alias 已清除，release summary 可重新分类",
      }],
    }),
  }));

  assert.equal(handoff.status, "needs-user-action");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.blockerAlias, "controlled_smoke_release_summary_needs_user_action");
  assert.equal(handoff.remediationAlias, "collect_operator_release_summary_action");
  assert.equal(handoff.nextSteps.some((item) => item.includes("用户动作")), true);
});

test("preserves upstream hard red-line release summary", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorTriageHandoff(readyInput({
    releaseSummaryHandoffSummary: releaseSummaryHandoff({
      status: "hard-red-line",
      release: "hold",
      classification: "hard-red-line",
      blockerAlias: "full_success_overclaim",
      remediationAlias: "remove_cross_owner_success_claim",
      redLineFlags: ["full_success_overclaim"],
    }),
  }));

  assert.equal(handoff.status, "hard-red-line");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.blockerAlias, "full_success_overclaim");
  assert.equal(handoff.redLineFlags.includes("full_success_overclaim"), true);
  assert.equal(handoff.nextSteps.some((item) => item.includes("full-success 外推")), true);
});

test("hard red-lines real publish controlled smoke gateway ingestion and authorization facts signals", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorTriageHandoff(readyInput({
    operatorNote: "real publish done, real controlled smoke passed, gateway ingestion succeeded, authorization facts updated",
  }));

  assert.equal(handoff.status, "hard-red-line");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.blockerAlias, "real_execution_signal");
  assert.equal(handoff.redLineFlags.includes("real_publish_signal"), true);
  assert.equal(handoff.redLineFlags.includes("real_controlled_smoke_signal"), true);
  assert.equal(handoff.redLineFlags.includes("gateway_ingestion_signal"), true);
  assert.equal(handoff.redLineFlags.includes("authorization_facts_signal"), true);
});

test("does not echo sensitive values when redaction fails", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorTriageHandoff(readyInput({
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
  const handoff = createGatewayProjectionControlledSmokeOperatorTriageHandoff(readyInput({
    operatorNote: "Gateway allow and API authorization report full-success prove Insight success, controlled smoke pass and production readiness",
  }));

  assert.equal(handoff.status, "hard-red-line");
  assert.equal(handoff.blockerAlias, "full_success_overclaim");
  assert.equal(handoff.redLineFlags.includes("full_success_overclaim"), true);
  assert.equal(handoff.cannotInferBoundaries.some((item) => item.includes("production readiness")), true);
});

test("keeps unknown sanitized aliases blocked and Admin scoped", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorTriageHandoff(readyInput({
    releaseSummaryHandoffSummary: releaseSummaryHandoff({
      releaseSummaryAliases: ["unexpected_release_summary_alias"],
    }),
  }));

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.blockerAlias, "unknown_controlled_smoke_operator_triage_alias");
  assert.equal(handoff.remediationAlias, "unexpected_release_summary_alias");
  assert.equal(handoff.ownerHandoffLimits.some((item) => item.owner === "admin_operator"), true);
  assert.equal(handoff.doNotDispatchUntil.includes("稳定 Admin owner handoff alias"), true);
});

test("ignores non-extrapolation boundary text", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorTriageHandoff(readyInput({
    operatorNote: "不是 full-success，不能证明 controlled smoke pass，也不得触发 gateway ingestion",
  }));

  assert.equal(handoff.status, "ready-for-operator-triage-handoff");
  assert.equal(handoff.redLineFlags.length, 0);
});
