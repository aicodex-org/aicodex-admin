import {afterEach, beforeEach, expect, test, vi} from "vitest";
import React from "react";
import i18next from "i18next";
import {cleanup, render} from "@testing-library/react";
import "../i18n";
import SyncerTableColumnTable from "./SyncerTableColumnTable";
import {fireEvent} from "@testing-library/react";

let originalLanguage: string;

beforeEach(async() => {
  originalLanguage = i18next.language;
  await i18next.changeLanguage("en");
});

afterEach(async() => {
  cleanup();
  vi.restoreAllMocks();
  await i18next.changeLanguage(originalLanguage || "zh");
});

test("renders backend table columns with stable row keys", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const onUpdateTable = vi.fn();

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
    .map(call => call.map(item => String(item)).join(" "));

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
