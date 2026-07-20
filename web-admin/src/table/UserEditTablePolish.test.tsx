import {describe, expect, test, vi} from "vitest";
import React from "react";
import i18next from "i18next";
import CartTable from "./CartTable";
import ConsentTable from "./ConsentTable";
import FaceIdTable from "./FaceIdTable";
import ManagedAccountTable from "./ManagedAccountTable";
import MfaAccountTable from "./MfaAccountTable";
import TransactionTable from "./TransactionTable";
import WebAuthnCredentialTable from "./WebauthnCredentialTable";
import * as ConsentBackend from "../backend/ConsentBackend";
import * as ResourceBackend from "../backend/ResourceBackend";
import * as Setting from "../Setting";
import * as UserWebauthnBackend from "../backend/UserWebauthnBackend";
import en from "../locales/en/data.json";
import zh from "../locales/zh/data.json";

type LegacyAny = import("../types/legacyPage").LegacyAny;

async function useTestLanguage(language: string) {
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

  Object.entries(en).forEach(([namespace, values]) => {
    i18next.addResourceBundle("en", namespace, values, true, true);
  });
  Object.entries(zh).forEach(([namespace, values]) => {
    i18next.addResourceBundle("zh", namespace, values, true, true);
  });
  await i18next.changeLanguage(language);
}

function getToolbar(tableElement: React.ReactElement): React.ReactElement {
  return tableElement.props.title();
}

function getToolbarActions(toolbar: React.ReactElement): React.ReactElement {
  return toolbar.props.children[1];
}

function getToolbarTitle(toolbar: React.ReactElement): React.ReactElement {
  return toolbar.props.children[0];
}

function getToolbarButtonText(node: React.ReactElement): React.ReactNode {
  const child = node.props.children;
  return React.isValidElement<{children?: React.ReactNode}>(child) ? child.props.children : child;
}

