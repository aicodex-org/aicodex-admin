/* eslint-env jest */
import React from "react";
import {render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import i18next from "i18next";
import AuditOperationsCenter, {buildAuditOperationsSummary} from "./AuditOperationsCenter";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";

const sampleRecords = [
  {
    id: 1,
    statusCode: 500,
    action: "login",
    response: "internal error",
    object: "{\"clientSecret\":\"hidden\"}",
  },
  {
    id: 2,
    statusCode: 200,
    action: "update-user",
  },
];

const sampleTokens = [
  {
    name: "token-risk",
    accessToken: "sensitive-access-token-value",
    expiresIn: 3600,
  },
];

const sampleVerifications = [
  {
    name: "verification-unused",
    code: "123456",
    receiver: "person@example.com",
    isUsed: false,
  },
  {
    name: "verification-used",
    code: "654321",
    receiver: "used@example.com",
    isUsed: true,
  },
];

describe("AuditOperationsCenter", () => {
  let consoleErrorSpy;

  beforeEach(async() => {
    // eslint-disable-next-line no-console
    const originalConsoleError = console.error;
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((...args) => {
      if (typeof args[0] === "string" && args[0].includes("ReactDOM.render is no longer supported in React 18")) {
        return;
      }

      // eslint-disable-next-line no-console
      originalConsoleError(...args);
    });

    if (!i18next.isInitialized) {
      await i18next.init({
        lng: "zh",
        fallbackLng: "en",
        resources: {en, zh},
        ns: Object.keys(en),
        keySeparator: false,
      });
      return;
    }

    i18next.addResourceBundle("en", "general", en.general, true, true);
    i18next.addResourceBundle("zh", "general", zh.general, true, true);
    await i18next.changeLanguage("zh");
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("builds current-view audit operations summary without exposing secrets", () => {
    const summary = buildAuditOperationsSummary({
      activeKey: "tokens",
      totals: {
        sessions: 4,
        records: 18,
        tokens: 1,
        verifications: 2,
      },
      records: sampleRecords,
      tokens: sampleTokens,
      verifications: sampleVerifications,
    });

    expect(summary.activeEntry).toMatchObject({
      key: "tokens",
      labelKey: "Token Review",
      total: 1,
    });
    expect(summary.entries.map(entry => entry.key)).toEqual(["sessions", "records", "tokens", "verifications"]);
    expect(summary.riskItems).toEqual(expect.arrayContaining([
      expect.objectContaining({key: "record-errors", count: 1}),
      expect.objectContaining({key: "visible-tokens", count: 1}),
      expect.objectContaining({key: "unused-verifications", count: 1}),
    ]));
    expect(JSON.stringify(summary)).not.toContain("sensitive-access-token-value");
    expect(JSON.stringify(summary)).not.toContain("123456");
    expect(JSON.stringify(summary)).not.toContain("person@example.com");
    expect(JSON.stringify(summary)).not.toContain("clientSecret");
  });

  test("normalizes unsupported active keys and ignores malformed row fields", () => {
    const summary = buildAuditOperationsSummary({
      activeKey: "unknown",
      sessions: [{id: "session-1"}],
      records: [null, {statusCode: 404}, {statusCode: "pending"}],
      verifications: ["bad-row", {isUsed: false, code: "654321"}],
    });

    expect(summary.activeEntry.key).toBe("records");
    expect(summary.entries.find(entry => entry.key === "sessions").total).toBe(1);
    expect(summary.riskItems).toEqual(expect.arrayContaining([
      expect.objectContaining({key: "record-errors", count: 1}),
      expect.objectContaining({key: "unused-verifications", count: 1}),
      expect.objectContaining({key: "active-sessions", count: 1}),
    ]));
    expect(JSON.stringify(summary)).not.toContain("654321");
  });

  test("treats malformed current-view collections as empty totals", () => {
    const summary = buildAuditOperationsSummary({
      records: "not-array",
      tokens: "not-array",
      verifications: {isUsed: false},
    });

    expect(summary.entries.find(entry => entry.key === "records").total).toBe(0);
    expect(summary.entries.find(entry => entry.key === "tokens").total).toBe(0);
    expect(summary.entries.find(entry => entry.key === "verifications").total).toBe(0);
    expect(summary.riskItems).toEqual([
      expect.objectContaining({key: "current-view-clean", count: 0}),
    ]);
  });

  test("renders audit operations workbench entries and current-view risk copy", () => {
    render(
      <MemoryRouter>
        <AuditOperationsCenter
          activeKey="records"
          loading={false}
          totals={{
            sessions: 4,
            records: 18,
            tokens: 1,
            verifications: 2,
          }}
          records={sampleRecords}
          tokens={sampleTokens}
          verifications={sampleVerifications}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("审计运维中心")).toBeInTheDocument();
    expect(screen.getByText("当前核对域")).toBeInTheDocument();
    expect(screen.getAllByText("审计记录").some(item => item.closest("a")?.getAttribute("href") === "/records")).toBe(true);
    expect(screen.getAllByText("会话核对").some(item => item.closest("a")?.getAttribute("href") === "/sessions")).toBe(true);
    expect(screen.getAllByText("令牌核对").some(item => item.closest("a")?.getAttribute("href") === "/tokens")).toBe(true);
    expect(screen.getAllByText("验证核对").some(item => item.closest("a")?.getAttribute("href") === "/verifications")).toBe(true);
    expect(screen.getByText("失败状态核对")).toBeInTheDocument();
    expect(screen.getByText("令牌可见性核对")).toBeInTheDocument();
    expect(screen.getByText("未使用验证记录")).toBeInTheDocument();
    expect(screen.queryByText("sensitive-access-token-value")).not.toBeInTheDocument();
    expect(screen.queryByText("123456")).not.toBeInTheDocument();
    expect(screen.queryByText("person@example.com")).not.toBeInTheDocument();
  });

  test("keeps empty current-view data actionable", () => {
    render(
      <MemoryRouter>
        <AuditOperationsCenter activeKey="sessions" loading={false} totals={{sessions: 0}} />
      </MemoryRouter>
    );

    expect(screen.getByText("当前视图暂无运行态异常")).toBeInTheDocument();
    expect(screen.getAllByText("摘要来自当前筛选或分页视图").length).toBeGreaterThan(0);
    expect(screen.getAllByText("会话核对").some(item => item.closest("a")?.getAttribute("href") === "/sessions")).toBe(true);
  });
});
