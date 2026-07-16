/* eslint-env jest */
import React from "react";
import {expect, jest} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import ProviderListPage from "./ProviderListPage";
import * as ProviderBackend from "./backend/ProviderBackend";
import * as Setting from "./Setting";
import EnterpriseListQueryToolbar from "./common/EnterpriseListQueryToolbar";
import ListPageTable from "./common/ListPageTable";

type LegacyAny = any;
type TestTableElement = React.ReactElement<{
  className?: string;
  title?: () => React.ReactNode;
  pagination?: LegacyAny;
}>;

const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element) => void;
  };
};

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

jest.mock("./auth/Provider", () => {
  const ReactFactory = require("react");
  return {
    getProviderLogoWidget: (provider: {type?: string; displayName?: string}) => ReactFactory.createElement("img", {
      className: "provider-table-provider-logo",
      src: `/provider-${provider.type}.png`,
      alt: provider.displayName,
    }),
  };
});

jest.mock("./TourConfig", () => ({
  getTourVisible: () => false,
  getSteps: () => [],
  getNextUrl: () => "",
  setIsTourVisible: () => undefined,
}));

const account = {
  owner: "built-in",
  name: "admin",
  tag: "",
  isAdmin: true,
  organization: {name: "built-in"},
};

const provider = {
  owner: "admin",
  name: "provider_wecom_default",
  displayName: "WeCom",
  category: "OAuth",
  type: "WeCom",
  clientId: "wwe7e01c69367e67bf",
  providerUrl: "https://work.weixin.qq.com/",
  createdTime: "2026-06-03T16:58:57+08:00",
};

function attachPageState(page: LegacyAny, extra: Record<string, LegacyAny> = {}): LegacyAny {
  page.state = {
    data: [],
    loading: false,
    pagination: {current: 1, pageSize: 10, total: 1},
    searchText: "",
    searchedColumn: "",
    queryField: "name",
    queryKeyword: "",
    formItems: [],
    isAuthorized: true,
    ...extra,
  };
  page.setState = jest.fn((patch: LegacyAny, callback?: () => void) => {
    const nextState = typeof patch === "function" ? patch(page.state, page.props) : patch;
    page.state = {
      ...page.state,
      ...nextState,
    };
    if (typeof callback === "function") {
      callback();
    }
  });
  return page;
}

