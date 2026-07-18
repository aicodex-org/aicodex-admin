import {describe, expect, test, vi} from "vitest";
import i18next from "i18next";
import AccountTable from "./AccountTable";
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

function getOptionByValue(options: Array<{value: string; label: any}>, value: string) {
  return options.find(option => option.value === value);
}

function expectAccountItemLabel(option: {value: string; label: any} | undefined, primary: string, secondary?: string) {
  expect(option).toBeDefined();
  const label = option!.label;
  const children = label.props.children;
  expect(children[0].props.children).toBe(primary);
  if (secondary === undefined) {
    expect(children[1]).toBeNull();
  } else {
    expect(children[1].props.children).toBe(secondary);
  }
}

function useSynchronousSetState(component: AccountTable) {
  (component as any).setState = (updater: any, callback?: () => void) => {
    const currentState = (component as any).state;
    const partial = typeof updater === "function" ? updater(currentState, (component as any).props) : updater;
    (component as any).state = {...currentState, ...partial};
    callback?.();
  };
}

describe("AccountTable", () => {
  test("keeps account item values stable while rendering localized field labels", async() => {
    await useTestLanguage("zh");
    const table = [
      {name: "Last name", visible: true, viewRule: "Public", modifyRule: "Self", tab: ""},
      {name: "Avatar", visible: true, viewRule: "Public", modifyRule: "Self", tab: ""},
    ];
    const accountTable = new AccountTable({table, onUpdateTable: vi.fn()});
    const tableElement = (accountTable as any).renderTable(table);
    const nameColumn = tableElement.props.columns[0];
    const selectElement = nameColumn.render("Last name", table[0], 0);

    expect(nameColumn.width).toBe(320);
    expect(nameColumn.title).toBe("属性");
    expect(selectElement.props.optionLabelProp).toBe("label");
    expect(selectElement.props.value).toBe("Last name");
    expectAccountItemLabel(getOptionByValue(selectElement.props.options, "Last name"), "姓氏", "Last name");
    expectAccountItemLabel(getOptionByValue(selectElement.props.options, "ID"), "ID");
    expect(getOptionByValue(selectElement.props.options, "Avatar")).toBeUndefined();
  });

  test("keeps account rule values stable while rendering localized permission labels", async() => {
    await useTestLanguage("zh");
    const table = [
      {name: "Email", visible: true, viewRule: "Public", modifyRule: "Self", tab: ""},
    ];
    const accountTable = new AccountTable({table, onUpdateTable: vi.fn()});
    const tableElement = (accountTable as any).renderTable(table);
    const viewRuleColumn = tableElement.props.columns[4];
    const modifyRuleColumn = tableElement.props.columns[5];
    const viewRuleSelect = viewRuleColumn.render("Public", table[0], 0);
    const modifyRuleSelect = modifyRuleColumn.render("Self", table[0], 0);

    expect(viewRuleSelect.props.optionLabelProp).toBe("label");
    expect(viewRuleSelect.props.value).toBe("Public");
    expect(viewRuleSelect.props.options).toEqual([
      {value: "Public", label: "所有人可见"},
      {value: "Self", label: "仅本人可见"},
      {value: "Admin", label: "仅管理员可见"},
    ]);
    expect(modifyRuleSelect.props.optionLabelProp).toBe("label");
    expect(modifyRuleSelect.props.value).toBe("Self");
    expect(modifyRuleSelect.props.options).toEqual([
      {value: "Self", label: "本人可改"},
      {value: "Admin", label: "管理员可改"},
      {value: "Immutable", label: "不可修改"},
    ]);
  });

  test("uses original row indexes when updating a filtered table", async() => {
    await useTestLanguage("zh");
    const onUpdateTable = vi.fn();
    const table = [
      {name: "Email", visible: true, viewRule: "Public", modifyRule: "Self", tab: ""},
      {name: "Properties", visible: false, viewRule: "Public", modifyRule: "Self", tab: ""},
    ];
    const accountTable = new AccountTable({table, onUpdateTable});
    (accountTable as any).state = {...(accountTable as any).state, showHiddenOnly: true};

    const tableElement = (accountTable as any).renderTable(table);
    const visibleColumn = tableElement.props.columns[1];
    visibleColumn.render(false, tableElement.props.dataSource[0], 0).props.onChange(true);

    expect(onUpdateTable).toHaveBeenCalledWith([
      {name: "Email", visible: true, viewRule: "Public", modifyRule: "Self", tab: ""},
      {name: "Properties", visible: true, viewRule: "Public", modifyRule: "Self", tab: ""},
    ]);
  });

  test("filters account items by localized labels and operational flags", async() => {
    await useTestLanguage("zh");
    const table = [
      {name: "Last name", visible: true, viewRule: "Public", modifyRule: "Self", tab: "profile", regex: ""},
      {name: "Email", visible: true, viewRule: "Public", modifyRule: "Immutable", tab: "contact", regex: ".+@.+"},
      {name: "Properties", visible: false, viewRule: "Public", modifyRule: "Self", tab: "", regex: ""},
    ];
    const accountTable = new AccountTable({table, onUpdateTable: vi.fn()});

    (accountTable as any).state = {...(accountTable as any).state, searchText: "姓氏"};
    expect((accountTable as any).getFilteredRows(table).map((row: any) => row.name)).toEqual(["Last name"]);

    (accountTable as any).state = {...(accountTable as any).state, searchText: "", showEditableOnly: true};
    expect((accountTable as any).getFilteredRows(table).map((row: any) => row.name)).toEqual(["Last name"]);

    (accountTable as any).state = {...(accountTable as any).state, showEditableOnly: false, showHiddenOnly: true};
    expect((accountTable as any).getFilteredRows(table).map((row: any) => row.name)).toEqual(["Properties"]);

    (accountTable as any).state = {...(accountTable as any).state, showHiddenOnly: false, showRegexOnly: true};
    expect((accountTable as any).getFilteredRows(table).map((row: any) => row.name)).toEqual(["Email"]);
  });

  test("renders empty, hidden, and admin-only account fields with stable controls", async() => {
    await useTestLanguage("zh");
    const onUpdateTable = vi.fn();
    const table = [
      {name: "Email", visible: true, viewRule: "Public", modifyRule: "Self", tab: "", regex: ""},
      {name: "Avatar", visible: true, viewRule: "Public", modifyRule: "Self", tab: "", regex: ""},
      {name: "Is admin", visible: true, viewRule: "Admin", modifyRule: "Admin", tab: "", regex: ""},
      {name: "Properties", visible: false, viewRule: "Public", modifyRule: "Self", tab: "", regex: ""},
    ];
    const accountTable = new AccountTable({title: "账号资料", table, onUpdateTable});
    const tableElement = (accountTable as any).renderTable(table);
    const tabColumn = tableElement.props.columns[2];
    const regexColumn = tableElement.props.columns[3];
    const viewRuleColumn = tableElement.props.columns[4];
    const modifyRuleColumn = tableElement.props.columns[5];

    const emptyTabInput = tabColumn.render("", table[0], 0);
    expect(emptyTabInput.props.className).toBe("organization-account-table-quiet-input");
    expect(emptyTabInput.props.placeholder).toBe("未设置");
    emptyTabInput.props.onChange({target: {value: "profile"}});
    expect(onUpdateTable).toHaveBeenLastCalledWith([
      {name: "Email", visible: true, viewRule: "Public", modifyRule: "Self", tab: "profile", regex: ""},
      {name: "Avatar", visible: true, viewRule: "Public", modifyRule: "Self", tab: "", regex: ""},
      {name: "Is admin", visible: true, viewRule: "Admin", modifyRule: "Admin", tab: "", regex: ""},
      {name: "Properties", visible: false, viewRule: "Public", modifyRule: "Self", tab: "", regex: ""},
    ]);

    expect(regexColumn.render("", table[1], 1)).toBeNull();
    const regexInput = regexColumn.render("", table[0], 0);
    expect(regexInput.props.placeholder).toBe("未设置");
    regexInput.props.onChange({target: {value: ".+@.+"}});
    expect(onUpdateTable).toHaveBeenLastCalledWith([
      {name: "Email", visible: true, viewRule: "Public", modifyRule: "Self", tab: "profile", regex: ".+@.+"},
      {name: "Avatar", visible: true, viewRule: "Public", modifyRule: "Self", tab: "", regex: ""},
      {name: "Is admin", visible: true, viewRule: "Admin", modifyRule: "Admin", tab: "", regex: ""},
      {name: "Properties", visible: false, viewRule: "Public", modifyRule: "Self", tab: "", regex: ""},
    ]);

    expect(viewRuleColumn.render("Public", table[3], 3)).toBeNull();
    expect(modifyRuleColumn.render("Self", table[3], 3)).toBeNull();
    expect(modifyRuleColumn.render("Admin", table[2], 2).props.options).toEqual([
      {value: "Admin", label: "管理员可改"},
      {value: "Immutable", label: "不可修改"},
    ]);
  });

  test("toolbar filters update state and row actions operate on original table indexes", async() => {
    await useTestLanguage("zh");
    const onUpdateTable = vi.fn();
    const table = [
      {name: "Email", visible: true, viewRule: "Public", modifyRule: "Self", tab: ""},
      {name: "Properties", visible: false, viewRule: "Public", modifyRule: "Self", tab: ""},
    ];
    const accountTable = new AccountTable({title: "账号资料", table, onUpdateTable});
    useSynchronousSetState(accountTable);

    const toolbar = (accountTable as any).renderToolbar(table, 1);
    const [titleBar, filters] = toolbar.props.children;
    const addButton = titleBar.props.children[1];
    const [searchInput, editableCheckbox, hiddenCheckbox, regexCheckbox, countNode] = filters.props.children;

    expect(titleBar.props.children[0].props.children).toBe("账号资料");
    expect(searchInput.props.placeholder).toBe("搜索资料项");
    expect(countNode.props.children).toBe("已显示 1 / 2 项");

    searchInput.props.onChange({target: {value: "email"}});
    editableCheckbox.props.onChange({target: {checked: true}});
    hiddenCheckbox.props.onChange({target: {checked: true}});
    regexCheckbox.props.onChange({target: {checked: true}});
    expect((accountTable as any).state).toEqual(expect.objectContaining({
      searchText: "email",
      showEditableOnly: true,
      showHiddenOnly: true,
      showRegexOnly: true,
    }));

    addButton.props.onClick();
    expect(onUpdateTable).toHaveBeenLastCalledWith([
      {name: "Email", visible: true, viewRule: "Public", modifyRule: "Self", tab: ""},
      {name: "Properties", visible: false, viewRule: "Public", modifyRule: "Self", tab: ""},
      {name: "Please select an account item", visible: true, viewRule: "Public", modifyRule: "Self", tab: ""},
    ]);

    const actionColumn = (accountTable as any).renderTable(table).props.columns[6];
    const secondRowActions = actionColumn.render(null, {...table[1], __accountItemIndex: 1}, 0);
    const [upTooltip, downTooltip, deleteConfirm] = secondRowActions.props.children;
    upTooltip.props.children.props.onClick();
    expect(onUpdateTable).toHaveBeenLastCalledWith([
      {name: "Properties", visible: false, viewRule: "Public", modifyRule: "Self", tab: ""},
      {name: "Email", visible: true, viewRule: "Public", modifyRule: "Self", tab: ""},
    ]);
    expect(downTooltip.props.children.props.disabled).toBe(true);
    expect(deleteConfirm.props.title).toBe("从账号资料配置中移除此项？这不会删除已有用户资料。");
    deleteConfirm.props.onConfirm();
    expect(onUpdateTable).toHaveBeenLastCalledWith([
      {name: "Email", visible: true, viewRule: "Public", modifyRule: "Self", tab: ""},
    ]);
  });
});
