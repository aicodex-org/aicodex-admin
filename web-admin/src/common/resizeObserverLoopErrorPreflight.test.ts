/* eslint-env jest */
import {expect, jest} from "@jest/globals";
import {installResizeObserverLoopErrorPreflight} from "./resizeObserverLoopErrorPreflight";

function createResizeObserverErrorEvent(): Event {
  const event = new Event("error", {cancelable: true});

  Object.defineProperty(event, "message", {
    value: "ResizeObserver loop completed with undelivered notifications.",
  });
  Object.defineProperty(event, "error", {
    value: new Error("ResizeObserver loop completed with undelivered notifications."),
  });

  return event;
}

describe("resizeObserverLoopErrorPreflight", () => {
  test("wraps early error listeners before CRA runtime overlay sees ResizeObserver noise", () => {
    const targetWindow = new EventTarget() as Window & typeof globalThis;
    const overlayHandler = jest.fn();

    installResizeObserverLoopErrorPreflight(targetWindow);
    targetWindow.addEventListener("error", overlayHandler);

    const event = createResizeObserverErrorEvent();
    const dispatched = targetWindow.dispatchEvent(event);

    expect(dispatched).toBe(false);
    expect(event.defaultPrevented).toBe(true);
    expect(overlayHandler).not.toHaveBeenCalled();
  });

  test("keeps non-ResizeObserver errors visible to existing listeners", () => {
    const targetWindow = new EventTarget() as Window & typeof globalThis;
    const overlayHandler = jest.fn();

    installResizeObserverLoopErrorPreflight(targetWindow);
    targetWindow.addEventListener("error", overlayHandler);

    const event = new Event("error", {cancelable: true});
    Object.defineProperty(event, "message", {
      value: "Cannot read properties of undefined",
    });

    const dispatched = targetWindow.dispatchEvent(event);

    expect(dispatched).toBe(true);
    expect(event.defaultPrevented).toBe(false);
    expect(overlayHandler).toHaveBeenCalledWith(event);
  });

  test("removes wrapped error listeners through the original listener reference", () => {
    const targetWindow = new EventTarget() as Window & typeof globalThis;
    const overlayHandler = jest.fn();

    installResizeObserverLoopErrorPreflight(targetWindow);
    targetWindow.addEventListener("error", overlayHandler);
    targetWindow.removeEventListener("error", overlayHandler);

    targetWindow.dispatchEvent(new Event("error"));

    expect(overlayHandler).not.toHaveBeenCalled();
  });

  test("supports object style error listeners", () => {
    const targetWindow = new EventTarget() as Window & typeof globalThis;
    const listener = {handleEvent: jest.fn()};

    installResizeObserverLoopErrorPreflight(targetWindow);
    targetWindow.addEventListener("error", listener);
    const event = new Event("error");

    targetWindow.dispatchEvent(event);

    expect(listener.handleEvent).toHaveBeenCalledWith(event);
  });

  test("passes through non-error listener registration and removal", () => {
    const targetWindow = new EventTarget() as Window & typeof globalThis;
    const listener = jest.fn();

    installResizeObserverLoopErrorPreflight(targetWindow);
    targetWindow.addEventListener("click", listener);
    targetWindow.removeEventListener("click", listener);
    targetWindow.dispatchEvent(new Event("click"));

    expect(listener).not.toHaveBeenCalled();
  });

  test("does not wrap listeners again after the preflight is installed", () => {
    const targetWindow = new EventTarget() as Window & typeof globalThis;
    const firstAddEventListener = targetWindow.addEventListener;

    installResizeObserverLoopErrorPreflight(targetWindow);
    const installedAddEventListener = targetWindow.addEventListener;
    installResizeObserverLoopErrorPreflight(targetWindow);

    expect(installedAddEventListener).not.toBe(firstAddEventListener);
    expect(targetWindow.addEventListener).toBe(installedAddEventListener);
  });
});
