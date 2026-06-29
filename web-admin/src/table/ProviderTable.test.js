/* eslint-env jest */
import React from "react";
import {fireEvent, render, screen} from "@testing-library/react";
import ProviderTable from "./ProviderTable";
import i18next from "i18next";

jest.mock("i18next", () => {
  const i18next = {
    t: jest.fn(key => {
      const [, value] = key.split(":");
      return value || key;
    }),
    use: jest.fn(() => i18next),
    init: jest.fn(() => i18next),
  };

  return {
    __esModule: true,
    default: i18next,
    ...i18next,
  };
});

describe("ProviderTable", () => {
  beforeEach(() => {
    i18next.t.mockClear();
    i18next.t.mockImplementation(key => {
      const [, value] = `${key}`.split(":");
      return value || key;
    });
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  test("adds provider row when application provider list is null", () => {
    const onUpdateTable = jest.fn();

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
    const onUpdateTable = jest.fn();

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
    const onUpdateTable = jest.fn();

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
    expect(table).toHaveStyle("table-layout: fixed");
    expect(table).toHaveStyle("width: 1260px");
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
        onUpdateTable={jest.fn()}
      />
    );

    expect(i18next.t).toHaveBeenCalledWith("provider:Can unlink - Tooltip");
    expect(i18next.t).toHaveBeenCalledWith("provider:Binding rule - Tooltip");
    expect(i18next.t).toHaveBeenCalledWith("provider:Prompted - Tooltip");
    expect(i18next.t).toHaveBeenCalledWith("provider:Signup group - Tooltip");
    expect(i18next.t).toHaveBeenCalledWith("provider:Provider rule - Tooltip");
  });

  test("updates provider row fields from column controls", () => {
    const onUpdateTable = jest.fn();
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
    const getColumn = key => columns.find(column => column.key === key);

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
    const onUpdateTable = jest.fn();
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
    const getColumn = key => columns.find(column => column.key === key);

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

    const actionButtons = getColumn("action").render(null, rows[1], 1).props.children.map(tooltip => tooltip.props.children);
    actionButtons[0].props.onClick();
    expect(onUpdateTable).toHaveBeenCalledWith([rows[1], rows[0], rows[2]]);
    actionButtons[1].props.onClick();
    expect(onUpdateTable).toHaveBeenCalledWith([rows[0], rows[2], rows[1]]);
    actionButtons[2].props.onClick();
    expect(onUpdateTable).toHaveBeenCalledWith([rows[0], rows[2]]);
  });
});
