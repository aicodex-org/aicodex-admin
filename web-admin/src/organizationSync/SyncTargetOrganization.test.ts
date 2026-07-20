import {afterEach, beforeEach, expect, test, vi} from "vitest";
import * as Setting from "../Setting";
import * as OrganizationBackend from "../backend/OrganizationBackend";
import {
  createDefaultOrganization,
  openNewSyncTargetOrganization
} from "./SyncTargetOrganization";

const fixedNow = new Date("2026-07-14T00:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers().setSystemTime(fixedNow);
  vi.spyOn(Setting, "getRandomName").mockReturnValue("abc123");
  vi.spyOn(Setting, "showMessage").mockImplementation(() => {});
  vi.spyOn(OrganizationBackend, "addOrganization").mockResolvedValue({status: "ok"});
  vi.spyOn(OrganizationBackend, "updateOrganization").mockResolvedValue({status: "ok"});
  vi.spyOn(OrganizationBackend, "deleteOrganization").mockResolvedValue({status: "ok"});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test("opens the organization editor with the unchanged default draft in route state", async() => {
  const history = {push: vi.fn()};
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
  const history = {push: vi.fn()};

  await openNewSyncTargetOrganization(history);

  expect(OrganizationBackend.addOrganization).not.toHaveBeenCalled();
  expect(OrganizationBackend.updateOrganization).not.toHaveBeenCalled();
  expect(OrganizationBackend.deleteOrganization).not.toHaveBeenCalled();
});

test("does not show creation messages or broadcast organization changes at the entry", async() => {
  const history = {push: vi.fn()};
  const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

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
  const history = {push: vi.fn(() => {
    throw new Error("navigation failed");
  })};
  const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");
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
