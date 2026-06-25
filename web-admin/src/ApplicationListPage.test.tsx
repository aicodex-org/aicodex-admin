/* eslint-env jest */
import React from "react";
import {MemoryRouter} from "react-router-dom";
import {expect, jest} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import ApplicationListPage from "./ApplicationListPage";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import * as FormBackend from "./backend/FormBackend";
import * as Setting from "./Setting";
import EnterpriseListQueryToolbar from "./common/EnterpriseListQueryToolbar";
import ListPageTable from "./common/ListPageTable";

jest.mock("./backend/ApplicationBackend");
jest.mock("./backend/FormBackend");
jest.mock("./table/SignupTable", () => ({
  SignupTableDefaultCssMap: {},
}));
jest.mock("./TourConfig", () => ({
  getTourVisible: () => false,
  getSteps: () => [],
  getNextUrl: () => "",
  setIsTourVisible: () => undefined,
}));

type LegacyAny = any;
type TestTableElement = React.ReactElement<{
  className?: string;
  title?: () => React.ReactNode;
  pagination?: LegacyAny;
}>;

const account = {
  owner: "built-in",
  name: "admin",
  tag: "",
  isAdmin: true,
  organization: {name: "built-in"},
};

const application = {
  owner: "admin",
  organization: "built-in",
  name: "portal",
  displayName: "AICodex Portal",
  category: "Default",
  type: "All",
  logo: "/logo.png",
  providers: [],
};

function attachPageState(page: LegacyAny, extra: Record<string, LegacyAny> = {}) {
  page.state = {
    data: [],
    loading: false,
    pagination: {current: 1, pageSize: 10, total: 1},
    searchText: "",
    searchedColumn: "",
    queryField: "name",
    queryKeyword: "",
    advancedQueryKeywords: {
      name: "",
      displayName: "",
      organization: "",
      category: "",
      type: "",
    },
    advancedFiltersOpen: false,
    formItems: [],
    isAuthorized: true,
    ...extra,
  };
  page.setState = jest.fn((patch: LegacyAny) => {
    const nextState = typeof patch === "function" ? patch(page.state, page.props) : patch;
    page.state = {
      ...page.state,
      ...nextState,
    };
  });
  return page;
}

