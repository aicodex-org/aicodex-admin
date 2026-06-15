const assert = require("node:assert/strict");
const test = require("node:test");

let createGatewayProjectionControlledSmokeOperatorActionHandoff;
try {
  ({
    createGatewayProjectionControlledSmokeOperatorActionHandoff,
  } = require("./gatewayProjectionControlledSmokeOperatorActionHandoff"));
} catch {
  createGatewayProjectionControlledSmokeOperatorActionHandoff = () => ({
    actionStatus: "missing_module",
    release: "hold",
    nextAction: "blocked",
    blockerAlias: "gatewayProjectionControlledSmokeOperatorActionHandoff_not_implemented",
    remediationAlias: "helper_not_implemented",
    actionPackageMetadata: {},
    redLineFlags: [],
    missingPrerequisites: [],
    ownerHandoffLimits: [],
    minimumUnblockConditions: [],
    cannotInferBoundaries: [],
  });
}

function decisionHandoff(overrides = {}) {
  return {
    status: "ready-for-operator-decision-handoff",
    release: "release_after_report",
    nextAdminAction: "operator_decision_handoff",
    blockerAlias: "none",
    remediationAlias: "operator_decision_package_ready",
    releaseSummaryAliases: ["controlled_smoke_release_summary_ready"],
    resultAliases: ["controlled_smoke_result_ready_for_handoff"],
    releaseSummaryCounts: {
      sectionsExpected: 4,
      sectionsObserved: 4,
      blockedItems: 0,
      needsUserActionItems: 0,
      hardRedLineItems: 0,
    },
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
      alias: "controlled_smoke_operator_decision_handoff",
      owner: "admin_operator",
      nextAction: "交接本地脱敏 operator decision package",
      minimumUnblockCondition: "triage/result/execution/release-summary handoff 均为 ready 且无 red-line signal",
    }],
    minimumUnblockConditions: [{
      alias: "controlled_smoke_operator_decision_handoff",
      owner: "admin_operator",
      condition: "triage/result/execution/release-summary handoff 均为 ready 且无 red-line signal",
    }],
    cannotInferBoundaries: [
      "decision package 不能外推为真实 publish、Gateway ingestion、authorization facts、controlled smoke pass 或 full-success",
    ],
    doNotDispatchUntil: "只可交接本地脱敏 operator decision package；不要外派为 controlled smoke pass 或 full-success",
    ...overrides,
  };
}

function readyInput(overrides = {}) {
  return {
    operatorDecisionHandoffSummary: decisionHandoff(),
    operatorNote: "只生成本地 operator action package，不声明 full-success",
    ...overrides,
  };
}

test("returns owner-safe action package from sanitized decision handoff", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorActionHandoff(readyInput(), {
    generatedAt: "2026-06-13T18:20:00.000Z",
    sourceAlias: "local-operator-action-test",
  });

  assert.equal(handoff.actionStatus, "ready-for-operator-action");
  assert.equal(handoff.release, "release_after_report");
  assert.equal(handoff.nextAction, "handoff_owner_safe_operator_action_package");
  assert.equal(handoff.blockerAlias, "none");
  assert.equal(handoff.remediationAlias, "operator_action_package_ready");
  assert.equal(handoff.actionPackageMetadata.sourceAlias, "local-operator-action-test");
  assert.equal(handoff.actionPackageMetadata.generatedAt, "2026-06-13T18:20:00.000Z");
  assert.equal(handoff.actionPackageMetadata.packageShape, "admin-gateway-projection-controlled-smoke-operator-action-handoff/v1");
  assert.equal(handoff.ownerHandoffLimits.every((item) => item.owner === "admin_operator"), true);
  assert.equal(handoff.minimumUnblockConditions.some((item) => item.condition.includes("decision package")), true);
  assert.equal(handoff.doNotDispatchUntil.includes("full-success"), true);
  assert.equal(handoff.cannotInferBoundaries.some((item) => item.includes("真实 publish")), true);
});

test("keeps blocked decision package blocked with upstream alias", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorActionHandoff(readyInput({
    operatorDecisionHandoffSummary: decisionHandoff({
      status: "blocked",
      release: "hold",
      blockerAlias: "controlled_smoke_operator_decision_missing",
      remediationAlias: "collect_sanitized_operator_decision_inputs",
      ownerHandoffLimits: [{
        alias: "controlled_smoke_operator_decision_missing",
        owner: "admin_operator",
        minimumUnblockCondition: "decision package 输入补齐后重跑",
      }],
    }),
  }));

  assert.equal(handoff.actionStatus, "blocked");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.blockerAlias, "controlled_smoke_operator_decision_missing");
  assert.equal(handoff.remediationAlias, "collect_sanitized_operator_decision_inputs");
  assert.equal(handoff.nextAction, "clear_blocker_then_regenerate_action_package");
  assert.equal(handoff.minimumUnblockConditions.some((item) => item.condition.includes("decision package")), true);
});