function installLocalSetState(component: LegacyAny) {
  component.setState = vi.fn((stateOrUpdater: LegacyAny) => {
    const nextState = typeof stateOrUpdater === "function" ? stateOrUpdater(component.state, component.props) : stateOrUpdater;
    component.state = {...component.state, ...nextState};
  });
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("User edit embedded table polish", () => {
  test("keeps table titles in the toolbar while keeping actions reachable", async() => {
    await useTestLanguage("zh");
    const managedTable = new ManagedAccountTable({title: "托管账户", table: [], applications: [], onUpdateTable: vi.fn()});
    const managedToolbar = getToolbar((managedTable as LegacyAny).renderTable([]));
    expect(getToolbarTitle(managedToolbar).props.children).toBe("托管账户");
    expect(getToolbarActions(managedToolbar).props.className).toBe("user-edit-table-toolbar-actions");
    expect(getToolbarActions(managedToolbar).props.children.props.children).toBe("添加");

    const mfaAccountTable = new MfaAccountTable({title: "MFA账户", table: [], onUpdateTable: vi.fn()});
    const mfaToolbar = getToolbar((mfaAccountTable as LegacyAny).renderTable([]));
    expect(getToolbarTitle(mfaToolbar).props.children).toBe("MFA账户");
    expect(getToolbarActions(mfaToolbar).props.children.map((node: React.ReactElement) => getToolbarButtonText(node))).toEqual(["添加", "二维码", "链接"]);

    const faceIdTable = new FaceIdTable({title: "Face IDs", table: [], account: {owner: "built-in", name: "alice"}, onUpdateTable: vi.fn()});
    installLocalSetState(faceIdTable);
    const faceToolbar = getToolbar((faceIdTable as LegacyAny).renderTable([]));
    expect(getToolbarTitle(faceToolbar).props.children).toBe("Face IDs");
    expect(getToolbarActions(faceToolbar).props.children[0].props.children).toBe("添加人脸ID");
    expect(faceToolbar.props.children[2].props.children.props.open).toBe(false);
    expect(faceToolbar.props.children[2].props.children.props.visible).toBeUndefined();
    getToolbarActions(faceToolbar).props.children[0].props.onClick();
    const openedFaceToolbar = getToolbar((faceIdTable as LegacyAny).renderTable([]));
    expect(openedFaceToolbar.props.children[2].props.children.props.open).toBe(true);

    const webAuthnTable = new WebAuthnCredentialTable({title: "WebAuthn 凭据", table: [], isSelf: true, updateTable: vi.fn(), refresh: vi.fn()});
    const webAuthnToolbar = getToolbar(webAuthnTable.render());
    expect(getToolbarTitle(webAuthnToolbar).props.children).toBe("WebAuthn 凭据");
    expect(getToolbarActions(webAuthnToolbar).props.children.props.children).toBe("添加");
  });

  test("keeps table row edits in sync without leaking internal row keys", async() => {
    await useTestLanguage("zh");
    const onManagedUpdate = vi.fn();
    const managedTable = new ManagedAccountTable({table: [], applications: [{name: "crm"}], onUpdateTable: onManagedUpdate});
    installLocalSetState(managedTable);

    (managedTable as LegacyAny).updateTable([{key: 7, application: "crm", signinUrl: "https://example.test", username: "alice", password: "secret"}]);
    expect(onManagedUpdate).toHaveBeenCalledWith([{application: "crm", signinUrl: "https://example.test", username: "alice", password: "secret"}]);

    const onMfaAccountUpdate = vi.fn();
    const mfaAccountTable = new MfaAccountTable({table: [], onUpdateTable: onMfaAccountUpdate});
    installLocalSetState(mfaAccountTable);

    (mfaAccountTable as LegacyAny).updateTable([{key: 3, accountName: "alice", issuer: "github", origin: "totp", secretKey: "secret"}]);
    expect(onMfaAccountUpdate).toHaveBeenCalledWith([{accountName: "alice", issuer: "github", origin: "totp", secretKey: "secret"}]);
  });

  test("wires managed account table column edits and row actions", async() => {
    await useTestLanguage("zh");
    const table = [
      {key: 0, application: "crm", signinUrl: "https://crm.example.test", username: "alice", password: "secret-a"},
      {key: 1, application: "portal", signinUrl: "https://portal.example.test", username: "bob", password: "secret-b"},
    ];
    const onUpdateTable = vi.fn();
    const managedTable = new ManagedAccountTable({table, applications: [{name: "crm"}, {name: "portal"}], onUpdateTable});
    installLocalSetState(managedTable);
    const tableElement = (managedTable as LegacyAny).renderTable(table);
    const columns = tableElement.props.columns;

    columns[0].render("crm", table[0], 0).props.onChange("portal");
    expect(onUpdateTable).toHaveBeenLastCalledWith([
      {application: "portal", signinUrl: "https://crm.example.test", username: "alice", password: "secret-a"},
      {application: "portal", signinUrl: "https://portal.example.test", username: "bob", password: "secret-b"},
    ]);

    columns[1].render("https://crm.example.test", table[0], 0).props.onChange({target: {value: "https://updated.example.test"}});
    columns[2].render("alice", table[0], 0).props.onChange({target: {value: "carol"}});
    columns[3].render("secret-a", table[0], 0).props.onChange({target: {value: "new-secret"}});
    expect(onUpdateTable).toHaveBeenLastCalledWith([
      {application: "portal", signinUrl: "https://updated.example.test", username: "carol", password: "new-secret"},
      {application: "portal", signinUrl: "https://portal.example.test", username: "bob", password: "secret-b"},
    ]);

    const actionCell = columns[4].render(undefined, table[1], 1);
    expect(actionCell.props.children).toHaveLength(3);

    (managedTable as LegacyAny).addRow(undefined);
    expect(onUpdateTable).toHaveBeenLastCalledWith([{application: "", username: "", password: ""}]);

    (managedTable as LegacyAny).upRow([
      {key: 0, application: "crm", signinUrl: "https://crm.example.test", username: "alice", password: "secret-a"},
      {key: 1, application: "portal", signinUrl: "https://portal.example.test", username: "bob", password: "secret-b"},
    ], 1);
    expect(onUpdateTable).toHaveBeenLastCalledWith([
      {application: "portal", signinUrl: "https://portal.example.test", username: "bob", password: "secret-b"},
      {application: "crm", signinUrl: "https://crm.example.test", username: "alice", password: "secret-a"},
    ]);
    (managedTable as LegacyAny).downRow([
      {key: 0, application: "crm", signinUrl: "https://crm.example.test", username: "alice", password: "secret-a"},
      {key: 1, application: "portal", signinUrl: "https://portal.example.test", username: "bob", password: "secret-b"},
    ], 0);
    expect(onUpdateTable).toHaveBeenLastCalledWith([
      {application: "portal", signinUrl: "https://portal.example.test", username: "bob", password: "secret-b"},
      {application: "crm", signinUrl: "https://crm.example.test", username: "alice", password: "secret-a"},
    ]);
    (managedTable as LegacyAny).deleteRow([
      {key: 0, application: "crm", signinUrl: "https://crm.example.test", username: "alice", password: "secret-a"},
      {key: 1, application: "portal", signinUrl: "https://portal.example.test", username: "bob", password: "secret-b"},
    ], 0);
    expect(onUpdateTable).toHaveBeenLastCalledWith([
      {application: "portal", signinUrl: "https://portal.example.test", username: "bob", password: "secret-b"},
    ]);
  });

  test("wires MFA account table column edits, logo fallback, and row actions", async() => {
    await useTestLanguage("zh");
    const table = [
      {key: 0, accountName: "alice", issuer: "github", origin: "totp", secretKey: "secret-a"},
      {key: 1, accountName: "bob", issuer: "", origin: "sms", secretKey: "secret-b"},
    ];
    const onUpdateTable = vi.fn();
    const mfaAccountTable = new MfaAccountTable({table, onUpdateTable});
    installLocalSetState(mfaAccountTable);
    const tableElement = (mfaAccountTable as LegacyAny).renderTable(table);
    const columns = tableElement.props.columns;

    columns[0].render("alice", table[0], 0).props.onChange({target: {value: "carol"}});
    columns[1].render("github", table[0], 0).props.onChange({target: {value: "gitlab"}});
    columns[2].render("totp", table[0], 0).props.onChange({target: {value: "app"}});
    columns[3].render("secret-a", table[0], 0).props.onChange({target: {value: "new-secret"}});
    expect(onUpdateTable).toHaveBeenLastCalledWith([
      {accountName: "carol", issuer: "gitlab", origin: "app", secretKey: "new-secret"},
      {accountName: "bob", issuer: "", origin: "sms", secretKey: "secret-b"},
    ]);

    const githubLogo = columns[4].render("github", table[0], 0).props.children;
    const defaultLogo = columns[4].render("", table[1], 1).props.children;
    expect(githubLogo.props.src).toContain("social_github.png");
    expect(defaultLogo.props.src).toContain("social_default.png");

    const secondRowActions = columns[5].render(undefined, table[1], 1);
    expect(secondRowActions.props.children).toHaveLength(3);

    (mfaAccountTable as LegacyAny).addRow(undefined);
    expect(onUpdateTable).toHaveBeenLastCalledWith([{accountName: "", issuer: "", secretKey: ""}]);

    (mfaAccountTable as LegacyAny).upRow([
      {key: 0, accountName: "alice", issuer: "github", origin: "totp", secretKey: "secret-a"},
      {key: 1, accountName: "bob", issuer: "", origin: "sms", secretKey: "secret-b"},
    ], 1);
    expect(onUpdateTable).toHaveBeenLastCalledWith([
      {accountName: "bob", issuer: "", origin: "sms", secretKey: "secret-b"},
      {accountName: "alice", issuer: "github", origin: "totp", secretKey: "secret-a"},
    ]);
    (mfaAccountTable as LegacyAny).downRow([
      {key: 0, accountName: "alice", issuer: "github", origin: "totp", secretKey: "secret-a"},
      {key: 1, accountName: "bob", issuer: "", origin: "sms", secretKey: "secret-b"},
    ], 0);
    expect(onUpdateTable).toHaveBeenLastCalledWith([
      {accountName: "bob", issuer: "", origin: "sms", secretKey: "secret-b"},
      {accountName: "alice", issuer: "github", origin: "totp", secretKey: "secret-a"},
    ]);
    (mfaAccountTable as LegacyAny).deleteRow([
      {key: 0, accountName: "alice", issuer: "github", origin: "totp", secretKey: "secret-a"},
      {key: 1, accountName: "bob", issuer: "", origin: "sms", secretKey: "secret-b"},
    ], 0);
    expect(onUpdateTable).toHaveBeenLastCalledWith([
      {accountName: "bob", issuer: "", origin: "sms", secretKey: "secret-b"},
    ]);
  });

  test("uses localized compact columns for MFA accounts and embedded transactions", async() => {
    await useTestLanguage("zh");
    const mfaAccountTable = new MfaAccountTable({table: [], onUpdateTable: vi.fn()});
    const mfaAccountElement = (mfaAccountTable as LegacyAny).renderTable([]);
    expect(mfaAccountElement.props.tableLayout).toBe("fixed");
    expect(mfaAccountElement.props.columns.map((column: LegacyAny) => column.title)).toEqual(["账号", "发行方", "来源", "密钥", "图标", "操作"]);
    expect(mfaAccountElement.props.columns.map((column: LegacyAny) => column.width)).toEqual([180, 140, 130, 160, 52, 92]);

    const transaction = {
      owner: "built-in",
      name: "tx_001",
      createdTime: "2026-06-20T10:00:00Z",
      application: "portal",
      domain: "example.test",
      amount: 42,
      currency: "USD",
    };
    const transactionTable = new TransactionTable({transactions: [transaction], hideTag: true, embedded: true});
    const transactionElement = transactionTable.render();

    expect(transactionElement.props.className).toBe("transaction-table-embedded user-edit-embedded-table");
    expect(transactionElement.props.scroll).toBeUndefined();
    expect(transactionElement.props.tableLayout).toBe("fixed");
    expect(transactionElement.props.columns.map((column: LegacyAny) => column.key)).toEqual(["name", "createdTime", "application", "domain", "amount"]);
    expect(transactionElement.props.columns.map((column: LegacyAny) => column.width)).toEqual([180, 136, 112, 190, 132]);
    expect(transactionElement.props.columns[4].align).toBe("right");
  });

  test("uses compact empty state for embedded user edit tables", async() => {
    await useTestLanguage("zh");

    const managedTable = new ManagedAccountTable({title: "托管账户", table: [], applications: [], embedded: true, onUpdateTable: vi.fn()});
    const managedElement = (managedTable as LegacyAny).renderTable([]);
    expect(managedElement.props.className).toBe("user-edit-embedded-table");
    expect(managedElement.props.showHeader).toBe(false);
    expect(managedElement.props.locale.emptyText.props.children).toBe("暂无数据");

    const mfaAccountTable = new MfaAccountTable({title: "MFA账户", table: [], embedded: true, onUpdateTable: vi.fn()});
    const mfaAccountElement = (mfaAccountTable as LegacyAny).renderTable([]);
    expect(mfaAccountElement.props.showHeader).toBe(false);
    expect(mfaAccountElement.props.locale.emptyText.props.children).toBe("暂无数据");

    const faceIdTable = new FaceIdTable({title: "Face IDs", table: [], embedded: true, account: {owner: "built-in", name: "alice"}, onUpdateTable: vi.fn()});
    const faceIdElement = (faceIdTable as LegacyAny).renderTable([]);
    expect(faceIdElement.props.showHeader).toBe(false);
    expect(faceIdElement.props.locale.emptyText.props.children).toBe("暂无数据");

    const webAuthnTable = new WebAuthnCredentialTable({title: "WebAuthn 凭据", table: [], embedded: true, isSelf: true, updateTable: vi.fn(), refresh: vi.fn()});
    const webAuthnElement = webAuthnTable.render();
    expect(webAuthnElement.props.showHeader).toBe(false);
    expect(webAuthnElement.props.locale.emptyText.props.children).toBe("暂无数据");

    const consentTable = new ConsentTable({table: [], embedded: true, title: null, onUpdateTable: vi.fn()});
    const consentElement = (consentTable as LegacyAny).renderTable([]);
    expect(consentElement.props.showHeader).toBe(false);
    expect(consentElement.props.locale.emptyText.props.children).toBe("暂无数据");

    const transactionTable = new TransactionTable({transactions: [], hideTag: true, embedded: true});
    const transactionElement = transactionTable.render();
    expect(transactionElement.props.showHeader).toBe(false);
    expect(transactionElement.props.locale.emptyText.props.children).toBe("暂无数据");

    const cartTable = new CartTable({cart: [], embedded: true});
    const cartElement = cartTable.render();
    expect(cartElement.props.showHeader).toBe(false);
    expect(cartElement.props.locale.emptyText.props.children).toBe("暂无数据");
  });

  test("keeps consent table i18n and removes title area when field label already names it", async() => {
    await useTestLanguage("zh");
    const table = [{application: "portal", grantedScopes: ["read", "write"]}];
    const titledConsentTable = new ConsentTable({table, title: "授权记录", onUpdateTable: vi.fn()});
    const titledElement = (titledConsentTable as LegacyAny).renderTable(table);
    const toolbar = getToolbar(titledElement);
    expect(toolbar.props.children.props.children).toBe("授权记录");
    expect(titledElement.props.columns.map((column: LegacyAny) => column.title)).toEqual(["应用", "已授权范围", "操作"]);

    const scopeCell = titledElement.props.columns[1].render(["read"], table[0], 0);
    expect(scopeCell.props.children[0].props.title).toBe("确定要撤销该授权范围吗: read?");
    expect(scopeCell.props.children[0].props.children.props.children).toBe("read");

    const actionCell = titledElement.props.columns[2].render(undefined, table[0], 0);
    expect(actionCell.props.title).toBe("确定要撤销该授权记录吗？");
    expect(actionCell.props.children.props.children).toBe("撤销");

    const embeddedConsentTable = new ConsentTable({table, title: null, onUpdateTable: vi.fn()});
    const embeddedElement = (embeddedConsentTable as LegacyAny).renderTable(table);
    expect(embeddedElement.props.title).toBeUndefined();
  });

  test("uploads Face ID images and keeps face row actions wired", async() => {
    await useTestLanguage("zh");
    const table = [{name: "face-a", faceIdData: [1, 2, 3, 4, 5, 6], imageUrl: "https://example.test/face.png"}];
    const onUpdateTable = vi.fn();
    const faceIdTable = new FaceIdTable({table, account: {owner: "built-in", name: "alice"}, onUpdateTable});
    installLocalSetState(faceIdTable);
    const tableElement = (faceIdTable as LegacyAny).renderTable(table);
    const columns = tableElement.props.columns;

    columns[0].render("face-a", table[0], 0).props.onChange({target: {value: "face-b"}});
    expect(onUpdateTable).toHaveBeenLastCalledWith([{name: "face-b", faceIdData: [1, 2, 3, 4, 5, 6], imageUrl: "https://example.test/face.png"}]);
    expect(columns[1].render([1, 2, 3, 4, 5, 6], table[0], 0)).toBe("[1, 2, 3 ... 4, 5, 6]");
    expect(columns[2].render("https://example.test/face.png", table[0], 0)).toBe("https://example.test/face.png");

    columns[3].render(undefined, table[0], 0).props.onClick();
    expect(onUpdateTable).toHaveBeenLastCalledWith([]);

    (faceIdTable as LegacyAny).addFaceId(undefined, [7, 8, 9]);
    expect(onUpdateTable).toHaveBeenLastCalledWith([expect.objectContaining({faceIdData: [7, 8, 9]})]);
    (faceIdTable as LegacyAny).addFaceImage(undefined, "https://example.test/uploaded.png");
    expect(onUpdateTable).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({imageUrl: "https://example.test/uploaded.png", faceIdData: []})]));

    const uploadResourceSpy = vi.spyOn(ResourceBackend, "uploadResource").mockResolvedValue({status: "ok", data: "https://example.test/uploaded.png"} as LegacyAny);
    const showMessageSpy = vi.spyOn(Setting, "showMessage").mockImplementation(() => undefined);
    const upload = getToolbarActions(getToolbar(tableElement)).props.children[2];
    upload.props.onChange({fileList: [{name: "face.png"}], file: new Blob(["face"])});
    await flushPromises();

    expect(uploadResourceSpy).toHaveBeenCalledWith("built-in", "alice", "custom", "ResourceListPage", "resource/built-in/alice/face.png", expect.any(Blob));
    expect(showMessageSpy).toHaveBeenCalledWith("success", "文件上传成功");
    expect(onUpdateTable).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({imageUrl: "https://example.test/uploaded.png", faceIdData: []})]));
    uploadResourceSpy.mockRestore();
    showMessageSpy.mockRestore();
  });

  test("handles WebAuthn registration and local delete feedback", async() => {
    await useTestLanguage("zh");
    const table = [{id: "cred-a"}, {id: "cred-b"}];
    const updateTable = vi.fn();
    const refresh = vi.fn();
    const webAuthnTable = new WebAuthnCredentialTable({table, isSelf: true, updateTable, refresh});
    const showMessageSpy = vi.spyOn(Setting, "showMessage").mockImplementation(() => undefined);

    webAuthnTable.deleteRow(table, 0);
    expect(updateTable).toHaveBeenCalledWith([{id: "cred-b"}]);

    vi.spyOn(UserWebauthnBackend, "registerWebauthnCredential").mockResolvedValueOnce({status: "ok"} as LegacyAny);
    webAuthnTable.registerWebAuthn();
    await flushPromises();
    expect(showMessageSpy).toHaveBeenCalledWith("success", "WebAuthn 凭据添加成功");
    expect(refresh).toHaveBeenCalledTimes(1);

    vi.spyOn(UserWebauthnBackend, "registerWebauthnCredential").mockResolvedValueOnce({status: "error", msg: "denied"} as LegacyAny);
    webAuthnTable.registerWebAuthn();
    await flushPromises();
    expect(showMessageSpy).toHaveBeenCalledWith("error", "denied");
    expect(refresh).toHaveBeenCalledTimes(2);

    vi.spyOn(UserWebauthnBackend, "registerWebauthnCredential").mockRejectedValueOnce("offline");
    webAuthnTable.registerWebAuthn();
    await flushPromises();
    expect(showMessageSpy).toHaveBeenCalledWith("error", "连接服务器失败: offline");

    showMessageSpy.mockRestore();
    vi.restoreAllMocks();
  });

  test("revokes consent scopes with localized success and error feedback", async() => {
    await useTestLanguage("zh");
    const record = {application: "portal", grantedScopes: ["read", "write"]};
    const onUpdateTable = vi.fn();
    const consentTable = new ConsentTable({table: [record], onUpdateTable});
    const showMessageSpy = vi.spyOn(Setting, "showMessage").mockImplementation(() => undefined);

    vi.spyOn(ConsentBackend, "revokeConsent").mockResolvedValueOnce({status: "ok"} as LegacyAny);
    consentTable.deleteScope(record, "read");
    await flushPromises();
    expect(ConsentBackend.revokeConsent).toHaveBeenCalledWith({application: "portal", grantedScopes: ["read"]});
    expect(showMessageSpy).toHaveBeenCalledWith("success", "撤销成功");
    expect(onUpdateTable).toHaveBeenCalledTimes(1);

    vi.spyOn(ConsentBackend, "revokeConsent").mockResolvedValueOnce({status: "error", msg: "denied"} as LegacyAny);
    consentTable.deleteScope(record);
    await flushPromises();
    expect(ConsentBackend.revokeConsent).toHaveBeenCalledWith({application: "portal", grantedScopes: ["read", "write"]});
    expect(showMessageSpy).toHaveBeenCalledWith("error", "denied");

    vi.spyOn(ConsentBackend, "revokeConsent").mockRejectedValueOnce("offline");
    consentTable.deleteScope(record);
    await flushPromises();
    expect(showMessageSpy).toHaveBeenCalledWith("error", "连接服务器失败: offline");

    showMessageSpy.mockRestore();
    vi.restoreAllMocks();
  });
});
