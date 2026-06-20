/* eslint-env jest */
import React from "react";
import * as fs from "fs";
import * as path from "path";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import CartTable from "./table/CartTable";
import * as Setting from "./Setting";
import type {LegacyAny} from "./types/legacyPage";

declare const jest: typeof jestValue;

type CartItem = {
  owner: string;
  name: string;
  displayName: string;
  image?: string;
  price: number;
  currency: string;
  quantity: number;
  detail?: string;
  [key: string]: LegacyAny;
};

const expect = jestExpect;

jest.mock("i18next", () => ({
  __esModule: true,
  default: {
    language: "en",
    use() {
      return this;
    },
    init() {
      return this;
    },
    changeLanguage() {
      return Promise.resolve();
    },
    t: (key: string) => key.includes(":") ? key.split(":").pop() : key,
  },
}));

afterEach(() => {
  jestValue.restoreAllMocks();
  cleanup();
});

test("uses TSX file for migrated cart table", () => {
  const tableDir = path.join(__dirname, "table");

  expect(fs.existsSync(path.join(tableDir, "CartTable.tsx"))).toBe(true);
  expect(fs.existsSync(path.join(tableDir, "CartTable.js"))).toBe(false);
});

test("keeps cart table item rendering row keys and currency formatting stable", () => {
  jestValue.spyOn(Setting, "getCurrencySymbol").mockImplementation((currency: string) => `${currency}:`);
  const cart: CartItem[] = [
    {
      owner: "built-in",
      name: "workspace_credits",
      displayName: "Workspace Credits",
      image: "https://example.test/product.png",
      price: 15,
      currency: "USD",
      quantity: 2,
      detail: "Team workspace credits",
    },
    {
      owner: "built-in",
      name: "support_pack",
      displayName: "Support Pack",
      price: 30,
      currency: "CNY",
      quantity: 1,
      detail: "Priority support",
    },
  ];

  const view = render(<CartTable cart={cart} />);

  expect(view.getByText("Workspace Credits")).not.toBeNull();
  expect(view.getByText("Support Pack")).not.toBeNull();
  expect(view.getByText("USD:15")).not.toBeNull();
  expect(view.getByText("CNY:30")).not.toBeNull();
  expect(view.getByText("Team workspace credits")).not.toBeNull();
  expect(view.getByText("Priority support")).not.toBeNull();
  expect((view.getByAltText("Workspace Credits") as HTMLImageElement).src).toBe("https://example.test/product.png");
  expect(view.container.querySelector("tr[data-row-key='built-in/workspace_credits']")).not.toBeNull();
  expect(view.container.querySelector("tr[data-row-key='built-in/support_pack']")).not.toBeNull();
  expect(view.queryByAltText("Support Pack")).toBeNull();
});

test("keeps empty cart rendering stable", () => {
  const view = render(<CartTable cart={[]} />);

  expect(view.container.querySelector(".ant-table")).not.toBeNull();
  expect(view.queryByRole("img")).toBeNull();
});
