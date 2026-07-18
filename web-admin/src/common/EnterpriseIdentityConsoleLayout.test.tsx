import {describe, expect, test} from "vitest";
import React from "react";
import {render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {
  EnterpriseIdentityActionGrid,
  EnterpriseIdentityConsolePage,
  EnterpriseIdentityRiskList,
  EnterpriseIdentitySection,
  EnterpriseIdentityStatusGrid,
  EnterpriseIdentitySummaryStrip
} from "./EnterpriseIdentityConsoleLayout";

describe("EnterpriseIdentityConsoleLayout", () => {
  test("renders a console page with summary, status, risk and action regions", () => {
    const view = render(
      <MemoryRouter>
        <EnterpriseIdentityConsolePage
          eyebrow="身份控制台 / 总览"
          title="身份治理总览"
          description="组织、认证源、应用接入和审计风险"
          actions={<button type="button">刷新</button>}
          spotlight={<aside>2 项待核对</aside>}
        >
          <EnterpriseIdentitySummaryStrip items={[
            {key: "sources", label: "认证源", value: 3, description: "2 个已启用", tone: "success"},
            {key: "risks", label: "待处理", value: 1, description: "需要审计核对", tone: "warning"},
          ]} />
          <EnterpriseIdentityStatusGrid items={[
            {
              key: "wecom",
              title: "企业微信",
              description: "组织同步和登录入口",
              code: "aicodex-admin",
              metricValue: "100%",
              metricLabel: "配置完整",
              tags: [{key: "ready", label: "已启用", tone: "success"}],
              actions: [{key: "config", label: "进入配置", to: "/providers"}],
            },
          ]} />
          <EnterpriseIdentitySection title="风险待办" description="按审计证据核对，不触发执行">
            <EnterpriseIdentityRiskList items={[
              {
                key: "audit",
                title: "最近失败",
                description: "进入审计记录核对",
                tone: "warning",
                badge: "待巡检",
                action: {key: "records", label: "查看审计", to: "/records"},
              },
            ]} />
          </EnterpriseIdentitySection>
          <EnterpriseIdentityActionGrid items={[
            {key: "apps", label: "应用接入", description: "OAuth/OIDC client", to: "/applications"},
          ]} />
        </EnterpriseIdentityConsolePage>
      </MemoryRouter>
    );

    expect(view.getByText("身份控制台 / 总览")).not.toBeNull();
    expect(view.getByText("身份治理总览")).not.toBeNull();
    expect(view.getByText("2 项待核对")).not.toBeNull();
    expect(view.container.querySelector(".admin-page-scroll-shell.enterprise-identity-console")).not.toBeNull();
    expect(view.container.querySelector(".enterprise-identity-console-body .enterprise-identity-summary-strip")).not.toBeNull();
    expect(view.getByText("认证源")).not.toBeNull();
    expect(view.getByText("企业微信")).not.toBeNull();
    expect(view.getByText("aicodex-admin")).not.toBeNull();
    expect(view.getByText("风险待办")).not.toBeNull();
    expect(view.getByText("应用接入").closest("a")?.getAttribute("href")).toBe("/applications");
    expect(view.getByText("进入配置").closest("a")?.getAttribute("href")).toBe("/providers");
    expect(view.getByText("查看审计").closest("a")?.getAttribute("href")).toBe("/records");
  });
});
