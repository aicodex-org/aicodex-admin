/* eslint-env jest */
import React from "react";
import {MemoryRouter} from "react-router-dom";
import {expect, jest} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import ApplicationListPage from "./ApplicationListPage";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import * as FormBackend from "./backend/FormBackend";

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
  });

  afterEach(() => {
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
});
