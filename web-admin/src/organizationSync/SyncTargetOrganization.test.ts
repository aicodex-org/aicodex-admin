/* eslint-env jest */
import {expect, jest} from "@jest/globals";
import * as Setting from "../Setting";
import * as OrganizationBackend from "../backend/OrganizationBackend";
import {
  createDefaultOrganization,
  openNewSyncTargetOrganization
} from "./SyncTargetOrganization";

const fixedNow = new Date("2026-07-14T00:00:00.000Z");

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(fixedNow);
  jest.spyOn(Setting, "getRandomName").mockReturnValue("abc123");
  jest.spyOn(Setting, "showMessage").mockImplementation(() => {});
  jest.spyOn(OrganizationBackend, "addOrganization").mockResolvedValue({status: "ok"});
  jest.spyOn(OrganizationBackend, "updateOrganization").mockResolvedValue({status: "ok"});
  jest.spyOn(OrganizationBackend, "deleteOrganization").mockResolvedValue({status: "ok"});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("opens the organization editor with the unchanged default draft in route state", async() => {
  const history = {push: jest.fn()};
  const expectedDraft = createDefaultOrganization();

  const result = openNewSyncTargetOrganization(history);
  void result;

  await expect(result).resolves.toEqual(expectedDraft);
  expect(history.push).toHaveBeenCalledWith({
    pathname: "/organizations/organization_abc123",
    state: {
      mode: "add",
      organization: expectedDraft,
    },
  });
});

test("does not persist the target organization before the draft is saved", async() => {
  const history = {push: jest.fn()};

  await openNewSyncTargetOrganization(history);

  expect(OrganizationBackend.addOrganization).not.toHaveBeenCalled();
  expect(OrganizationBackend.updateOrganization).not.toHaveBeenCalled();
  expect(OrganizationBackend.deleteOrganization).not.toHaveBeenCalled();
});

test("does not show creation messages or broadcast organization changes at the entry", async() => {
  const history = {push: jest.fn()};
  const dispatchEventSpy = jest.spyOn(window, "dispatchEvent");

  await openNewSyncTargetOrganization(history);

  expect(Setting.showMessage).not.toHaveBeenCalled();
  expect(dispatchEventSpy).not.toHaveBeenCalledWith(expect.objectContaining({
    type: "storageOrganizationsChanged",
  }));
});

test("fails closed without history instead of falling back to a legacy location navigation", async() => {
  const initialHref = window.location.href;

  const result = openNewSyncTargetOrganization();
  void result;

  await expect(result).resolves.toBeNull();
  expect(window.location.href).toBe(initialHref);
  expect(OrganizationBackend.addOrganization).not.toHaveBeenCalled();
  expect(OrganizationBackend.updateOrganization).not.toHaveBeenCalled();
  expect(OrganizationBackend.deleteOrganization).not.toHaveBeenCalled();
  expect(Setting.showMessage).not.toHaveBeenCalled();
});

test("fails closed asynchronously when route navigation throws", async() => {
  const history = {push: jest.fn(() => {
    throw new Error("navigation failed");
  })};
  const dispatchEventSpy = jest.spyOn(window, "dispatchEvent");
  let result: Promise<OrganizationBackend.OrganizationRecord | null> | undefined;

  expect(() => {
    result = openNewSyncTargetOrganization(history);
  }).not.toThrow();

  await expect(result).resolves.toBeNull();
  expect(OrganizationBackend.addOrganization).not.toHaveBeenCalled();
  expect(OrganizationBackend.updateOrganization).not.toHaveBeenCalled();
  expect(OrganizationBackend.deleteOrganization).not.toHaveBeenCalled();
  expect(Setting.showMessage).not.toHaveBeenCalled();
  expect(dispatchEventSpy).not.toHaveBeenCalledWith(expect.objectContaining({
    type: "storageOrganizationsChanged",
  }));
});
