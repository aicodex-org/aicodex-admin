/* eslint-env jest */
import React from "react";
import {MemoryRouter} from "react-router-dom";
import {expect, jest} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import ApplicationListPage from "./ApplicationListPage";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import * as FormBackend from "./backend/FormBackend";
import * as Setting from "./Setting";

jest.mock("./backend/ApplicationBackend");
jest.mock("./backend/FormBackend");
jest.mock("./table/SignupTable", () => ({
  SignupTableDefaultCssMap: {},
}));
jest.mock("./backend/IdentityAssetRelationshipBackend", () => ({
  getIdentityAssetRelationshipAggregation: () => Promise.resolve({status: "error"}),
}));
jest.mock("./ApplicationAccessCenter", () => () => <div data-testid="application-access-summary" />);
jest.mock("./IdentityAssetRelationshipDrawer", () => () => null);
jest.mock("./TourConfig", () => ({
  getTourVisible: () => false,
  getSteps: () => [],
  getNextUrl: () => "",
  setIsTourVisible: () => undefined,
}));

type LegacyAny = any;

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
    formItems: [],
    identityAssetDetail: null,
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
    const view = render(
      <MemoryRouter>
        <ApplicationListPage account={account} history={history} match={{path: "/applications", params: {}}} />
      </MemoryRouter>
    );
    const {container} = view;

    expect(await view.findByText("AICodex Portal")).not.toBeNull();
    expect(container.querySelector("[data-testid='application-access-summary']")).not.toBeNull();
    expect(container.querySelector(".application-logo-thumb")?.getAttribute("width")).toBe("40");
    expect(container.querySelector(".application-row-actions")).not.toBeNull();
    expect(view.getByText(/对象上下文|Object context/)).not.toBeNull();
    expect(view.getByText(/更多|More/)).not.toBeNull();
    expect(view.queryByText(/Delete|删除/)).toBeNull();
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

  test("keeps identity asset fallback context when aggregation is unavailable", () => {
    const page = attachPageState(new (ApplicationListPage as LegacyAny)({
      account,
      history: {push: jest.fn()},
      match: {path: "/applications", params: {}},
    }), {
      data: [application],
      pagination: {current: 1, pageSize: 10, total: 1},
      searchedColumn: "category",
      searchText: "Default",
    });

    expect(page.getIdentityAssetSourceContext()).toEqual(expect.objectContaining({
      pagePath: "/applications",
      filterSummary: "category=Default",
      loadedRows: 1,
      totalRows: 1,
    }));
    page.openIdentityAssetDetail(application);

    expect(page.state.identityAssetDetail).toEqual(expect.objectContaining({
      object: expect.objectContaining({
        type: "Application",
        owner: "admin",
        id: "built-in/portal",
      }),
      source: expect.objectContaining({
        filterSummary: "category=Default",
        loadedRows: 1,
      }),
    }));
    page.closeIdentityAssetDetail();
    expect(page.state.identityAssetDetail).toBeNull();
  });
});
