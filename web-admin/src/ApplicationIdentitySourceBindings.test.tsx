/* eslint-env jest */
import {expect} from "@jest/globals";
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
  test("builds login provider rows with target organization and fallback organization", () => {
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
      usesFallback: row.usesFallback,
    }))).toEqual([
      {
        name: "wecom-internal",
        bindingIndex: 0,
        targetOrganization: "",
        effectiveOrganization: "wecom-wwe7e01c69367e67bf",
        usesFallback: true,
      },
      {
        name: "lark-main",
        bindingIndex: 1,
        targetOrganization: "feishu-test",
        effectiveOrganization: "feishu-test",
        usesFallback: false,
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

  test("renders target organization and fallback markers without exposing secrets", () => {
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
    expect(view.getByText("沿用应用组织")).not.toBeNull();
    expect(view.getAllByText("feishu-test").length).toBeGreaterThan(0);
    expect(view.queryByText(/secret|token|cookie/i)).toBeNull();
  });
});