describe("ProviderListPage enterprise table polish", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation((message?: unknown, ...args: unknown[]) => {
      if (typeof message === "string" && message.includes("ReactDOM.render is no longer supported in React 18")) {
        return;
      }
      throw new Error([message, ...args].map(item => String(item)).join(" "));
    });
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  test("keeps authentication source rows compact with shared list primitives", () => {
    const history = {push: jest.fn()};
    const page = attachPageState(new ProviderListPage({
      account,
      history,
      match: {path: "/providers", params: {}},
    }), {
      data: [provider],
      pagination: {current: 1, pageSize: 20, total: 1},
    });
    const view = render(
      <MemoryRouter>
        {page.renderTable([provider])}
      </MemoryRouter>
    );
    const {container} = view;

    expect(container.querySelector("[data-testid='auth-source-center']")).toBeNull();
    expect(container.querySelector(".enterprise-list-page-table-shell.provider-list-page-table-shell")).not.toBeNull();
    expect(container.querySelector(".enterprise-list-table.provider-list-table")).not.toBeNull();
    expect(container.querySelector(".enterprise-list-query-toolbar")).not.toBeNull();
    expect(container.querySelector(".enterprise-list-query-toolbar-header")?.textContent).toMatch(/提供商|Providers/);
    expect(container.querySelector(".enterprise-list-query-toolbar-header")?.textContent).not.toMatch(/认证源中心|Authentication Source Center/);
    expect(container.querySelector(".provider-table-cell")).not.toBeNull();
    expect(container.querySelector(".provider-table-cell")?.textContent).toContain("WeCom");
    expect(container.querySelector(".provider-table-cell")?.textContent).toContain("provider_wecom_default");
    expect(container.querySelector(".provider-table-name")?.getAttribute("href")).toBe("/providers/admin/provider_wecom_default");
    expect(container.querySelector(".provider-table-category")?.textContent).toContain("OAuth");
    expect(container.querySelector(".provider-table-type")).not.toBeNull();
    expect(container.querySelector(".provider-table-client-id")?.textContent).toContain("wwe7e01c");
    expect(container.querySelector(".provider-table-url")?.getAttribute("href")).toBe("https://work.weixin.qq.com/");
    expect(container.querySelector(".enterprise-list-row-actions.provider-row-actions")).not.toBeNull();
    expect(container.querySelector(".provider-row-primary-action")).not.toBeNull();
    expect(view.queryByText(/显示名称|Display name/)).toBeNull();
    expect(view.queryByText(/对象信息|Object context|Object information/)).toBeNull();
    expect(view.getByText(/删除|Delete/)).not.toBeNull();
  });

  test("keeps historical wallet providers visible only for deletion", () => {
    const retiredProvider = {
      ...provider,
      name: "historical-wallet",
      displayName: "Historical Wallet",
      category: "OAuth",
      type: "MetaMask",
    };
    const page = attachPageState(new ProviderListPage({
      account,
      history: {push: jest.fn()},
      match: {path: "/providers", params: {}},
    }), {data: [retiredProvider]});
    const root = page.renderTable([retiredProvider]);
    const tableShell = React.Children.toArray(root.props.children).find((child: LegacyAny) => child?.props?.className?.includes("provider-list-page-table-shell")) as LegacyAny;
    const table = React.Children.only(tableShell.props.children) as LegacyAny;
    const columns = table.props.columns as LegacyAny[];
    const view = render(<MemoryRouter>{root}</MemoryRouter>);

    expect(view.getByText("Historical Wallet")).not.toBeNull();
    expect(view.container.querySelector(".provider-table-name")?.getAttribute("href")).toBe("/providers/admin/historical-wallet");
    expect(view.container.querySelector(".provider-row-primary-action")).toBeNull();
    expect(view.getByText(/删除|Delete/)).not.toBeNull();
    expect(columns.find(column => column.key === "category")?.filters.map((item: LegacyAny) => item.value)).not.toContain("Web3");
    expect(columns.find(column => column.key === "type")?.filters.map((item: LegacyAny) => item.value)).not.toContain("Web3");
  });

  test("keeps compact provider columns when backend form config uses legacy provider field names", () => {
    const page = attachPageState(new ProviderListPage({
      account,
      history: {push: jest.fn()},
      match: {path: "/providers", params: {}},
      formItems: [
        {name: "name", label: "general:Name", visible: true, width: "120"},
        {name: "owner", label: "general:Organization", visible: true, width: "150"},
        {name: "createdTime", label: "general:Created time", visible: true, width: "180"},
        {name: "displayName", label: "general:Display name", visible: true, width: "160"},
        {name: "category", label: "general:Category", visible: true, width: "110"},
        {name: "type", label: "general:Type", visible: true, width: "110"},
        {name: "clientId", label: "provider:Client ID", visible: true, width: "100"},
        {name: "providerUrl", label: "provider:Provider URL", visible: true, width: "150"},
      ],
    }), {
      data: [provider],
    });
    const root = page.renderTable([provider]);
    const tableShell = React.Children.toArray(root.props.children).find((child: LegacyAny) => child?.props?.className?.includes("provider-list-page-table-shell")) as LegacyAny;
    const table = React.Children.only(tableShell.props.children) as LegacyAny;
    const columns = table.props.columns as LegacyAny[];
    const view = render(
      <MemoryRouter>
        {root}
      </MemoryRouter>
    );

    expect(columns.find((column: LegacyAny) => column.key === "name")?.width).toBe("17%");
    expect(columns.find((column: LegacyAny) => column.key === "name")?.title).toMatch(/认证源|Identity source/);
    expect(columns.find((column: LegacyAny) => column.key === "providerUrl")?.width).toBe("15%");
    expect(columns.find((column: LegacyAny) => column.key === "op")?.width).toBe("16%");
    expect(columns.find((column: LegacyAny) => column.key === "displayName")).toBeUndefined();
    expect(view.getByText(/客户端ID|Client ID/)).not.toBeNull();
    expect(view.queryByText(/显示名称|Display name/)).toBeNull();
  });

  test("renders empty provider URL and disables row actions outside editable scope", () => {
    jest.spyOn(Setting, "isAdminUser").mockReturnValue(false);
    const readonlyAccount = {
      ...account,
      owner: "built-in",
      name: "readonly-user",
      isAdmin: false,
    };
    const page = attachPageState(new ProviderListPage({
      account: readonlyAccount,
      history: {push: jest.fn()},
      match: {path: "/providers", params: {}},
    }), {
      data: [{...provider, owner: "admin", providerUrl: ""}],
    });
    const view = render(
      <MemoryRouter>
        {page.renderTable([{...provider, owner: "admin", providerUrl: ""}])}
      </MemoryRouter>
    );

    expect(view.container.querySelector(".provider-table-empty-text")).not.toBeNull();
    expect(view.getByText(/Edit|编辑/).closest("button")?.hasAttribute("disabled")).toBe(true);
    expect(view.getByText(/Delete|删除/).closest("button")?.hasAttribute("disabled")).toBe(true);
  });

  test("uses table-internal horizontal scrolling on narrow provider viewports", () => {
    const originalInnerWidth = window.innerWidth;
    try {
      Object.defineProperty(window, "innerWidth", {configurable: true, value: 390});
      const page = attachPageState(new ProviderListPage({
        account,
        history: {push: jest.fn()},
        match: {path: "/providers", params: {}},
        formItems: [],
      }), {
        data: [provider],
      });
      const root = page.renderTable([provider]);
      const tableShell = React.Children.toArray(root.props.children).find((child: LegacyAny) => child?.props?.className?.includes("provider-list-page-table-shell")) as LegacyAny;
      const table = React.Children.only(tableShell.props.children) as LegacyAny;

      expect(table.props.scroll).toEqual(expect.objectContaining({x: 1040}));
    } finally {
      Object.defineProperty(window, "innerWidth", {configurable: true, value: originalInnerWidth});
    }
  });

  test("uses the shared toolbar query state for provider backend filtering", () => {
    const page = attachPageState(new ProviderListPage({
      account,
      history: {push: jest.fn()},
      match: {path: "/providers", params: {}},
    }), {
      pagination: {current: 3, pageSize: 20, total: 5},
      queryField: "owner",
      queryKeyword: "admin",
    });
    page.fetch = jest.fn();

    page.handleToolbarSearch();

    expect(page.fetch).toHaveBeenCalledWith({
      pagination: expect.objectContaining({current: 1, pageSize: 20}),
      searchedColumn: "owner",
      searchText: "admin",
    });
  });

  test("places identity source center title, actions and pagination on the shared list shell", () => {
    const page = attachPageState(new ProviderListPage({
      account,
      history: {push: jest.fn()},
      match: {path: "/providers", params: {}},
    }), {
      data: [provider],
      pagination: {current: 1, pageSize: 20, total: 5},
    });
    const root = page.renderTable([provider]) as React.ReactElement<{children: React.ReactNode}>;
    const tableShell = React.Children.toArray(root.props.children).find((child: LegacyAny) => child?.props?.className?.includes("provider-list-page-table-shell")) as React.ReactElement<{className?: string; children: TestTableElement}>;
    const table = tableShell.props.children;
    const titleNode = table.props.title?.() as React.ReactElement<LegacyAny>;
    const toolbar = React.Children.toArray(titleNode.props.children).find((child: LegacyAny) => child?.type === EnterpriseListQueryToolbar) as React.ReactElement<React.ComponentProps<typeof EnterpriseListQueryToolbar>>;

    expect(tableShell.props.className).toContain("enterprise-list-page-table-shell");
    expect(tableShell.props.className).toContain("provider-list-page-table-shell");
    expect(table.type).toBe(ListPageTable);
    expect(table.props.className).toContain("provider-list-table");
    expect(table.props.pagination).toEqual(expect.objectContaining({
      showQuickJumper: true,
      showSizeChanger: true,
    }));
    expect(titleNode.props.className).toContain("enterprise-list-toolbar-shell");
    expect(toolbar.type).toBe(EnterpriseListQueryToolbar);
    expect(toolbar.props.title).toMatch(/提供商|Providers/);
    expect(toolbar.props.showTotal).toBe(false);
    expect(toolbar.props.actions).not.toBeUndefined();
    expect(toolbar.props.actionsPlacement).toBe("topRight");
  });

  test("updates owner and toolbar state without changing backend contracts", () => {
    const page = attachPageState(new ProviderListPage({
      account,
      history: {push: jest.fn()},
      match: {path: "/providers", params: {}},
    }));
    page.componentDidMount();
    page.handleAdvancedFilterChange("clientId", "cli_aaba");

    expect(page.state.owner).toBe("admin");
    expect(page.state.advancedQueryKeywords.clientId).toBe("cli_aaba");
  });

  test("maps table category and type filters into provider fetch params", () => {
    const page = attachPageState(new ProviderListPage({
      account,
      history: {push: jest.fn()},
      match: {path: "/providers", params: {}},
    }), {
      pagination: {current: 1, pageSize: 20, total: 5},
      searchedColumn: "owner",
      searchText: "admin",
    });
    page.fetch = jest.fn();

    page.handleProviderTableChange(
      {current: 2, pageSize: 20},
      {category: ["OAuth"], type: ["WeCom"]},
      [{field: "category", order: "descend"}]
    );

    expect(page.fetch).toHaveBeenCalledWith({
      pagination: expect.objectContaining({current: 2, pageSize: 20}),
      sortField: "category",
      sortOrder: "descend",
      searchedColumn: "owner",
      searchText: "admin",
      category: "OAuth",
      type: "WeCom",
    });
  });

  test("shows advanced provider filters in the shared toolbar", () => {
    const page = attachPageState(new ProviderListPage({
      account,
      history: {push: jest.fn()},
      match: {path: "/providers", params: {}},
    }), {
      data: [provider],
    });
    const view = render(
      <MemoryRouter>
        {page.renderTable([provider])}
      </MemoryRouter>
    );
    const {container} = view;

    const moreFiltersButton = view.getByText(/更多筛选|More filters/).closest("button");
    expect(moreFiltersButton).not.toBeNull();
    fireEvent.click(moreFiltersButton as HTMLElement);

    expect(view.getByLabelText(/更多筛选.*Category|More filters.*Category|更多筛选.*分类/)).not.toBeNull();
    expect(view.getByLabelText(/更多筛选.*Type|More filters.*Type|更多筛选.*类型/)).not.toBeNull();
    expect(view.getByLabelText(/更多筛选.*Organization|More filters.*Organization|更多筛选.*组织/)).not.toBeNull();
    expect(view.getByLabelText(/更多筛选.*Client ID|More filters.*Client ID|更多筛选.*客户端\s*ID/)).not.toBeNull();
    expect(view.getByLabelText(/更多筛选.*Provider URL|More filters.*Provider URL|更多筛选.*提供商\s*URL/)).not.toBeNull();
    const advancedFilterLabelElements = Array.from(container.querySelectorAll(".provider-advanced-filter-item .organization-advanced-filter-label")) as HTMLElement[];
    const advancedFilterLabels = advancedFilterLabelElements
      .map(item => item.textContent);
    expect(advancedFilterLabels).toEqual([
      expect.stringMatching(/Category|分类/),
      expect.stringMatching(/Type|类型/),
      expect.stringMatching(/Organization|组织/),
      expect.stringMatching(/Client ID|客户端\s*ID/),
      expect.stringMatching(/Provider URL|提供商\s*URL/),
    ]);
  });

  test("maps advanced provider filters onto the existing single-field query contract", () => {
    const page = attachPageState(new ProviderListPage({
      account,
      history: {push: jest.fn()},
      match: {path: "/providers", params: {}},
    }), {
      pagination: {current: 3, pageSize: 20, total: 5},
      queryKeyword: "",
      advancedQueryKeywords: {
        category: "OAuth",
        type: "",
        owner: "",
        clientId: "",
        providerUrl: "",
      },
    });
    page.fetch = jest.fn();

    page.handleToolbarSearch();

    expect(page.fetch).toHaveBeenCalledWith({
      pagination: expect.objectContaining({current: 1, pageSize: 20}),
      searchedColumn: "category",
      searchText: "OAuth",
    });
  });

  test("prefers the base provider keyword when base and advanced filters both have values", () => {
    const page = attachPageState(new ProviderListPage({
      account,
      history: {push: jest.fn()},
      match: {path: "/providers", params: {}},
    }), {
      pagination: {current: 3, pageSize: 20, total: 5},
      queryField: "owner",
      queryKeyword: "admin",
      advancedQueryKeywords: {
        category: "OAuth",
        type: "",
        owner: "",
        clientId: "",
        providerUrl: "",
      },
    });
    page.fetch = jest.fn();

    page.handleToolbarSearch();

    expect(page.fetch).toHaveBeenCalledWith({
      pagination: expect.objectContaining({current: 1, pageSize: 20}),
      searchedColumn: "owner",
      searchText: "admin",
    });
  });

  test("keeps submitted provider search params during table changes", () => {
    const page = attachPageState(new ProviderListPage({
      account,
      history: {push: jest.fn()},
      match: {path: "/providers", params: {}},
    }), {
      pagination: {current: 1, pageSize: 20, total: 5},
      searchedColumn: "owner",
      searchText: "admin",
      advancedQueryKeywords: {
        category: "OAuth",
        type: "",
        owner: "",
        clientId: "",
        providerUrl: "",
      },
    });
    page.fetch = jest.fn();

    page.handleProviderTableChange({current: 2, pageSize: 20}, {}, {field: "name", order: "ascend"});

    expect(page.fetch).toHaveBeenCalledWith({
      pagination: expect.objectContaining({current: 2, pageSize: 20}),
      sortField: "name",
      sortOrder: "ascend",
      searchedColumn: "owner",
      searchText: "admin",
    });
  });

  test("resets base and advanced provider filters together", () => {
    const page = attachPageState(new ProviderListPage({
      account,
      history: {push: jest.fn()},
      match: {path: "/providers", params: {}},
    }), {
      pagination: {current: 3, pageSize: 20, total: 5},
      queryField: "owner",
      queryKeyword: "admin",
      advancedQueryKeywords: {
        category: "OAuth",
        type: "WeCom",
        owner: "admin",
        clientId: "wwe7",
        providerUrl: "weixin",
      },
    });
    page.fetch = jest.fn();

    page.handleToolbarReset();

    expect(page.state).toEqual(expect.objectContaining({
      queryField: "name",
      queryKeyword: "",
      searchText: undefined,
      searchedColumn: undefined,
      advancedQueryKeywords: expect.objectContaining({
        category: "",
        type: "",
        owner: "",
        clientId: "",
        providerUrl: "",
      }),
    }));
    expect(page.fetch).toHaveBeenCalledWith({
      pagination: expect.objectContaining({current: 1, pageSize: 20}),
    });
  });

  test("opens a provider draft without calling the add backend", async() => {
    const history = {push: jest.fn()};
    const showMessage = jest.spyOn(Setting, "showMessage").mockImplementation(() => undefined);
    jest.spyOn(Setting, "getRandomName").mockReturnValue("fixed");
    jest.spyOn(Setting, "isDefaultOrganizationSelected").mockReturnValue(true);
    const addProvider = jest.spyOn(ProviderBackend, "addProvider").mockResolvedValue({status: "ok"} as LegacyAny);
    const page = attachPageState(new ProviderListPage({
      account,
      history,
      match: {path: "/providers", params: {}},
    }), {
      owner: "admin",
    });

    page.addProvider();
    await flushPromises();

    expect(addProvider).not.toHaveBeenCalled();
    expect(history.push).toHaveBeenCalledWith(expect.objectContaining({pathname: "/providers/admin/provider_fixed", state: expect.objectContaining({mode: "add", provider: expect.objectContaining({
      owner: "admin",
      name: "provider_fixed",
      category: "OAuth",
      type: "GitHub",
    })})}));
    expect(showMessage).not.toHaveBeenCalledWith("success", expect.any(String));
  });

  test("deletes provider and falls back to previous page when current page becomes empty", async() => {
    const showMessage = jest.spyOn(Setting, "showMessage").mockImplementation(() => undefined);
    jest.spyOn(ProviderBackend, "deleteProvider").mockResolvedValue({status: "ok"} as LegacyAny);
    const page = attachPageState(new ProviderListPage({
      account,
      history: {push: jest.fn()},
      match: {path: "/providers", params: {}},
    }), {
      data: [provider],
      pagination: {current: 2, pageSize: 20, total: 21},
    });
    page.fetch = jest.fn();

    page.deleteProvider(0);
    await flushPromises();

    expect(showMessage).toHaveBeenCalledWith("success", expect.any(String));
    expect(page.fetch).toHaveBeenCalledWith({
      pagination: expect.objectContaining({current: 1, pageSize: 20}),
    });
  });

  test("surfaces delete provider backend and connection failures", async() => {
    const showMessage = jest.spyOn(Setting, "showMessage").mockImplementation(() => undefined);
    const page = attachPageState(new ProviderListPage({
      account,
      history: {push: jest.fn()},
      match: {path: "/providers", params: {}},
    }), {
      data: [provider],
      pagination: {current: 1, pageSize: 20, total: 1},
    });
    jest.spyOn(ProviderBackend, "deleteProvider").mockResolvedValueOnce({status: "error", msg: "locked"} as LegacyAny);

    page.deleteProvider(0);
    await flushPromises();
    expect(showMessage).toHaveBeenCalledWith("error", expect.stringContaining("locked"));

    jest.spyOn(ProviderBackend, "deleteProvider").mockRejectedValueOnce(new Error("offline"));
    page.deleteProvider(0);
    await flushPromises();
    expect(showMessage).toHaveBeenCalledWith("error", expect.stringContaining("offline"));
  });

  test("fetches global providers with existing single-field query contract", async() => {
    jest.spyOn(Setting, "isDefaultOrganizationSelected").mockReturnValue(true);
    const getGlobalProviders = jest.spyOn(ProviderBackend, "getGlobalProviders").mockResolvedValue({
      status: "ok",
      data: [provider],
      data2: 1,
    } as LegacyAny);
    const page = attachPageState(new ProviderListPage({
      account,
      history: {push: jest.fn()},
      match: {path: "/providers", params: {}},
    }));

    page.fetch({
      pagination: {current: 2, pageSize: 20},
      searchedColumn: "owner",
      searchText: "admin",
      sortField: "name",
      sortOrder: "ascend",
    });
    await flushPromises();

    expect(getGlobalProviders).toHaveBeenCalledWith("2", "20", "owner", "admin", "name", "ascend");
    expect(page.state).toEqual(expect.objectContaining({
      data: [provider],
      loading: false,
      searchedColumn: "owner",
      searchText: "admin",
      pagination: expect.objectContaining({current: 2, total: 1}),
    }));
  });

  test("fetches organization providers with table filter overrides and handles denied or error responses", async() => {
    jest.spyOn(Setting, "isDefaultOrganizationSelected").mockReturnValue(false);
    jest.spyOn(Setting, "getRequestOrganization").mockReturnValue("built-in");
    const showMessage = jest.spyOn(Setting, "showMessage").mockImplementation(() => undefined);
    const getProviders = jest.spyOn(ProviderBackend, "getProviders")
      .mockResolvedValueOnce({status: "ok", data: undefined, data2: 0} as LegacyAny)
      .mockResolvedValueOnce({status: "error", msg: "denied"} as LegacyAny)
      .mockResolvedValueOnce({status: "error", msg: "failed"} as LegacyAny);
    const deniedSpy = jest.spyOn(Setting, "isResponseDenied")
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);
    const page = attachPageState(new ProviderListPage({
      account,
      history: {push: jest.fn()},
      match: {path: "/providers", params: {}},
    }));

    page.fetch({pagination: {current: 1, pageSize: 20}, category: "OAuth", type: "WeCom"});
    await flushPromises();
    expect(getProviders).toHaveBeenNthCalledWith(1, "built-in", "1", "20", "category", "OAuth", undefined, undefined);
    expect(page.state.data).toEqual([]);

    page.fetch({pagination: {current: 1, pageSize: 20}});
    await flushPromises();
    expect(deniedSpy).toHaveBeenCalledWith({status: "error", msg: "denied"});
    expect(page.state.isAuthorized).toBe(false);

    page.fetch({pagination: {current: 1, pageSize: 20}});
    await flushPromises();
    expect(showMessage).toHaveBeenCalledWith("error", "failed");
  });
});
