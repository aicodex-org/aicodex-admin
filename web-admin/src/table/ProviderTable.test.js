/* eslint-env jest */
import React from "react";
import {fireEvent, render, screen} from "@testing-library/react";
import ProviderTable from "./ProviderTable";

jest.mock("i18next", () => {
  const i18next = {
    t: key => {
      const [, value] = key.split(":");
      return value || key;
    },
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
});
