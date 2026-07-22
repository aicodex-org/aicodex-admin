import {afterEach, beforeEach, expect, test, vi} from "vitest";
import * as Setting from "../Setting";
import {
  addInvitation,
  deleteInvitation,
  getInvitation,
  getInvitationCodeInfo,
  getInvitations,
  sendInvitation,
  updateInvitation,
  verifyInvitation
} from "./InvitationBackend";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(() => Promise.resolve({
    json: () => Promise.resolve({status: "ok"}),
  }));
  global.fetch = fetchMock as unknown as typeof fetch;
  vi.spyOn(Setting, "getAcceptLanguage").mockReturnValue("zh");
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("calls invitation list endpoint with the existing query contract", async() => {
  await getInvitations("engineering", 2, 20, "name", "main", "updatedTime", "descend");

  expect(global.fetch).toHaveBeenCalledWith(
    "/api/get-invitations?owner=engineering&p=2&pageSize=20&field=name&value=main&sortField=updatedTime&sortOrder=descend",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: {"Accept-Language": "zh"},
    })
  );
});

test("keeps invitation list default query parameters empty", async() => {
  await getInvitations("engineering");

  expect(global.fetch).toHaveBeenCalledWith(
    "/api/get-invitations?owner=engineering&p=&pageSize=&field=&value=&sortField=&sortOrder=",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: {"Accept-Language": "zh"},
    })
  );
});

test("calls invitation detail, code info and verify endpoints with encoded names", async() => {
  await getInvitation("engineering", "invite main");
  await getInvitationCodeInfo("invite-code", "app main");
  await verifyInvitation("engineering", "invite main");

  expect(global.fetch).toHaveBeenNthCalledWith(1, "/api/get-invitation?id=engineering/invite%20main", expect.objectContaining({method: "GET"}));
  expect(global.fetch).toHaveBeenNthCalledWith(2, "/api/get-invitation-info?code=invite-code&applicationId=app%20main", expect.objectContaining({method: "GET"}));
  expect(global.fetch).toHaveBeenNthCalledWith(3, "/api/verify-invitation?id=engineering/invite%20main", expect.objectContaining({method: "GET"}));
});

test("calls invitation mutation endpoints with cloned payloads", async() => {
  const invitation = {
    owner: "engineering",
    name: "invite-main",
    displayName: "Main invitation",
    code: "code-main",
    defaultCode: "code-main",
    quota: 1,
    usedCount: 0,
    application: "All",
    username: "",
    email: "",
    phone: "",
    signupGroup: "",
    state: "Active",
  };

  await addInvitation(invitation);
  await updateInvitation("engineering", "invite-main", invitation);
  await deleteInvitation(invitation);

  expect(global.fetch).toHaveBeenNthCalledWith(1, "/api/add-invitation", expect.objectContaining({method: "POST"}));
  expect(global.fetch).toHaveBeenNthCalledWith(2, "/api/update-invitation?id=engineering/invite-main", expect.objectContaining({method: "POST"}));
  expect(global.fetch).toHaveBeenNthCalledWith(3, "/api/delete-invitation", expect.objectContaining({method: "POST"}));
  fetchMock.mock.calls.forEach(([, options]) => {
    expect(options).toEqual(expect.objectContaining({
      credentials: "include",
      headers: {"Accept-Language": "zh"},
      body: JSON.stringify(invitation),
    }));
  });
});

test("calls invitation send endpoint with destination payload", async() => {
  await sendInvitation({owner: "engineering", name: "invite main"}, ["user@example.com"]);

  expect(global.fetch).toHaveBeenCalledWith(
    "/api/send-invitation?id=engineering/invite%20main",
    expect.objectContaining({
      method: "POST",
      credentials: "include",
      headers: {"Accept-Language": "zh"},
      body: JSON.stringify(["user@example.com"]),
    })
  );
});
