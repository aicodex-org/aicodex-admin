/* eslint-env jest */
import {expect, jest} from "@jest/globals";
import i18next from "i18next";
import LdapTable from "./LdapTable";
import * as LdapBackend from "../backend/LdapBackend";
import * as Setting from "../Setting";
import en from "../locales/en/data.json";
import zh from "../locales/zh/data.json";

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

const ldapRows = [
  {
    id: "ldap-1",
    owner: "engineering",
    serverName: "Example LDAP Server",
    host: "example.com",
    port: 389,
    baseDn: "ou=People,dc=example,dc=com",
    autoSync: 0,
    lastSync: "",
  },
];

function createTable() {
  return new LdapTable({
    title: "LDAP servers",
    table: ldapRows,
    organizationName: "engineering",
    onUpdateTable: jest.fn(),
  });
}

function useSynchronousSetState(component: LdapTable) {
  (component as any).setState = (updater: any, callback?: () => void) => {
    const currentState = (component as any).state;
    const partial = typeof updater === "function" ? updater(currentState, (component as any).props) : updater;
    (component as any).state = {...currentState, ...partial};
    callback?.();
  };
}

describe("LdapTable", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("marks immediate LDAP operations as loading and explains delete impact", async() => {
    await useTestLanguage("en");
    const ldapTable = createTable();
    (ldapTable as any).state = {
      ...(ldapTable as any).state,
      addingLdap: true,
      deletingLdapIds: {"ldap-1": true},
    };

    const tableElement = (ldapTable as any).renderTable(ldapRows);
    const tableTitle = tableElement.props.title();
    const toolbar = tableTitle.props.children[0];
    const addButton = toolbar.props.children[1];
    const actionColumn = tableElement.props.columns[5];
    const rowActions = actionColumn.render(null, ldapRows[0], 0);
    const deleteAction = rowActions.props.children[2];

    expect(addButton.props.loading).toBe(true);
    expect(addButton.props.disabled).toBe(true);
    expect(deleteAction.props.loading).toBe(true);
    expect(deleteAction.props.disabled).toBe(true);
    expect(deleteAction.props.title).toBe("Delete LDAP server Example LDAP Server? This action takes effect immediately.");
  });

  test("prevents duplicate add and delete requests while a request is pending", async() => {
    await useTestLanguage("en");
    const ldapTable = createTable();
    useSynchronousSetState(ldapTable);

    let resolveAdd: (value: unknown) => void = () => undefined;
    const addPromise = new Promise(resolve => {
      resolveAdd = resolve;
    });
    const addSpy = jest.spyOn(LdapBackend, "addLdap").mockReturnValue(addPromise as any);

    const addRequest = (ldapTable as any).addRow([...ldapRows]);
    (ldapTable as any).addRow([...ldapRows]);

    expect(addSpy).toHaveBeenCalledTimes(1);
    expect((ldapTable as any).state.addingLdap).toBe(true);

    resolveAdd({status: "error", msg: "failed"});
    await addRequest;
    expect((ldapTable as any).state.addingLdap).toBe(false);

    let resolveDelete: (value: unknown) => void = () => undefined;
    const deletePromise = new Promise(resolve => {
      resolveDelete = resolve;
    });
    const deleteSpy = jest.spyOn(LdapBackend, "deleteLdap").mockReturnValue(deletePromise as any);

    const deleteRequest = (ldapTable as any).deleteRow([...ldapRows], 0);
    (ldapTable as any).deleteRow([...ldapRows], 0);

    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect((ldapTable as any).state.deletingLdapIds["ldap-1"]).toBe(true);

    resolveDelete({status: "error", msg: "failed"});
    await deleteRequest;
    expect((ldapTable as any).state.deletingLdapIds["ldap-1"]).toBeUndefined();
  });

  test("adds LDAP servers immediately and reports success, backend errors, and thrown errors", async() => {
    await useTestLanguage("zh");
    const onUpdateTable = jest.fn();
    const showMessageSpy = jest.spyOn(Setting, "showMessage").mockImplementation(() => undefined);
    const ldapTable = new LdapTable({
      title: "LDAP 服务器",
      table: ldapRows,
      organizationName: "engineering",
      onUpdateTable,
    });
    useSynchronousSetState(ldapTable);
    const addedLdap = {...ldapRows[0], id: "ldap-2", serverName: "Second LDAP Server"};

    jest.spyOn(LdapBackend, "addLdap").mockResolvedValueOnce({status: "ok", data2: addedLdap} as any);
    await (ldapTable as any).addRow([...ldapRows]);
    expect(showMessageSpy).toHaveBeenLastCalledWith("success", "添加成功");
    expect(onUpdateTable).toHaveBeenLastCalledWith([...ldapRows, addedLdap]);
    expect((ldapTable as any).state.addingLdap).toBe(false);

    jest.spyOn(LdapBackend, "addLdap").mockResolvedValueOnce({status: "error", msg: "duplicate"} as any);
    await (ldapTable as any).addRow([...ldapRows]);
    expect(showMessageSpy).toHaveBeenLastCalledWith("error", "添加失败: duplicate");

    jest.spyOn(LdapBackend, "addLdap").mockRejectedValueOnce("network down");
    await (ldapTable as any).addRow([...ldapRows]);
    expect(showMessageSpy).toHaveBeenLastCalledWith("error", "添加失败: network down");
  });

  test("deletes LDAP servers immediately and reports success, backend errors, and thrown errors", async() => {
    await useTestLanguage("zh");
    const onUpdateTable = jest.fn();
    const showMessageSpy = jest.spyOn(Setting, "showMessage").mockImplementation(() => undefined);
    const ldapTable = new LdapTable({
      title: "LDAP 服务器",
      table: ldapRows,
      organizationName: "engineering",
      onUpdateTable,
    });
    useSynchronousSetState(ldapTable);

    jest.spyOn(LdapBackend, "deleteLdap").mockResolvedValueOnce({status: "ok"} as any);
    await (ldapTable as any).deleteRow([...ldapRows], 0);
    expect(showMessageSpy).toHaveBeenLastCalledWith("success", "删除成功");
    expect(onUpdateTable).toHaveBeenLastCalledWith([]);
    expect((ldapTable as any).state.deletingLdapIds["ldap-1"]).toBeUndefined();

    jest.spyOn(LdapBackend, "deleteLdap").mockResolvedValueOnce({status: "error", msg: "in use"} as any);
    await (ldapTable as any).deleteRow([...ldapRows], 0);
    expect(showMessageSpy).toHaveBeenLastCalledWith("error", "删除失败: in use");

    jest.spyOn(LdapBackend, "deleteLdap").mockRejectedValueOnce("network down");
    await (ldapTable as any).deleteRow([...ldapRows], 0);
    expect(showMessageSpy).toHaveBeenLastCalledWith("error", "删除失败: network down");
  });

  test("renders compact LDAP table cells, toolbar description, and immediate operation buttons", async() => {
    await useTestLanguage("zh");
    const goToLinkSpy = jest.spyOn(Setting, "goToLink").mockImplementation(() => undefined);
    const table = [
      ldapRows[0],
      {...ldapRows[0], id: "ldap-2", serverName: "Second LDAP Server", autoSync: 5, lastSync: "2026-07-06 10:00:00"},
    ];
    const ldapTable = new LdapTable({
      title: "LDAP 服务器",
      description: "保存、同步、删除会立即生效。",
      table,
      organizationName: "engineering",
      onUpdateTable: jest.fn(),
    });
    const tableElement = (ldapTable as any).renderTable(table);
    const titleNode = tableElement.props.title();
    const [toolbar, description] = titleNode.props.children;
    const columns = tableElement.props.columns;

    expect(toolbar.props.children[0].props.children).toBe("LDAP 服务器");
    expect(description.props.children[1].props.children).toBe("保存、同步、删除会立即生效。");
    expect(columns[0].render("Example LDAP Server", table[0], 0).props.to).toBe("/ldap/engineering/ldap-1");
    expect(columns[1].render("example.com", table[0], 0)).toBe("example.com:389");
    expect(columns[3].render(0, table[0], 0).props.children).toBe("禁用");
    expect(columns[3].render(5, table[1], 1).props.children).toBe("每 5 分钟");
    expect(columns[4].render("", table[0], 0)).toBe("-");
    expect(columns[4].render("2026-07-06 10:00:00", table[1], 1)).toBe("2026-07-06 10:00:00");

    const rowActions = columns[5].render(null, table[0], 0);
    const [syncTooltip, editButton, deleteAction] = rowActions.props.children;
    expect(syncTooltip.props.title).toBe("进入 LDAP 用户同步页面");
    syncTooltip.props.children.props.onClick();
    editButton.props.onClick();
    expect(goToLinkSpy).toHaveBeenNthCalledWith(1, "/ldap/sync/engineering/ldap-1");
    expect(goToLinkSpy).toHaveBeenNthCalledWith(2, "/ldap/engineering/ldap-1");
    expect(deleteAction.props.title).toBe("删除 LDAP 服务器 Example LDAP Server？此操作将立即生效。");
  });

  test("keeps LDAP table sorters, field updates, and empty descriptions stable", async() => {
    await useTestLanguage("zh");
    const onUpdateTable = jest.fn();
    const table = [
      {...ldapRows[0], id: "ldap-b", serverName: "Beta", host: "z.example.com", baseDn: "ou=Z,dc=example,dc=com", autoSync: "10", lastSync: "2026-07-06"},
      {...ldapRows[0], id: "ldap-a", serverName: "Alpha", host: "a.example.com", baseDn: "ou=A,dc=example,dc=com", autoSync: "0", lastSync: ""},
    ];
    const ldapTable = new LdapTable({
      title: null,
      table,
      organizationName: "engineering",
      onUpdateTable,
    });
    useSynchronousSetState(ldapTable);
    const tableElement = (ldapTable as any).renderTable(table);
    const titleNode = tableElement.props.title();
    const [toolbar, description] = titleNode.props.children;
    const columns = tableElement.props.columns;

    expect(toolbar.props.children[0]).toBeNull();
    expect(description).toBeNull();
    expect(columns[0].sorter(table[0], table[1])).toBeGreaterThan(0);
    expect(columns[1].sorter(table[0], table[1])).toBeGreaterThan(0);
    expect(columns[2].sorter(table[0], table[1])).toBeGreaterThan(0);
    expect(columns[3].sorter(table[0], table[1])).toBeGreaterThan(0);
    expect(columns[4].sorter(table[0], table[1])).toBeGreaterThan(0);

    (ldapTable as any).updateField(table, 0, "host", "ldap.example.com");
    expect(onUpdateTable).toHaveBeenLastCalledWith([
      {...table[0], host: "ldap.example.com"},
      table[1],
    ]);

    jest.spyOn(LdapBackend, "addLdap").mockResolvedValueOnce({status: "error", msg: "duplicate"} as any);
    await toolbar.props.children[1].props.onClick();
    expect((ldapTable as any).state.addingLdap).toBe(false);
  });

  test("wires LDAP delete confirmation to the immediate delete request", async() => {
    await useTestLanguage("zh");
    const onUpdateTable = jest.fn();
    const ldapTable = new LdapTable({
      title: "LDAP 服务器",
      table: ldapRows,
      organizationName: "engineering",
      onUpdateTable,
    });
    useSynchronousSetState(ldapTable);
    const deleteSpy = jest.spyOn(LdapBackend, "deleteLdap").mockResolvedValueOnce({status: "ok"} as any);
    const actionColumn = (ldapTable as any).renderTable([...ldapRows]).props.columns[5];
    const deleteAction = actionColumn.render(null, ldapRows[0], 0).props.children[2];

    await deleteAction.props.onConfirm();

    expect(deleteSpy).toHaveBeenCalledWith(ldapRows[0]);
    expect(onUpdateTable).toHaveBeenLastCalledWith([]);
  });
});
