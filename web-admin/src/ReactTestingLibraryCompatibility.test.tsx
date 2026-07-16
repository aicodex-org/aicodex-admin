import React, {useState} from "react";
import * as ReactDOMClient from "react-dom/client";
import {act, cleanup, render, screen} from "@testing-library/react";
import {expect, jest} from "@jest/globals";

describe("React 18 Testing Library compatibility", () => {
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  test("uses createRoot by default and cleanup unmounts the rendered tree", () => {
    jest.isolateModules(() => {
      const isolatedReactDOMClient = require("react-dom/client") as typeof ReactDOMClient;
      const createRootSpy = jest.spyOn(isolatedReactDOMClient, "createRoot");
      const isolatedTestingLibrary = require("@testing-library/react/pure") as typeof import("@testing-library/react/pure");
      const rendered = isolatedTestingLibrary.render(<div>React 18 root</div>);

      expect(createRootSpy).toHaveBeenCalledTimes(1);
      expect(rendered.getByText("React 18 root")).not.toBeNull();

      isolatedTestingLibrary.cleanup();
      expect(rendered.container.childElementCount).toBe(0);
    });
  });

  test("act commits synchronous and asynchronous state updates", async() => {
    let updateValue: ((value: string) => void) | undefined;

    function StateProbe() {
      const [value, setValue] = useState("initial");
      updateValue = setValue;

      return <span>{value}</span>;
    }

    render(<StateProbe />);

    act(() => {
      updateValue?.("sync");
    });
    expect(screen.getByText("sync")).not.toBeNull();

    await act(async() => {
      await Promise.resolve();
      updateValue?.("async");
    });
    expect(screen.getByText("async")).not.toBeNull();
  });
});
