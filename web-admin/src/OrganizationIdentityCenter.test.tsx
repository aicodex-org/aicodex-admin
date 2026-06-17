/* eslint-env jest */
import {afterAll, beforeAll, expect, jest} from "@jest/globals";
import React from "react";
import i18next from "i18next";
import {render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import OrganizationIdentityCenter, {organizationIdentityWorkbenchProfiles} from "./OrganizationIdentityCenter";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";

type OrganizationIdentityPage = "organizations" | "users" | "roles" | "permissions";
type TestLanguage = "en" | "zh";

const differentiatedCopy: Record<OrganizationIdentityPage, {
  titleZh: string;
  summaryZh: string;
  actionZh: string;
  riskZh: string;
}> = {
  organizations: {
    titleZh: "组织主数据工作台",
    summaryZh: "组织树质量",
    actionZh: "检查目录质量",
    riskZh: "孤立组织节点",
  },
  users: {
    titleZh: "账号生命周期工作台",
    summaryZh: "账号完整度",
    actionZh: "导入用户",
    riskZh: "异常账号",
  },
  roles: {
    titleZh: "角色授权工作台",
    summaryZh: "成员绑定",
    actionZh: "审查高权限角色",
    riskZh: "空角色",
  },
  permissions: {
    titleZh: "权限目录工作台",
    summaryZh: "敏感权限",
    actionZh: "核对权限目录",
    riskZh: "未使用权限",
  },
};

const requiredGeneralKeys = [
  "Organization master data workbench",
  "Account lifecycle workbench",
  "Role authorization workbench",
  "Permission catalog workbench",
  "Directory boundary",
  "Organization tree quality",
  "Sync sources",
  "Lifecycle scope",
  "Verification state",
  "Account completeness",
  "Privileged role watch",
  "Member bindings",
  "Separation of duties",
  "Sensitive permissions",
  "Role references",
  "Review directory quality",
  "Inspect organization tree",
  "Review sync sources",
  "Import users",
  "Review verification state",
  "Review sync quality",
  "Review privileged roles",
  "Review permission coverage",
  "Review member bindings",
  "Review permission catalog",
  "Review role references",
  "Review permission granularity",
  "Orphan organization nodes",
  "Empty organization nodes",
  "Mapping risk",
  "Anomalous accounts",
  "Unverified accounts",
  "Import sync drift",
  "Empty roles",
  "Orphan roles",
  "Separation of duties risk",
  "Unused permissions",
  "Permission granularity drift",
];

async function useTestLanguage(language: TestLanguage) {
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

function renderWorkbench(page: OrganizationIdentityPage) {
  return render(
    <MemoryRouter>
      <OrganizationIdentityCenter
        page={page}
        currentOrganization={page === "users" ? "team-alpha" : "All"}
        total={42}
        loadedCount={10}
      >
        <div>{`${page} table remains reachable`}</div>
      </OrganizationIdentityCenter>
    </MemoryRouter>
  );
}

describe("OrganizationIdentityCenter", () => {
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeAll(() => {
    const originalConsoleError = console.error;
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((...args: Parameters<typeof console.error>) => {
      if (typeof args[0] === "string" && args[0].includes("ReactDOM.render is no longer supported in React 18")) {
        return;
      }
      originalConsoleError(...args);
    });
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(async() => {
    await useTestLanguage("zh");
  });

  test("keeps four entity profiles on distinct layout and governance keys", () => {
    const profiles = Object.values(organizationIdentityWorkbenchProfiles);

    expect(new Set(profiles.map(profile => profile.layoutKind)).size).toBe(4);
    expect(new Set(profiles.map(profile => profile.titleKey)).size).toBe(4);
    expect(new Set(profiles.map(profile => profile.metrics.map(metric => metric.key).join("|"))).size).toBe(4);
    expect(new Set(profiles.map(profile => profile.actions.map(action => action.key).join("|"))).size).toBe(4);
    expect(new Set(profiles.map(profile => profile.risks.map(risk => risk.key).join("|"))).size).toBe(4);
  });

  test("renders differentiated compact workbench copy for each identity entity", () => {
    Object.entries(differentiatedCopy).forEach(([page, copy]) => {
      const view = renderWorkbench(page as OrganizationIdentityPage);

      expect(view.getByText(copy.titleZh)).not.toBeNull();
      expect(view.getAllByText(copy.summaryZh).length).toBeGreaterThan(0);
      expect(view.getByText(copy.actionZh)).not.toBeNull();
      expect(view.getAllByText(copy.riskZh).length).toBeGreaterThan(0);
      expect(view.getByText(`${page} table remains reachable`)).not.toBeNull();
      expect(view.queryByText("原列表仍是操作入口")).toBeNull();
      expect(view.queryByText("不包装成全量事实")).toBeNull();

      view.unmount();
    });
  });

  test("does not reuse role governance copy for the permission catalog page", async() => {
    await useTestLanguage("en");

    const view = renderWorkbench("permissions");

    expect(view.getByText("Permission catalog workbench")).not.toBeNull();
    expect(view.getAllByText("Sensitive permissions").length).toBeGreaterThan(0);
    expect(view.getByText("Review permission catalog")).not.toBeNull();
    expect(view.queryByText("Role authorization workbench")).toBeNull();
    expect(view.getByText("permissions table remains reachable")).not.toBeNull();

    view.unmount();
  });

  test("keeps existing list actions reachable through entity-specific links", () => {
    const view = renderWorkbench("organizations");

    const directoryLink = view.getByText("检查目录质量").closest("a");
    expect(directoryLink?.getAttribute("href")).toBe("/organization-directory-quality");
    expect(view.getByText("organizations table remains reachable")).not.toBeNull();

    view.unmount();
  });

  test("falls back to all scope and placeholder counts while data is loading", () => {
    const organizationView = render(
      <MemoryRouter>
        <OrganizationIdentityCenter page="organizations">
          <div>Organization table loading</div>
        </OrganizationIdentityCenter>
      </MemoryRouter>
    );

    expect(organizationView.getByText("全部")).not.toBeNull();
    expect(organizationView.getAllByText("-").length).toBeGreaterThan(0);
    expect(organizationView.getByText("Organization table loading")).not.toBeNull();
    organizationView.unmount();

    const userView = render(
      <MemoryRouter>
        <OrganizationIdentityCenter page="users">
          <div>User table loading</div>
        </OrganizationIdentityCenter>
      </MemoryRouter>
    );

    expect(userView.getAllByText("-").length).toBeGreaterThanOrEqual(2);
    expect(userView.getByText("User table loading")).not.toBeNull();
    userView.unmount();
  });

  test("keeps zh and en locale keys complete for entity workbench copy", () => {
    requiredGeneralKeys.forEach(key => {
      expect(Object.prototype.hasOwnProperty.call(zh.general, key)).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(en.general, key)).toBe(true);
      expect(zh.general[key as keyof typeof zh.general]).not.toBe(key);
      expect(en.general[key as keyof typeof en.general]).not.toBe("");
    });
  });
});
