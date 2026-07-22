import {afterEach, describe, expect, test, vi} from "vitest";
import React, {useState} from "react";
import {createRequire} from "node:module";
import {act, cleanup, render, screen} from "@testing-library/react";

const requireFromTest = createRequire(import.meta.url);

describe("React 18 Testing Library compatibility", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test("uses createRoot by default and cleanup unmounts the rendered tree", async() => {
    vi.resetModules();
    const reactDOMClient = requireFromTest("react-dom/client") as typeof import("react-dom/client");
    const mutableReactDOMClient = reactDOMClient as {createRoot: typeof reactDOMClient.createRoot};
    const originalCreateRoot = reactDOMClient.createRoot;
    const createRootSpy = vi.fn(originalCreateRoot);
    const pureModulePath = requireFromTest.resolve("@testing-library/react/pure");
    const pureImplementationPath = requireFromTest.resolve("@testing-library/react/dist/pure");
    mutableReactDOMClient.createRoot = createRootSpy;
    delete requireFromTest.cache[pureModulePath];
    delete requireFromTest.cache[pureImplementationPath];

    try {
      const isolatedTestingLibrary = requireFromTest("@testing-library/react/pure") as typeof import("@testing-library/react/pure");
      const rendered = isolatedTestingLibrary.render(<div>React 18 root</div>);

      expect(createRootSpy).toHaveBeenCalledTimes(1);
      expect(rendered.getByText("React 18 root")).not.toBeNull();

      isolatedTestingLibrary.cleanup();
      expect(rendered.container.childElementCount).toBe(0);
    } finally {
      mutableReactDOMClient.createRoot = originalCreateRoot;
      delete requireFromTest.cache[pureModulePath];
      delete requireFromTest.cache[pureImplementationPath];
    }
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
