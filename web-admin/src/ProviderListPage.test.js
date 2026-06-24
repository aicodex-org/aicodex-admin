/* eslint-env jest */
import React from "react";
import {cleanup, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import ProviderListPage from "./ProviderListPage";

jest.mock("./AuthSourceCenter", () => {
  const ReactFactory = require("react");
  return {
    __esModule: true,
    default: ({children}) => ReactFactory.createElement("div", {"data-testid": "auth-source-center"}, children),
  };
});

jest.mock("./auth/Provider", () => {
  const ReactFactory = require("react");
  return {
    getProviderLogoWidget: provider => ReactFactory.createElement("img", {
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

function attachPageState(page, extra = {}) {
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
  page.setState = jest.fn(patch => {
    const nextState = typeof patch === "function" ? patch(page.state, page.props) : patch;
    page.state = {
      ...page.state,
      ...nextState,
    };
  });
  return page;
}

describe("ProviderListPage enterprise table polish", () => {
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

    expect(container.querySelector("[data-testid='auth-source-center']")).not.toBeNull();
    expect(container.querySelector(".provider-list-page-table-shell")).not.toBeNull();
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
    const tableShell = React.Children.toArray(root.props.children).find(child => child?.props?.className === "provider-list-page-table-shell");
    const table = React.Children.only(tableShell.props.children);
    const columns = table.props.columns;
    const view = render(
      <MemoryRouter>
        {root}
      </MemoryRouter>
    );

    expect(columns.find(column => column.key === "name")?.width).toBe("18%");
    expect(columns.find(column => column.key === "name")?.title).toMatch(/认证源|Identity source/);
    expect(columns.find(column => column.key === "providerUrl")?.width).toBe("16%");
    expect(columns.find(column => column.key === "op")?.width).toBe("13%");
    expect(columns.find(column => column.key === "displayName")).toBeUndefined();
    expect(view.getByText(/客户端ID|Client ID/)).not.toBeNull();
    expect(view.queryByText(/显示名称|Display name/)).toBeNull();
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
});
