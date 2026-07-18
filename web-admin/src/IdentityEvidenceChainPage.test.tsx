import {afterEach, beforeEach, describe, expect, test, vi} from "vitest";
import React from "react";
import {cleanup, fireEvent, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import i18next from "i18next";
import IdentityEvidenceChainPage from "./IdentityEvidenceChainPage";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";

const adminAccount = {
  owner: "built-in",
  name: "admin",
  isAdmin: true,
  organization: {
    name: "built-in",
    displayName: "Built In",
  },
};

async function useTestLanguage(language: string) {
  if (!i18next.isInitialized) {
    await i18next.init({
      lng: language,
      fallbackLng: "en",
      resources: {en, zh},
      ns: Object.keys(en),
      keySeparator: false,
    });
  }

  i18next.addResourceBundle("en", "identityEvidenceChain", en.identityEvidenceChain, true, true);
  i18next.addResourceBundle("zh", "identityEvidenceChain", zh.identityEvidenceChain, true, true);
  i18next.addResourceBundle("en", "identityAssetRelationship", en.identityAssetRelationship, true, true);
  i18next.addResourceBundle("zh", "identityAssetRelationship", zh.identityAssetRelationship, true, true);
  await i18next.changeLanguage(language);
}

describe("IdentityEvidenceChainPage", () => {
  let consoleErrorSpy: {mockRestore: () => void};

  beforeEach(async() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      throw new Error(args.map(item => String(item)).join(" "));
    });
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
    await useTestLanguage("zh");
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
  });

  test("renders an object-first evidence chain console without KPI cards", () => {
    const view = render(
      <MemoryRouter>
        <IdentityEvidenceChainPage account={adminAccount} />
      </MemoryRouter>
    );

    expect(view.getByText("身份资产关系")).not.toBeNull();
    expect(view.getAllByText("应用接入").length).toBeGreaterThan(0);
    expect(view.getAllByText("认证源").length).toBeGreaterThan(0);
    expect(view.getByText("组织身份")).not.toBeNull();
    expect(view.getByText("Gateway / LLM AI")).not.toBeNull();
    expect(view.getByText("关系与证据链")).not.toBeNull();
    expect(view.getByText("审计证据入口")).not.toBeNull();
    expect(view.getByText("风险处理")).not.toBeNull();
    expect(view.getByText("当前对象信息不足")).not.toBeNull();
    expect(view.container.querySelector(".enterprise-identity-status-card")).toBeNull();
  });

  test("selects an asset node and routes evidence entries to existing read-only pages", () => {
    const view = render(
      <MemoryRouter>
        <IdentityEvidenceChainPage account={adminAccount} />
      </MemoryRouter>
    );

    const gatewayButton = view.getByText("Gateway / LLM AI").closest("button");
    expect(gatewayButton).not.toBeNull();
    fireEvent.click(gatewayButton as HTMLButtonElement);

    expect(view.getByText("Gateway mapping")).not.toBeNull();
    expect(view.getAllByText("网关身份映射").length).toBeGreaterThan(0);
    expect(view.getByText("运行健康")).not.toBeNull();
    expect(view.getAllByText("API 网关映射").some((item: HTMLElement) => item.closest("a")?.getAttribute("href") === "/platform-api-mappings")).toBe(true);
    expect(view.getAllByText("审计记录").some((item: HTMLElement) => item.closest("a")?.getAttribute("href") === "/records")).toBe(true);
    expect(view.getAllByText("令牌管理").some((item: HTMLElement) => item.closest("a")?.getAttribute("href") === "/tokens")).toBe(true);
  });

  test("selects the requested asset from access wizard query context", () => {
    const view = render(
      <MemoryRouter initialEntries={["/identity-assets?asset=auth-source&object=Provider%3Aadmin%2Foidc-main"]}>
        <IdentityEvidenceChainPage
          account={adminAccount}
          location={{search: "?asset=auth-source&object=Provider%3Aadmin%2Foidc-main"}}
        />
      </MemoryRouter>
    );

    expect(view.getByText("Provider")).not.toBeNull();
    expect(view.getByText("auth-source")).not.toBeNull();
    const activeSourceButton = view.getAllByText("认证源")
      .map((item: HTMLElement) => item.closest("button"))
      .find((button: HTMLButtonElement | null) => button?.className.includes("identity-evidence-chain-selector-item-active"));
    expect(activeSourceButton?.className).toContain("identity-evidence-chain-selector-item-active");
  });

  test("renders empty and permission states without leaking asset names", () => {
    const view = render(
      <MemoryRouter>
        <IdentityEvidenceChainPage account={adminAccount} initialAssets={[]} />
      </MemoryRouter>
    );

    expect(view.getByText("当前范围暂无身份资产")).not.toBeNull();

    view.rerender(
      <MemoryRouter>
        <IdentityEvidenceChainPage
          account={{...adminAccount, owner: "demo", isAdmin: false}}
        />
      </MemoryRouter>
    );

    expect(view.getByText("无权查看身份资产关系")).not.toBeNull();
    expect(view.queryByText("Gateway / LLM AI")).toBeNull();
  });
});