test("preserves needs-user-action from decision package", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorActionHandoff(readyInput({
    operatorDecisionHandoffSummary: decisionHandoff({
      status: "needs-user-action",
      release: "hold",
      blockerAlias: "controlled_smoke_release_summary_needs_user_action",
      remediationAlias: "collect_operator_release_summary_action",
      ownerHandoffLimits: [{
        alias: "controlled_smoke_release_summary_needs_user_action",
        owner: "admin_operator",
        minimumUnblockCondition: "operator action alias 已清除",
      }],
    }),
  }));

  assert.equal(handoff.actionStatus, "needs-user-action");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.blockerAlias, "controlled_smoke_release_summary_needs_user_action");
  assert.equal(handoff.remediationAlias, "collect_operator_release_summary_action");
  assert.equal(handoff.nextAction, "collect_user_action_then_regenerate_action_package");
});

test("uses safe defaults for needs-user-action without upstream aliases", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorActionHandoff(readyInput({
    operatorDecisionHandoffSummary: decisionHandoff({
      status: "needs-user-action",
      release: "hold",
      blockerAlias: undefined,
      remediationAlias: undefined,
      ownerHandoffLimits: [],
    }),
  }));

  assert.equal(handoff.actionStatus, "needs-user-action");
  assert.equal(handoff.blockerAlias, "controlled_smoke_operator_action_needs_user_action");
  assert.equal(handoff.remediationAlias, "collect_operator_action");
  assert.equal(handoff.ownerHandoffLimits.some((item) => item.alias === "controlled_smoke_operator_action_blocked"), true);
});

test("preserves upstream hard red-line decision package", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorActionHandoff(readyInput({
    operatorDecisionHandoffSummary: decisionHandoff({
      status: "hard-red-line",
      release: "hold",
      blockerAlias: "real_execution_signal",
      remediationAlias: "remove_real_operator_decision_signal",
      redLineFlags: ["gateway_ingestion_signal"],
      ownerHandoffLimits: [],
    }),
  }));

  assert.equal(handoff.actionStatus, "hard-red-line");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.blockerAlias, "real_execution_signal");
  assert.equal(handoff.redLineFlags.includes("gateway_ingestion_signal"), true);
  assert.equal(handoff.ownerHandoffLimits.some((item) => item.alias === "real_execution_signal"), true);
});

test("uses safe defaults for hard red-line decision without upstream aliases", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorActionHandoff(readyInput({
    operatorDecisionHandoffSummary: decisionHandoff({
      status: "hard-red-line",
      release: "hold",
      blockerAlias: undefined,
      remediationAlias: undefined,
      ownerHandoffLimits: [],
    }),
  }));

  assert.equal(handoff.actionStatus, "hard-red-line");
  assert.equal(handoff.blockerAlias, "real_execution_signal");
  assert.equal(handoff.remediationAlias, "remove_real_operator_action_signal");
});

test("hard red-lines real publish gateway ingestion authorization facts and full-success claims", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorActionHandoff(readyInput({
    operatorNote: "real publish completed, gateway ingestion success, authorization facts success, full-success",
  }));

  assert.equal(handoff.actionStatus, "hard-red-line");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.blockerAlias, "full_success_overclaim");
  assert.equal(handoff.redLineFlags.includes("real_publish_signal"), true);
  assert.equal(handoff.redLineFlags.includes("gateway_ingestion_signal"), true);
  assert.equal(handoff.redLineFlags.includes("authorization_facts_signal"), true);
  assert.equal(handoff.redLineFlags.includes("full_success_overclaim"), true);
});

test("hard red-lines real execution signals without overclaiming full-success", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorActionHandoff(readyInput({
    operatorNote: "real controlled smoke started against production endpoint",
  }));

  assert.equal(handoff.actionStatus, "hard-red-line");
  assert.equal(handoff.blockerAlias, "real_execution_signal");
  assert.equal(handoff.remediationAlias, "remove_real_operator_action_signal");
  assert.equal(handoff.redLineFlags.includes("real_controlled_smoke_signal"), true);
});

test("blocks missing decision package", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorActionHandoff({});

  assert.equal(handoff.actionStatus, "blocked");
  assert.equal(handoff.blockerAlias, "controlled_smoke_operator_action_decision_missing");
  assert.equal(handoff.missingPrerequisites.includes("operatorDecisionHandoffSummary"), true);
  assert.equal(handoff.doNotDispatchUntil.includes("operatorDecisionHandoffSummary"), true);
});

