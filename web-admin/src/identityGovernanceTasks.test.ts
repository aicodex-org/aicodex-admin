import {describe, expect, test} from "vitest";
import {
  buildGovernanceTasks,
  filterGovernanceTasks
} from "./identityGovernanceTasks";

type GovernanceTask = import("./identityGovernanceTasks").GovernanceTask;
type GovernanceTaskSourceDataset = import("./identityGovernanceTasks").GovernanceTaskSourceDataset;

const applications: GovernanceTaskSourceDataset = {
  pagePath: "/applications",
  rows: [
    {
      owner: "admin",
      organization: "built-in",
      name: "callback-gap",
      displayName: "Callback Gap",
      clientId: "callback-client",
      redirectUris: [],
      scopes: ["openid"],
      providers: [],
    },
    {
      owner: "admin",
      organization: "built-in",
      name: "scope-gap",
      displayName: "Scope Gap",
      clientId: "",
      redirectUris: ["https://private.example.invalid/callback"],
      scopes: [],
      providers: [{name: "oidc-main", category: "OAuth"}],
    },
  ],
  totalRows: 8,
  filterSummary: "enabled applications",
};

const providers: GovernanceTaskSourceDataset = {
  pagePath: "/providers",
  rows: [
    {
      owner: "admin",
      name: "oidc-main",
      displayName: "OIDC Main",
      category: "OAuth",
      type: "OIDC",
      clientId: "",
      clientSecret: "provider-secret",
      providerUrl: "https://idp.example.invalid/oauth",
      lastSyncStatus: "failed",
    },
  ],
  totalRows: 1,
};

const users: GovernanceTaskSourceDataset = {
  pagePath: "/users",
  rows: [
    {
      owner: "built-in",
      name: "orphan-user",
      displayName: "Orphan User",
      signupApplication: "",
      groups: [],
      roles: [],
    },
  ],
  totalRows: 1,
};

const roles: GovernanceTaskSourceDataset = {
  pagePath: "/roles",
  rows: [
    {
      owner: "built-in",
      name: "super-admin",
      displayName: "Super Admin",
      users: ["built-in/alice"],
      isEnabled: true,
    },
  ],
  totalRows: 1,
};

const tokens: GovernanceTaskSourceDataset = {
  pagePath: "/tokens",
  rows: [
    {
      owner: "admin",
      name: "token-risk",
      accessToken: "raw-access-token",
      application: "",
      user: "",
      expiresIn: 0,
    },
  ],
  totalRows: 1,
};

const records: GovernanceTaskSourceDataset = {
  pagePath: "/records",
  rows: [
    {
      id: 42,
      organization: "built-in",
      user: "admin",
      action: "sync-provider",
      requestUri: "/api/sync/feishu?token=raw-token",
      statusCode: 500,
    },
  ],
  totalRows: 1,
};

const agents: GovernanceTaskSourceDataset = {
  pagePath: "/agents",
  rows: [
    {
      owner: "built-in",
      name: "agent-gap",
      displayName: "Gateway Agent",
      application: "",
      url: "",
      token: "agent-secret-token",
    },
  ],
  totalRows: 1,
};

function getByType(tasks: GovernanceTask[], type: GovernanceTask["taskType"]): GovernanceTask {
  const task = tasks.find(item => item.taskType === type);
  if (!task) {
    throw new Error(`Missing task type: ${type}`);
  }
  return task;
}

describe("identity governance task classifiers", () => {
  test("builds all P0 task types from visible read-only sources", () => {
    const tasks = buildGovernanceTasks({
      applications,
      providers,
      users,
      roles,
      tokens,
      records,
      agents,
    });

    expect(Array.from(new Set(tasks.map(item => item.taskType)))).toEqual(expect.arrayContaining([
      "sync_failed",
      "orphan_account",
      "privileged_role",
      "application_incomplete",
      "abnormal_token",
      "callback_missing",
      "provider_binding_risk",
      "gateway_mapping_gap",
    ]));
    expect(getByType(tasks, "callback_missing")).toMatchObject({
      severity: "high",
      domain: "application_access",
      impactObject: {
        displayName: "Callback Gap",
        to: "/applications/built-in/callback-gap",
      },
      suggestedAction: {
        to: "/applications/built-in/callback-gap",
      },
    });
    expect(getByType(tasks, "privileged_role")).toMatchObject({
      severity: "high",
      domain: "authorization_governance",
      impactObject: {
        to: "/roles/built-in/super-admin",
      },
    });
    expect(getByType(tasks, "abnormal_token")).toMatchObject({
      severity: "high",
      domain: "audit_operations",
      evidenceEntry: {
        to: "/tokens",
      },
    });
    expect(getByType(tasks, "gateway_mapping_gap")).toMatchObject({
      severity: "high",
      domain: "llm_ai_gateway",
      suggestedAction: {
        to: "/agents/built-in/agent-gap",
      },
    });
    expect(tasks.every(item => item.source.kind !== "global_aggregation")).toBe(true);
    expect(JSON.stringify(tasks)).not.toContain("provider-secret");
    expect(JSON.stringify(tasks)).not.toContain("raw-access-token");
    expect(JSON.stringify(tasks)).not.toContain("agent-secret-token");
    expect(JSON.stringify(tasks)).not.toContain("idp.example.invalid");
    expect(JSON.stringify(tasks)).not.toContain("raw-token");
  });

  test("marks unavailable sources as cannot-infer review tasks without inventing global facts", () => {
    const tasks = buildGovernanceTasks({
      providers: {
        pagePath: "/providers",
        errorMessage: "request failed",
      },
    });

    expect(tasks).toEqual([
      expect.objectContaining({
        taskType: "provider_binding_risk",
        status: "cannot_infer",
        severity: "info",
        source: expect.objectContaining({
          kind: "read_only_review",
          pagePath: "/providers",
        }),
        suggestedAction: expect.objectContaining({
          to: "/providers",
        }),
      }),
    ]);
  });

  test("filters by type severity status source scope impact object and keyword", () => {
    const tasks = buildGovernanceTasks({
      applications,
      tokens,
      agents,
    });

    expect(filterGovernanceTasks(tasks, {type: "callback_missing"}).map(item => item.taskType))
      .toEqual(["callback_missing"]);
    expect(filterGovernanceTasks(tasks, {severity: "high"}).every(item => item.severity === "high")).toBe(true);
    expect(filterGovernanceTasks(tasks, {status: "pending_review"}).every(item => item.status === "pending_review")).toBe(true);
    expect(filterGovernanceTasks(tasks, {sourceScope: "current_object"}).every(item => item.source.kind === "current_object")).toBe(true);
    expect(filterGovernanceTasks(tasks, {impactObjectType: "Application"}).every(item => item.impactObject.type === "Application")).toBe(true);
    expect(filterGovernanceTasks(tasks, {keyword: "token risk"}).map(item => item.taskType)).toEqual(["abnormal_token"]);
  });
});
