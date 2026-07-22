import {describe, expect, test, vi} from "vitest";
import i18next from "i18next";
import MfaTable from "./MfaTable";
import * as Setting from "../Setting";
import {MfaRuleRequired} from "../Setting";
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

describe("MfaTable", () => {
  test("keeps disabled add reason and title help keyboard reachable", async() => {
    await useTestLanguage("zh");
    const table = [
      {name: "Phone", rule: "Optional"},
      {name: "Email", rule: "Optional"},
      {name: "App", rule: "Optional"},
      {name: "Push", rule: "Optional"},
    ];
    const mfaTable = new MfaTable({title: "认证方式", table, onUpdateTable: vi.fn()});
    const tableElement = (mfaTable as any).renderTable(table);
    const toolbar = tableElement.props.title();
    const titleNode = toolbar.props.children[0];
    const titleHelpTooltip = titleNode.props.children[1];
    const titleHelpTrigger = titleHelpTooltip.props.children;
    const addTooltip = toolbar.props.children[1];
    const addTrigger = addTooltip.props.children;
    const addButton = addTrigger.props.children;

    expect(titleHelpTooltip.props.title).toBe("最多支持 4 种认证方式，按从上到下顺序展示/验证。");
    expect(titleHelpTrigger.props.tabIndex).toBe(0);
    expect(titleHelpTrigger.props["aria-label"]).toBe("最多支持 4 种认证方式，按从上到下顺序展示/验证。");
    expect(addTooltip.props.title).toBe("最多支持 4 种认证方式，移除后可继续添加。");
    expect(addTrigger.props.tabIndex).toBe(0);
    expect(addTrigger.props["aria-disabled"]).toBe(true);
    expect(addTrigger.props["aria-label"]).toBe("最多支持 4 种认证方式，移除后可继续添加。");
    expect(addButton.props.disabled).toBe(true);
  });

  test("uses MFA-specific action labels and remove confirmation", async() => {
    await useTestLanguage("zh");
    const table = [
      {name: "Phone", rule: "Optional"},
      {name: "Email", rule: "Optional"},
    ];
    const mfaTable = new MfaTable({title: "认证方式", table, onUpdateTable: vi.fn()});
    const tableElement = (mfaTable as any).renderTable(table);
    const actionColumn = tableElement.props.columns[2];
    const firstRowActions = actionColumn.render(undefined, table[0], 0);
    const [upTooltip, downTooltip, removeConfirm] = firstRowActions.props.children;
    const upTrigger = upTooltip.props.children;
    const downTrigger = downTooltip.props.children;
    const removeTooltip = removeConfirm.props.children;
    const removeButton = removeTooltip.props.children;

    expect(upTooltip.props.title).toBe("已是第一项");
    expect(upTrigger.props.tabIndex).toBe(0);
    expect(upTrigger.props["aria-label"]).toBe("已是第一项");
    expect(upTrigger.props.children.props["aria-label"]).toBe("上移认证方式");
    expect(downTooltip.props.title).toBe("下移认证方式");
    expect(downTrigger.props.children.props["aria-label"]).toBe("下移认证方式");
    expect(removeConfirm.props.title).toBe("确定移除该认证方式？");
    expect(removeTooltip.props.title).toBe("删除认证方式");
    expect(removeButton.props["aria-label"]).toBe("删除认证方式");
  });

  test("shows pending-save feedback after removing a method", async() => {
    await useTestLanguage("zh");
    const table = [
      {name: "Phone", rule: "Optional"},
      {name: "Email", rule: "Optional"},
    ];
    const onUpdateTable = vi.fn();
    const showMessageSpy = vi.spyOn(Setting, "showMessage").mockImplementation(() => undefined);
    const mfaTable = new MfaTable({table, onUpdateTable});

    mfaTable.deleteRow(table, 0);

    expect(onUpdateTable).toHaveBeenCalledWith([{name: "Email", rule: "Optional"}]);
    expect(showMessageSpy).toHaveBeenCalledWith("info", "已移除，保存后生效");
    showMessageSpy.mockRestore();
  });

  test("adds, moves, and updates MFA rows through the table actions", async() => {
    await useTestLanguage("zh");
    const onUpdateTable = vi.fn();
    const table = [
      {name: "sms", rule: "Optional"},
      {name: "email", rule: "Prompted"},
    ];
    const mfaTable = new MfaTable({table, onUpdateTable});
    const tableElement = (mfaTable as any).renderTable(table);
    const nameColumn = tableElement.props.columns[0];
    const ruleColumn = tableElement.props.columns[1];

    nameColumn.render("sms", table[0], 0).props.onChange("totp");
    expect(onUpdateTable).toHaveBeenLastCalledWith([
      {name: "totp", rule: "Optional"},
      {name: "email", rule: "Prompted"},
    ]);

    ruleColumn.render("Optional", table[0], 0).props.onChange("Prompted");
    expect(onUpdateTable).toHaveBeenLastCalledWith([
      {name: "totp", rule: "Prompted"},
      {name: "email", rule: "Prompted"},
    ]);

    const downTable = [
      {name: "sms", rule: "Optional"},
      {name: "email", rule: "Prompted"},
    ];
    const downActionColumn = (mfaTable as any).renderTable(downTable).props.columns[2];
    const firstRowActions = downActionColumn.render(undefined, downTable[0], 0);
    firstRowActions.props.children[1].props.children.props.children.props.onClick();
    expect(onUpdateTable).toHaveBeenLastCalledWith([
      {name: "email", rule: "Prompted"},
      {name: "sms", rule: "Optional"},
    ]);

    const upTable = [
      {name: "sms", rule: "Optional"},
      {name: "email", rule: "Prompted"},
    ];
    const upActionColumn = (mfaTable as any).renderTable(upTable).props.columns[2];
    const secondRowActions = upActionColumn.render(undefined, upTable[1], 1);
    secondRowActions.props.children[0].props.children.props.children.props.onClick();
    expect(onUpdateTable).toHaveBeenLastCalledWith([
      {name: "email", rule: "Prompted"},
      {name: "sms", rule: "Optional"},
    ]);

    mfaTable.addRow(table);
    expect(onUpdateTable).toHaveBeenLastCalledWith([
      {name: "totp", rule: "Prompted"},
      {name: "email", rule: "Prompted"},
      {name: "Please select a MFA method", rule: "Optional"},
    ]);
  });

  test("keeps only one required MFA method", async() => {
    await useTestLanguage("zh");
    const onUpdateTable = vi.fn();
    const showMessageSpy = vi.spyOn(Setting, "showMessage").mockImplementation(() => undefined);
    const table = [
      {name: "sms", rule: MfaRuleRequired},
      {name: "email", rule: "Optional"},
    ];
    const mfaTable = new MfaTable({table, onUpdateTable});
    const ruleColumn = (mfaTable as any).renderTable(table).props.columns[1];

    ruleColumn.render("Optional", table[1], 1).props.onChange(MfaRuleRequired);

    expect(showMessageSpy).toHaveBeenCalledWith("error", "只能要求1个MFA方法");
    expect(onUpdateTable).not.toHaveBeenCalled();
    showMessageSpy.mockRestore();
  });

  test("keeps current and placeholder methods selectable while removing duplicate choices", async() => {
    await useTestLanguage("zh");
    const table = [
      {name: "Please select a MFA method", rule: "Optional"},
      {name: "sms", rule: "Optional"},
    ];
    const mfaTable = new MfaTable({table, onUpdateTable: vi.fn()});
    const nameColumn = (mfaTable as any).renderTable(table).props.columns[0];
    const selectElement = nameColumn.render("Please select a MFA method", table[0], 0);
    const optionValues = selectElement.props.children.map((option: any) => option.props.value);

    expect(optionValues).toContain("Please select a MFA method");
    expect(optionValues).not.toContain("sms");
    expect(optionValues).toEqual(expect.arrayContaining(["email", "app", "push"]));
  });
});