test("blocks ready decision packages that still hold release", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorActionHandoff(readyInput({
    operatorDecisionHandoffSummary: decisionHandoff({
      release: "hold",
      blockerAlias: "none",
      remediationAlias: undefined,
      ownerHandoffLimits: [],
    }),
  }));

  assert.equal(handoff.actionStatus, "blocked");
  assert.equal(handoff.blockerAlias, "controlled_smoke_operator_action_decision_missing");
  assert.equal(handoff.remediationAlias, "collect_sanitized_operator_decision_inputs");
  assert.equal(handoff.missingPrerequisites.includes("operatorDecisionHandoffSummary:not_ready"), true);
  assert.equal(handoff.ownerHandoffLimits.some((item) => item.alias === "controlled_smoke_operator_action_blocked"), true);
});

test("uses safe defaults for blocked decision without upstream aliases", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorActionHandoff(readyInput({
    operatorDecisionHandoffSummary: decisionHandoff({
      status: "blocked",
      release: "hold",
      blockerAlias: undefined,
      remediationAlias: undefined,
      ownerHandoffLimits: [],
    }),
  }));

  assert.equal(handoff.actionStatus, "blocked");
  assert.equal(handoff.blockerAlias, "controlled_smoke_operator_action_decision_missing");
  assert.equal(handoff.remediationAlias, "collect_sanitized_operator_decision_inputs");
});

test("does not echo sensitive values when redaction fails", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorActionHandoff(readyInput({
    operatorMetadata: {
      token: "secret-value",
      privateEndpoint: "https://gateway.internal/api",
      email: "alice@example.invalid",
      rawGatewayResponseBody: { accepted: true },
    },
  }));

  const serialized = JSON.stringify(handoff);
  assert.equal(handoff.actionStatus, "blocked");
  assert.equal(handoff.blockerAlias, "sanitization_failed");
  assert.equal(serialized.includes("secret-value"), false);
  assert.equal(serialized.includes("gateway.internal"), false);
  assert.equal(serialized.includes("alice@example.invalid"), false);
  assert.equal(serialized.includes("rawGatewayResponseBody"), false);
});

test("blocks primitive credential-like operator notes without echoing them", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorActionHandoff(readyInput({
    operatorNote: "Bearer secret-token-value",
  }));

  assert.equal(handoff.actionStatus, "blocked");
  assert.equal(handoff.blockerAlias, "sanitization_failed");
  assert.equal(JSON.stringify(handoff).includes("secret-token-value"), false);
});

test("uses default metadata and owner limit fallbacks safely", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorActionHandoff(readyInput({
    operatorDecisionHandoffSummary: decisionHandoff({
      ownerHandoffLimits: [{
        condition: "decision fallback condition",
      }],
    }),
  }));

  assert.equal(handoff.actionStatus, "ready-for-operator-action");
  assert.equal(handoff.actionPackageMetadata.sourceAlias, "local-controlled-smoke-operator-action-handoff");
  assert.equal(typeof handoff.actionPackageMetadata.generatedAt, "string");
  assert.equal(handoff.ownerHandoffLimits.some((item) => item.minimumUnblockCondition.includes("decision package")), true);
});

test("keeps unknown sanitized aliases blocked and Admin scoped", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorActionHandoff(readyInput({
    operatorDecisionHandoffSummary: decisionHandoff({
      remediationAlias: "unexpected_operator_action_alias",
    }),
  }));

  assert.equal(handoff.actionStatus, "blocked");
  assert.equal(handoff.blockerAlias, "unknown_controlled_smoke_operator_action_alias");
  assert.equal(handoff.remediationAlias, "unexpected_operator_action_alias");
  assert.equal(handoff.ownerHandoffLimits.some((item) => item.owner === "admin_operator"), true);
  assert.equal(handoff.doNotDispatchUntil.includes("稳定 Admin owner handoff alias"), true);
});

test("ignores non-extrapolation boundary text", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorActionHandoff(readyInput({
    operatorNote: "不是 full-success，不能证明 controlled smoke pass，也不得触发 gateway ingestion",
    claim: ["cannot infer production readiness", "no authorization facts success"],
  }));

  assert.equal(handoff.actionStatus, "ready-for-operator-action");
  assert.equal(handoff.redLineFlags.length, 0);
});

test("ignores action guidance text that only states dispatch boundaries", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorActionHandoff(readyInput({
    claim: {
      nextSteps: ["不要外派为 full-success"],
      nested: ["routine sanitized action handoff"],
    },
  }));

  assert.equal(handoff.actionStatus, "ready-for-operator-action");
  assert.equal(handoff.redLineFlags.length, 0);
});
