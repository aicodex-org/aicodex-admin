/* eslint-env jest */
import React from "react";
import {render} from "@testing-library/react";
import {beforeEach, describe, expect, jest as jestValue, test} from "@jest/globals";
import ProviderTable from "./ProviderTable";
import i18next from "i18next";

declare const jest: typeof jestValue;

type I18nextMock = {
  mockClear: () => void;
  mockImplementation: (fn: (key: string) => string) => void;
};

type StyleMatcher = {
  toHaveStyle: (style: string) => void;
};

const {fireEvent, screen} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | Node | Document | Window) => boolean;
  };
  screen: {
    getByText: (text: string) => HTMLElement;
    getAllByText: (text: string) => HTMLElement[];
  };
};
jest.mock("i18next", () => {
  const mockJest = require("@jest/globals").jest as any;
  const mockT = mockJest.fn((mockKey: string) => {
    const [, value] = mockKey.split(":");
    return value || mockKey;
  });
  const i18next: {
    t: any;
    use: any;
    init: any;
  } = {} as any;
  i18next.t = mockT;
  i18next.use = () => i18next;
  i18next.init = () => i18next;

  return {
    __esModule: true,
    default: i18next,
    ...i18next,
  };
});

describe("ProviderTable", () => {
  beforeEach(() => {
    const mockedT = i18next.t as unknown as I18nextMock;
    mockedT.mockClear();
    mockedT.mockImplementation((key: string) => {
      const [, value] = `${key}`.split(":");
      return value || key;
    });
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jestValue.fn().mockImplementation((query: unknown) => ({
        matches: false,
        media: String(query),
        onchange: null,
        addListener: jestValue.fn(),
        removeListener: jestValue.fn(),
        addEventListener: jestValue.fn(),
        removeEventListener: jestValue.fn(),
        dispatchEvent: jestValue.fn(),
      })),
    });
  });

  test("adds provider row when application provider list is null", () => {
    const onUpdateTable = jestValue.fn();

    render(
      <ProviderTable
        title="Providers"
        table={null}
        providers={[]}
        application={{enableSignUp: true}}
        onUpdateTable={onUpdateTable}
      />
    );

    fireEvent.click(screen.getByText("Add"));

    expect(onUpdateTable).toHaveBeenCalledWith([
      expect.objectContaining({
        name: "Please select a provider",
        canSignIn: true,
        canSignUp: true,
        canUnlink: true,
        prompted: false,
        rule: "None",
      }),
    ]);
  });

  test("shows runtime email default when binding rule is unset", () => {
    const onUpdateTable = jestValue.fn();

    render(
      <ProviderTable
        title="Providers"
        table={[
          {
            name: "Feishu",
            canSignIn: true,
            canSignUp: true,
            canUnlink: true,
            provider: {category: "OAuth", type: "Lark"},
            rule: "None",
          },
        ]}
        providers={[{name: "Feishu", category: "OAuth", type: "Lark"}]}
        application={{enableSignUp: true, organizationObj: {name: "built-in"}}}
        onUpdateTable={onUpdateTable}
      />
    );

    expect(screen.getAllByText("Runtime default email binding").length).toBeGreaterThan(0);
    expect(onUpdateTable).not.toHaveBeenCalled();
  });

  test("uses compact fixed table layout for application provider rows", () => {
    const onUpdateTable = jestValue.fn();

    const {container} = render(
      <ProviderTable
        title="Providers"
        table={[
          {
            name: "WeCom",
            canSignIn: true,
            canSignUp: true,
            canUnlink: true,
            bindingRule: ["Email"],
            provider: {category: "OAuth", type: "WeCom"},
            rule: "None",
          },
        ]}
        providers={[{name: "WeCom", category: "OAuth", type: "WeCom"}]}
        application={{enableSignUp: true, organizationObj: {name: "built-in"}}}
        onUpdateTable={onUpdateTable}
      />
    );

    const table = container.querySelector(".ant-table-content table");
    (expect(table) as unknown as StyleMatcher).toHaveStyle("table-layout: fixed");
    (expect(table) as unknown as StyleMatcher).toHaveStyle("width: 1260px");
  });

  test("explains provider binding option columns", () => {
    render(
      <ProviderTable
        title="Providers"
        table={[
          {
            name: "WeCom",
            canSignIn: true,
            canSignUp: true,
            canUnlink: true,
            bindingRule: ["Email"],
            prompted: false,
            signupGroup: "",
            provider: {category: "OAuth", type: "WeCom"},
            rule: "None",
          },
        ]}
        providers={[{name: "WeCom", category: "OAuth", type: "WeCom"}]}
        application={{enableSignUp: true, organizationObj: {name: "built-in"}}}
        onUpdateTable={jestValue.fn()}
      />
    );

    expect(i18next.t).toHaveBeenCalledWith("provider:Can unlink - Tooltip");
    expect(i18next.t).toHaveBeenCalledWith("provider:Binding rule - Tooltip");
    expect(i18next.t).toHaveBeenCalledWith("provider:Prompted - Tooltip");
    expect(i18next.t).toHaveBeenCalledWith("provider:Signup group - Tooltip");
    expect(i18next.t).toHaveBeenCalledWith("provider:Provider rule - Tooltip");
  });

  test("updates provider row fields from column controls", () => {
    const onUpdateTable = jestValue.fn();
    const rows = [
      {
        name: "WeCom",
        canSignIn: true,
        canSignUp: true,
        canUnlink: true,
        bindingRule: ["Email"],
        prompted: false,
        signupGroup: "",
        provider: {name: "WeCom", category: "OAuth", type: "WeCom"},
        rule: "None",
      },
      {
        name: "Captcha",
        provider: {name: "Captcha", category: "Captcha", type: "Default"},
        rule: "None",
      },
      {
        name: "SMS",
        provider: {name: "SMS", category: "SMS", type: "Aliyun SMS"},
        countryCodes: ["All"],
        rule: "None",
      },
    ];
    const table = new ProviderTable({
      title: "Providers",
      table: rows,
      providers: [
        {name: "WeCom", category: "OAuth", type: "WeCom"},
        {name: "Mail", category: "Email", type: "SMTP"},
        {name: "Google", category: "OAuth", type: "Google"},
        {name: "Captcha", category: "Captcha", type: "Default"},
        {name: "SMS", category: "SMS", type: "Aliyun SMS"},
      ],
      application: {enableSignUp: true, organizationObj: {name: "built-in", countryCodes: ["US", "CN"]}},
      onUpdateTable,
    });
    const renderedTable = table.renderTable(rows);
    const columns = renderedTable.props.columns;
    const getColumn = (key: string) => columns.find((column: any) => column.key === key);

    getColumn("canSignUp").render(true, rows[0], 0).props.onChange(false);
    getColumn("canSignIn").render(true, rows[0], 0).props.onChange(false);
    getColumn("canUnlink").render(true, rows[0], 0).props.onChange(false);
    expect(getColumn("canSignUp").render(true, rows[1], 1)).toBeNull();

    getColumn("bindingRule").render(["Email"], rows[0], 0).props.children[0].props.onChange(["Email", "Phone"]);
    expect(onUpdateTable).toHaveBeenLastCalledWith(expect.arrayContaining([
      expect.objectContaining({name: "WeCom", bindingRule: ["Email", "Phone"]}),
    ]));
    expect(getColumn("bindingRule").render([], rows[1], 1)).toBeNull();

    getColumn("prompted").render(false, rows[0], 0).props.onChange(true);
    getColumn("signupGroup").render("", rows[0], 0).props.onChange({target: {value: "engineering"}});
    expect(onUpdateTable).toHaveBeenLastCalledWith(expect.arrayContaining([
      expect.objectContaining({name: "WeCom", signupGroup: "engineering"}),
    ]));

    getColumn("name").render("WeCom", rows[0], 0).props.onChange("Mail");
    expect(onUpdateTable).toHaveBeenLastCalledWith(expect.arrayContaining([
      expect.objectContaining({name: "Mail", provider: expect.objectContaining({category: "Email"}), rule: "All"}),
    ]));

    getColumn("countryCodes").render(["All"], rows[2], 2).props.onChange(["CN"]);
    expect(onUpdateTable).toHaveBeenLastCalledWith(expect.arrayContaining([
      expect.objectContaining({name: "SMS", countryCodes: ["CN"]}),
    ]));
    expect(getColumn("countryCodes").render(null, rows[0], 0)).toBeNull();
  });

  test("updates provider-specific rule controls and row order actions", () => {
    const onUpdateTable = jestValue.fn();
    const rows = [
      {name: "Google", provider: {category: "OAuth", type: "Google"}, rule: "None"},
      {name: "Captcha", provider: {category: "Captcha", type: "Default"}, rule: "None"},
      {name: "SMS", provider: {category: "SMS", type: "Aliyun SMS"}, rule: "None"},
    ];
    const table = new ProviderTable({
      title: "Providers",
      table: rows,
      providers: [],
      application: {enableSignUp: true, organizationObj: {name: "built-in"}},
      onUpdateTable,
    });
    const columns = table.renderTable(rows).props.columns;
    const getColumn = (key: string) => columns.find((column: any) => column.key === key);

    getColumn("rule").render("None", rows[0], 0).props.onChange("OneTap");
    expect(onUpdateTable).toHaveBeenLastCalledWith(expect.arrayContaining([
      expect.objectContaining({name: "Google", rule: "OneTap"}),
    ]));

    getColumn("rule").render("None", rows[1], 1).props.onChange("Dynamic");
    expect(onUpdateTable).toHaveBeenLastCalledWith(expect.arrayContaining([
      expect.objectContaining({name: "Captcha", rule: "Dynamic"}),
    ]));

    getColumn("rule").render("None", rows[2], 2).props.onChange("signup");
    expect(onUpdateTable).toHaveBeenLastCalledWith(expect.arrayContaining([
      expect.objectContaining({name: "SMS", rule: "signup"}),
    ]));
    expect(getColumn("rule").render("None", {provider: {category: "OAuth", type: "WeCom"}}, 0)).toBeNull();

    const actionButtons = getColumn("action").render(null, rows[1], 1).props.children.map((tooltip: any) => tooltip.props.children);
    actionButtons[0].props.onClick();
    expect(onUpdateTable).toHaveBeenCalledWith([rows[1], rows[0], rows[2]]);
    actionButtons[1].props.onClick();
    expect(onUpdateTable).toHaveBeenCalledWith([rows[0], rows[2], rows[1]]);
    actionButtons[2].props.onClick();
    expect(onUpdateTable).toHaveBeenCalledWith([rows[0], rows[2]]);
  });
});
