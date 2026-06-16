const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createWecomSourceReadinessHandoff,
} = require("./wecomSourceReadinessHandoff");

function configResponse(overrides = {}) {
  return {
    status: "ok",
    data: {
      organization: "wecom-redacted",
      isConfigured: true,
      config: {
        organization: "wecom-redacted",
        corpId: "ww-redacted",
        addressBookSecret: "***",
        isEnabled: true,
      },
    },
    ...overrides,
  };
}

function runsResponse(runs = [], overrides = {}) {
  return {
    status: "ok",
    data: runs,
    ...overrides,
  };
}

function run(status, overrides = {}) {
  return {
    name: `${status}-run`,
    status,
    startedAt: "2026-06-13T01:00:00.000Z",
    finishedAt: "2026-06-13T01:05:00.000Z",
    ...overrides,
  };
}

test("classifies missing sync config without echoing source identifiers", () => {
  const handoff = createWecomSourceReadinessHandoff({
    configResponse: configResponse({data: {organization: "wecom-redacted", isConfigured: false, config: {organization: "wecom-redacted"}}}),
    runsResponse: runsResponse([]),
  });

  assert.equal(handoff.status, "blocked");
  assert.deepEqual(handoff.aliases, ["wecom_config_missing"]);
  assert.equal(handoff.evidenceShapeVersion, "wecom-source-readiness-handoff/v1");
  assert.equal(JSON.stringify(handoff).includes("ww-redacted"), false);
  assert.equal(Object.keys(handoff).sort().join(","), [
    "aliases",
    "evidenceShapeVersion",
    "minimumUnblockConditions",
    "ownerHandoffs",
    "safeNextActions",
    "status",
  ].sort().join(","));
});

test("classifies disabled sync config before run evidence", () => {
  const disabled = configResponse({
    data: {
      organization: "wecom-redacted",
      isConfigured: true,
      config: {organization: "wecom-redacted", corpId: "ww-redacted", addressBookSecret: "***", isEnabled: false},
    },
  });

  const handoff = createWecomSourceReadinessHandoff({
    configResponse: disabled,
    runsResponse: runsResponse([run("succeeded")]),
  });

  assert.equal(handoff.status, "blocked");
  assert.deepEqual(handoff.aliases, ["wecom_config_disabled"]);
  assert.equal(handoff.ownerHandoffs.some(item => item.owner === "admin_source_owner"), true);
});

test("requires credential verification when no successful run or explicit verification exists", () => {
  const handoff = createWecomSourceReadinessHandoff({
    configResponse: configResponse(),
    runsResponse: runsResponse([]),
  });

  assert.equal(handoff.status, "blocked");
  assert.deepEqual(handoff.aliases, ["wecom_credential_not_verified"]);
  assert.equal(handoff.safeNextActions.some(action => action.includes("config/test")), true);
});

test("classifies latest failed run separately from missing recent success", () => {
  const handoff = createWecomSourceReadinessHandoff({
    configResponse: configResponse(),
    runsResponse: runsResponse([run("failed", {errorText: "redacted failure"})]),
    connectionTestResponse: {status: "ok", data: {credentialVerified: true}},
  });

  assert.equal(handoff.status, "blocked");
  assert.deepEqual(handoff.aliases, ["wecom_latest_run_failed"]);
  assert.equal(JSON.stringify(handoff).includes("redacted failure"), false);
});

test("classifies active run as not ready without suggesting manual trigger", () => {
  const handoff = createWecomSourceReadinessHandoff({
    configResponse: configResponse(),
    runsResponse: runsResponse([run("running", {finishedAt: ""}), run("succeeded")]),
    connectionTestResponse: {status: "ok", data: {credentialVerified: true}},
  });

  assert.equal(handoff.status, "not_ready");
  assert.deepEqual(handoff.aliases, ["wecom_run_active"]);
  assert.equal(handoff.safeNextActions.some(action => action.includes("不要触发") && action.includes("手动触发同步")), true);
});

test("classifies missing recent success when latest success is too old", () => {
  const handoff = createWecomSourceReadinessHandoff({
    configResponse: configResponse(),
    runsResponse: runsResponse([run("succeeded", {finishedAt: "2026-06-01T00:00:00.000Z"})]),
  }, {
    now: "2026-06-13T00:00:00.000Z",
    recentSuccessWindowHours: 72,
  });

  assert.equal(handoff.status, "blocked");
  assert.deepEqual(handoff.aliases, ["wecom_no_recent_success"]);
});

test("returns ready only for enabled config and recent successful source run", () => {
  const handoff = createWecomSourceReadinessHandoff({
    configResponse: configResponse(),
    runsResponse: runsResponse([run("succeeded", {finishedAt: "2026-06-12T23:30:00.000Z"})]),
  }, {
    now: "2026-06-13T00:00:00.000Z",
  });

  assert.equal(handoff.status, "ready");
  assert.deepEqual(handoff.aliases, ["wecom_source_ready"]);
  assert.equal(handoff.minimumUnblockConditions.length, 0);
});

test("fails closed when unmasked secrets or private evidence are provided", () => {
  const handoff = createWecomSourceReadinessHandoff({
    configResponse: configResponse({
      data: {
        organization: "wecom-redacted",
        isConfigured: true,
        config: {
          organization: "wecom-redacted",
          corpId: "ww-redacted",
          addressBookSecret: "real-secret-value",
          isEnabled: true,
        },
      },
    }),
    runsResponse: runsResponse([]),
  });

  assert.equal(handoff.status, "blocked");
  assert.deepEqual(handoff.aliases, ["sanitization_failed"]);
  assert.equal(JSON.stringify(handoff).includes("real-secret-value"), false);
});
