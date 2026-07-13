/* eslint-env jest */
import React from "react";
import {cleanup, render} from "@testing-library/react";
import {expect, jest} from "@jest/globals";
import "../i18n";
import SyncerTableColumnTable from "./SyncerTableColumnTable";

const {fireEvent} = require("@testing-library/react") as {fireEvent: {click: (element: Element) => boolean}};

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

test("renders backend table columns with stable row keys", () => {
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
  const onUpdateTable = jest.fn();

  const view = render(
    <SyncerTableColumnTable
      table={[
        {name: "id", type: "string", casdoorName: "Id", isKey: true, isHashed: false, values: []},
        {name: "email", type: "string", casdoorName: "Email", isKey: false, isHashed: false, values: []},
      ]}
      onUpdateTable={onUpdateTable}
    />
  );

  const warnings = consoleError.mock.calls
    .map(call => call.map(item => String(item)).join(" "))
    .filter(message => !message.includes("ReactDOM.render is no longer supported"));

  expect(warnings).toEqual([]);
  expect(view.container.querySelector(".syncer-table-column-toolbar")).not.toBeNull();
  expect(view.queryByText("Table columns")).toBeNull();
  expect(view.getByRole("button", {name: "Add"})).not.toBeNull();
  expect(view.getAllByRole("button", {name: "Up"})).toHaveLength(2);
  expect(view.getAllByRole("button", {name: "Down"})).toHaveLength(2);
  expect(view.getAllByRole("button", {name: "Delete"})).toHaveLength(2);

  fireEvent.click(view.getAllByRole("button", {name: "Up"})[1]);
  fireEvent.click(view.getAllByRole("button", {name: "Down"})[0]);
  fireEvent.click(view.getAllByRole("button", {name: "Delete"})[1]);
  fireEvent.click(view.getByRole("button", {name: "Add"}));
  expect(onUpdateTable).toHaveBeenCalledTimes(4);
});
