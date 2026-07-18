import {describe, expect, test} from "vitest";
import React from "react";
import {render} from "@testing-library/react";
import ApplicationIdentitySourceBindings, {
  buildIdentitySourceBindingRows,
  updateIdentitySourceBindingTarget
} from "./ApplicationIdentitySourceBindings";

const organizations = [
  {name: "wecom-wwe7e01c69367e67bf", displayName: "WeCom Org"},
  {name: "feishu-test", displayName: "Feishu Test"},
];

const providers = [
  {name: "wecom-internal", category: "OAuth", type: "WeCom", displayName: "Enterprise WeCom"},
  {name: "lark-main", category: "OAuth", type: "Lark", displayName: "Feishu"},
  {name: "sms-main", category: "SMS", type: "Sms"},
];

describe("ApplicationIdentitySourceBindings", () => {
  test("builds login provider rows with target organization and missing target state", () => {
    const rows = buildIdentitySourceBindingRows(
      {
        organization: "wecom-wwe7e01c69367e67bf",
        providers: [
          {name: "wecom-internal"},
          {name: "lark-main", targetOrganization: "feishu-test"},
          {name: "sms-main"},
        ],
      },
      providers
    );

    expect(rows.map(row => ({
      name: row.name,
      bindingIndex: row.bindingIndex,
      targetOrganization: row.targetOrganization,
      effectiveOrganization: row.effectiveOrganization,
      isTargetOrganizationMissing: row.isTargetOrganizationMissing,
    }))).toEqual([
      {
        name: "wecom-internal",
        bindingIndex: 0,
        targetOrganization: "",
        effectiveOrganization: "",
        isTargetOrganizationMissing: true,
      },
      {
        name: "lark-main",
        bindingIndex: 1,
        targetOrganization: "feishu-test",
        effectiveOrganization: "feishu-test",
        isTargetOrganizationMissing: false,
      },
    ]);
  });

  test("updates provider target organization without mutating original bindings", () => {
    const bindings = [{name: "lark-main", targetOrganization: ""}];
    const updated = updateIdentitySourceBindingTarget(bindings, 0, "feishu-test");

    expect(updated).toEqual([{name: "lark-main", targetOrganization: "feishu-test"}]);
    expect(bindings).toEqual([{name: "lark-main", targetOrganization: ""}]);
  });

  test("renders empty state when no login provider is bound", () => {
    const view = render(
      <ApplicationIdentitySourceBindings
        application={{organization: "built-in", providers: [{name: "sms-main"}]}}
        providers={providers}
        organizations={organizations}
        onChange={() => undefined}
      />
    );

    expect(view.getByText("暂无可配置的登录身份源")).not.toBeNull();
  });

  test("renders target organization and missing target markers without exposing secrets", () => {
    const view = render(
      <ApplicationIdentitySourceBindings
        application={{
          organization: "wecom-wwe7e01c69367e67bf",
          providers: [
            {name: "wecom-internal"},
            {name: "lark-main", targetOrganization: "feishu-test"},
          ],
        }}
        providers={providers}
        organizations={organizations}
        onChange={() => undefined}
      />
    );

    expect(view.getByText("Provider 身份源目标组织")).not.toBeNull();
    expect(view.getByText("wecom-internal")).not.toBeNull();
    expect(view.getByText("lark-main")).not.toBeNull();
    expect(view.getAllByText("目标组织未配置").length).toBeGreaterThan(0);
    expect(view.getAllByText("feishu-test").length).toBeGreaterThan(0);
    expect(view.queryByText("沿用应用组织")).toBeNull();
    expect(view.queryByText(/secret|token|cookie/i)).toBeNull();
  });

  test("excludes retired and mislabeled Web3 providers from identity source rows", () => {
    const rows = buildIdentitySourceBindingRows(
      {
        providers: [
          {name: "category-wallet"},
          {name: "mislabeled-wallet"},
          {name: "saml-mislabeled-wallet"},
          {name: "lark-main", targetOrganization: "feishu-test"},
        ],
      },
      [
        {name: "category-wallet", category: "Web3", type: "Custom"},
        {name: "mislabeled-wallet", category: "OAuth", type: "MetaMask"},
        {name: "saml-mislabeled-wallet", category: "SAML", type: "Web3Onboard"},
        ...providers,
      ]
    );

    expect(rows.map(row => row.name)).toEqual(["lark-main"]);
  });

  test("does not advertise Web3 as a configurable login identity source", () => {
    const view = render(
      <ApplicationIdentitySourceBindings
        application={{providers: []}}
        providers={[]}
        organizations={organizations}
        onChange={() => undefined}
      />
    );

    expect(view.queryByText(/Web3/i)).toBeNull();
  });
});
