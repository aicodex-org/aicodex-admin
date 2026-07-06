/* eslint-env jest */
import {expect, jest} from "@jest/globals";
import {installResizeObserverLoopErrorGuard, isResizeObserverLoopError} from "./resizeObserverLoopErrorGuard";

describe("resizeObserverLoopErrorGuard", () => {
  const originalOnError = window.onerror;

  afterEach(() => {
    window.onerror = originalOnError;
  });

  test("matches browser ResizeObserver loop noise only", () => {
    expect(isResizeObserverLoopError("ResizeObserver loop completed with undelivered notifications.")).toBe(true);
    expect(isResizeObserverLoopError("ResizeObserver loop limit exceeded")).toBe(true);
    expect(isResizeObserverLoopError("Cannot read properties of undefined")).toBe(false);
  });

  test("prevents CRA runtime overlay from handling ResizeObserver loop noise", () => {
    const overlayHandler = jest.fn();
    window.onerror = overlayHandler;

    installResizeObserverLoopErrorGuard();

    const handled = window.onerror?.(
      "ResizeObserver loop completed with undelivered notifications.",
      "bundle.js",
      222864,
      58,
      new Error("ResizeObserver loop completed with undelivered notifications.")
    );

    expect(handled).toBe(true);
    expect(overlayHandler).not.toHaveBeenCalled();
  });

  test("delegates real runtime errors to the existing handler", () => {
    const overlayHandler = jest.fn(() => false);
    window.onerror = overlayHandler;

    installResizeObserverLoopErrorGuard();

    const error = new Error("Cannot read properties of undefined");
    const handled = window.onerror?.("Cannot read properties of undefined", "bundle.js", 1, 2, error);

    expect(handled).toBe(false);
    expect(overlayHandler).toHaveBeenCalledWith("Cannot read properties of undefined", "bundle.js", 1, 2, error);
  });

  test("handles ResizeObserver noise from the Error object and returns false without an existing handler", () => {
    window.onerror = null;

    installResizeObserverLoopErrorGuard();
    const guardedOnError = window.onerror as unknown as OnErrorEventHandlerNonNull;

    const handledResizeObserverError = guardedOnError(
      "Script error.",
      "bundle.js",
      1,
      2,
      new Error("ResizeObserver loop limit exceeded")
    );
    const handledRuntimeError = guardedOnError("Script error.", "bundle.js", 1, 2, new Error("Real error"));

    expect(handledResizeObserverError).toBe(true);
    expect(handledRuntimeError).toBe(false);
  });

  test("stops window error events for ResizeObserver noise only", () => {
    installResizeObserverLoopErrorGuard();
    const resizeObserverEvent = new ErrorEvent("error", {
      message: "ResizeObserver loop completed with undelivered notifications.",
      cancelable: true,
    });
    const runtimeEvent = new ErrorEvent("error", {
      message: "Real runtime error",
      cancelable: true,
    });

    const resizeObserverDispatched = window.dispatchEvent(resizeObserverEvent);
    const runtimeDispatched = window.dispatchEvent(runtimeEvent);

    expect(resizeObserverDispatched).toBe(false);
    expect(resizeObserverEvent.defaultPrevented).toBe(true);
    expect(runtimeDispatched).toBe(true);
    expect(runtimeEvent.defaultPrevented).toBe(false);
  });
});