function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe("ApplicationListPage enterprise table polish", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: () => ({
        matches: false,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }),
    });
    (FormBackend.getForm as unknown as {mockResolvedValue: (value: unknown) => void}).mockResolvedValue({status: "ok", data: {formItems: []}});
    (ApplicationBackend.getApplications as unknown as {mockResolvedValue: (value: unknown) => void}).mockResolvedValue({status: "ok", data: [application], data2: 1});
    (ApplicationBackend.getApplicationsByOrganization as unknown as {mockResolvedValue: (value: unknown) => void}).mockResolvedValue({status: "ok", data: [application], data2: 1});
    (ApplicationBackend.addApplication as unknown as {mockResolvedValue: (value: unknown) => void}).mockResolvedValue({status: "ok"});
    (ApplicationBackend.deleteApplication as unknown as {mockResolvedValue: (value: unknown) => void}).mockResolvedValue({status: "ok"});
    jest.spyOn(Setting, "showMessage").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    cleanup();
  });

  test("keeps application rows compact with small logos and secondary row operations", async() => {
    const history = {push: jest.fn()};
    const page = attachPageState(new (ApplicationListPage as LegacyAny)({
      account,
      history,
      match: {path: "/applications", params: {}},
    }), {
      data: [application],
    });
    const view = render(
      <MemoryRouter>
        {page.renderTable([application])}
      </MemoryRouter>
    );
    const {container} = view;

    expect(container.querySelector("[data-testid='application-access-summary']")).toBeNull();
    expect(container.querySelector(".enterprise-list-page-table-shell.application-list-page-table-shell")).not.toBeNull();
    expect(container.querySelector(".enterprise-list-table.application-list-table")).not.toBeNull();
    expect(container.querySelector(".enterprise-list-query-toolbar")).not.toBeNull();
    expect(container.querySelector(".enterprise-list-query-toolbar-header")?.textContent).toMatch(/应用|Applications/);
    expect(view.getByText(/查询|Search|Query/)).not.toBeNull();
    expect(view.getByText(/重置|Reset/)).not.toBeNull();
    expect(view.getByText(/更多筛选|More filters/)).not.toBeNull();
    expect(view.getByText(/添加|Add/)).not.toBeNull();
    expect(view.getByText(/分类|Category/)).not.toBeNull();
    expect(view.getByText(/类型|Type/)).not.toBeNull();
    const identityCell = container.querySelector(".application-table-cell");
    expect(identityCell).not.toBeNull();
    expect(identityCell?.textContent).toContain("AICodex Portal");
    expect(identityCell?.textContent).toContain("portal");
    expect(container.querySelector(".application-table-name")?.getAttribute("href")).toBe("/applications/built-in/portal");
    expect(container.querySelector(".application-table-category")?.textContent).toContain("Default");
    expect(container.querySelector(".application-table-type")?.textContent).toContain("All");
    expect(container.querySelector(".application-table-providers")).not.toBeNull();
    expect(container.querySelector(".application-table-icon img")?.getAttribute("src")).toBe("/logo.png");
    expect(container.querySelector(".application-row-actions")).not.toBeNull();
    expect(container.querySelector(".enterprise-list-row-actions.application-row-actions")).not.toBeNull();
    expect(container.querySelector(".application-row-primary-action")).not.toBeNull();
    expect(view.queryByText(/显示名称|Display name/)).toBeNull();
    expect(view.queryByText(/对象信息|Object context|Object information/)).toBeNull();
    expect(view.queryByText(/^(更多|More)$/)).toBeNull();
    expect(view.getByText(/复制|Copy/)).not.toBeNull();
    expect(view.getByText(/删除|Delete/)).not.toBeNull();
  });

  test("uses the shared toolbar query state for backend list filtering", () => {
    const page = attachPageState(new (ApplicationListPage as LegacyAny)({
      account,
      history: {push: jest.fn()},
      match: {path: "/applications", params: {}},
    }), {
      pagination: {current: 3, pageSize: 20, total: 4},
      queryField: "organization",
      queryKeyword: "built-in",
    });
    page.fetch = jest.fn();

    page.handleToolbarSearch();

    expect(page.fetch).toHaveBeenCalledWith({
      pagination: expect.objectContaining({current: 1, pageSize: 20}),
      searchedColumn: "organization",
      searchText: "built-in",
    });
  });

  test("places access center title, actions and pagination on the shared list shell", () => {
    const page = attachPageState(new (ApplicationListPage as LegacyAny)({
      account,
      history: {push: jest.fn()},
      match: {path: "/applications", params: {}},
    }), {
      data: [application],
      pagination: {current: 1, pageSize: 20, total: 6},
    });
    const tableShell = page.renderTable([application]) as React.ReactElement<{className?: string; children: TestTableElement}>;
    const table = tableShell.props.children;
    const titleNode = table.props.title?.() as React.ReactElement<LegacyAny>;
    const toolbar = React.Children.toArray(titleNode.props.children).find((child: LegacyAny) => child?.type === EnterpriseListQueryToolbar) as React.ReactElement<React.ComponentProps<typeof EnterpriseListQueryToolbar>>;

    expect(tableShell.props.className).toContain("enterprise-list-page-table-shell");
    expect(tableShell.props.className).toContain("application-list-page-table-shell");
    expect(table.type).toBe(ListPageTable);
    expect(table.props.className).toContain("application-list-table");
    expect(table.props.pagination).toEqual(expect.objectContaining({
      showQuickJumper: true,
      showSizeChanger: true,
    }));
    expect(titleNode.props.className).toContain("enterprise-list-toolbar-shell");
    expect(toolbar.type).toBe(EnterpriseListQueryToolbar);
    expect(toolbar.props.title).toMatch(/应用|Applications/);
    expect(toolbar.props.showTotal).toBe(false);
    expect(toolbar.props.actions).not.toBeUndefined();
    expect(toolbar.props.actionsPlacement).toBe("topRight");
  });

  test("keeps compact identity columns when backend form config uses legacy application field names", () => {
    const page = attachPageState(new (ApplicationListPage as LegacyAny)({
      account,
      history: {push: jest.fn()},
      match: {path: "/applications", params: {}},
      formItems: [
        {name: "name", label: "general:Name", visible: true, width: "150"},
        {name: "organization", label: "general:Organization", visible: true, width: "150"},
        {name: "category", label: "general:Category", visible: true, width: "120"},
        {name: "type", label: "general:Type", visible: true, width: "100"},
        {name: "providers", label: "application:Providers", visible: true, width: "500"},
        {name: "createdTime", label: "general:Created time", visible: true, width: "160"},
      ],
    }), {
      data: [application],
    });
    const tableShell = page.renderTable([application]) as React.ReactElement<{children: React.ReactElement<LegacyAny>}>;
    const table = tableShell.props.children;
    const columns = table.props.columns as Array<{key: string; title: string; width: string}>;
    const view = render(
      <MemoryRouter>
        {tableShell}
      </MemoryRouter>
    );
    const {container} = view;

    expect(columns.find(column => column.key === "name")?.width).toBe("18%");
    expect(columns.find(column => column.key === "name")?.title).toMatch(/应用|Application/);
    expect(columns.find(column => column.key === "providers")?.width).toBe("25%");
    expect(columns.find(column => column.key === "op")?.width).toBe("21%");
    expect(container.querySelector(".application-table-cell")?.textContent).toContain("AICodex Portal");
    expect(container.querySelector(".application-table-category")).not.toBeNull();
    expect(container.querySelector(".application-table-type")).not.toBeNull();
    expect(container.querySelector(".application-table-providers")).not.toBeNull();
    expect(view.getByText(/分类|Category/)).not.toBeNull();
    expect(view.getByText(/类型|Type/)).not.toBeNull();
    expect(view.getByText(/接入配置|Access configuration/)).not.toBeNull();
  });

  test("keeps backend contracts for non-default organization fetch and row actions", async() => {
    jest.spyOn(Setting, "isDefaultOrganizationSelected").mockReturnValue(false);
    jest.spyOn(Setting, "getRequestOrganization").mockReturnValue("org-alpha");
    jest.spyOn(Setting, "getRandomName").mockReturnValue("fixed");
    const history = {push: jest.fn()};
    const page = attachPageState(new (ApplicationListPage as LegacyAny)({
      account: {...account, owner: "org-alpha", organization: {name: "org-alpha"}},
      history,
      match: {path: "/applications", params: {}},
    }), {
      data: [{...application, organization: "org-alpha"}],
      pagination: {current: 2, pageSize: 25, total: 1},
      searchedColumn: "name",
      searchText: "portal",
    });
    const params = {
      pagination: {current: 2, pageSize: 25, total: 1},
      searchedColumn: "name",
      searchText: "portal",
      sortField: "createdTime",
      sortOrder: "descend",
    };

    page.fetch(params);
    await flushPromises();
    expect(ApplicationBackend.getApplicationsByOrganization).toHaveBeenCalledWith("admin", "org-alpha", 2, 25, "name", "portal", "createdTime", "descend");
    expect(page.setState).toHaveBeenCalledWith(expect.objectContaining({data: expect.any(Array)}));
    page.state.data = [{...application, organization: "org-alpha"}];

    page.addApplication();
    await flushPromises();
    expect(ApplicationBackend.addApplication).toHaveBeenCalledWith(expect.objectContaining({
      owner: "admin",
      organization: "org-alpha",
      name: "application_fixed",
      enablePassword: true,
      tokenFormat: "JWT",
    }));
    expect(history.push).toHaveBeenCalledWith({pathname: "/applications/org-alpha/application_fixed", mode: "add"});

    page.copyApplication(0);
    await flushPromises();
    expect(ApplicationBackend.addApplication).toHaveBeenCalledWith(expect.objectContaining({
      organization: "org-alpha",
      name: "portal_fixed",
      clientId: "",
      clientSecret: "",
    }));
    expect(history.push).toHaveBeenCalledWith({pathname: "/applications/org-alpha/portal_fixed", mode: "add"});

    page.fetch = jest.fn();
    page.deleteApplication(0);
    await flushPromises();
    expect(ApplicationBackend.deleteApplication).toHaveBeenCalledWith(expect.objectContaining({name: "portal"}));
    expect(page.fetch).toHaveBeenCalledWith({pagination: expect.objectContaining({current: 1})});
  });
});
