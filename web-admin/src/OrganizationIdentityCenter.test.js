/* eslint-env jest */
import React from "react";
import i18next from "i18next";
import {render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import OrganizationIdentityCenter from "./OrganizationIdentityCenter";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";

async function useTestLanguage(language) {
  if (!i18next.isInitialized) {
    await i18next.init({
      lng: language,
      fallbackLng: "en",
      resources: {en, zh},
      ns: Object.keys(en),
      keySeparator: false,
    });
    return;
  }

  i18next.addResourceBundle("en", "general", en.general, true, true);
  i18next.addResourceBundle("zh", "general", zh.general, true, true);
  await i18next.changeLanguage(language);
}

describe("OrganizationIdentityCenter", () => {
  beforeEach(async() => {
    await useTestLanguage("zh");
  });

  test("frames organization list data as current-view identity governance context", () => {
    render(
      <MemoryRouter>
        <OrganizationIdentityCenter
          page="organizations"
          currentOrganization="All"
          total={42}
          loadedCount={10}
        >
          <div>原组织表格</div>
        </OrganizationIdentityCenter>
      </MemoryRouter>
    );

    expect(screen.getByText("企业认证中心 / 组织身份")).toBeInTheDocument();
    expect(screen.getByText("组织身份工作台")).toBeInTheDocument();
    expect(screen.getAllByText("42").length).toBeGreaterThan(0);
    expect(screen.getAllByText("10").length).toBeGreaterThan(0);
    expect(screen.getAllByText("当前列表视图").length).toBeGreaterThan(0);
    expect(screen.getByText("原组织表格")).toBeInTheDocument();
    expect(screen.getAllByText("目录质量").find(node => node.closest("a"))?.closest("a")).toHaveAttribute("href", "/organization-directory-quality");
    expect(screen.getAllByText("企业微信同步").find(node => node.closest("a"))?.closest("a")).toHaveAttribute("href", "/wecom-org-sync");
  });

  test("keeps authorization governance pages scoped to existing role and permission routes", async() => {
    await useTestLanguage("en");

    render(
      <MemoryRouter>
        <OrganizationIdentityCenter
          page="permissions"
          currentOrganization="team-alpha"
          total={7}
          loadedCount={7}
        >
          <div>Original permission table</div>
        </OrganizationIdentityCenter>
      </MemoryRouter>
    );

    expect(screen.getByText("Enterprise Identity Domain")).toBeInTheDocument();
    expect(screen.getAllByText("Current list view").length).toBeGreaterThan(0);
    expect(screen.getByText("Original permission table")).toBeInTheDocument();
    expect(screen.getAllByText("Roles").find(node => node.closest("a"))?.closest("a")).toHaveAttribute("href", "/roles");
    expect(screen.getAllByText("Permissions").find(node => node.closest("a"))?.closest("a")).toHaveAttribute("href", "/permissions");
    expect(screen.getAllByText("No backend-wide totals").length).toBeGreaterThan(0);
  });

  test("falls back to all scope and placeholder counts when list totals are not loaded", async() => {
    await useTestLanguage("en");

    render(
      <MemoryRouter>
        <OrganizationIdentityCenter page="users">
          <div>User table loading</div>
        </OrganizationIdentityCenter>
      </MemoryRouter>
    );

    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("User table loading")).toBeInTheDocument();
  });
});
