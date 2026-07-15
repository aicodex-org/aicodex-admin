const resizeObserverLoopErrorMessages = [
  "ResizeObserver loop completed with undelivered notifications",
  "ResizeObserver loop limit exceeded",
];

const installFlag = "__aicodexResizeObserverLoopErrorPreflightInstalled";

type AddEventListenerCompat = (type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) => void;
type RemoveEventListenerCompat = (type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) => void;

function isResizeObserverLoopError(message: unknown): boolean {
  return resizeObserverLoopErrorMessages.some(errorMessage => `${message ?? ""}`.includes(errorMessage));
}

function isResizeObserverErrorEvent(event: Event): boolean {
  const errorEvent = event as ErrorEvent;

  return isResizeObserverLoopError(errorEvent.message) || isResizeObserverLoopError(errorEvent.error?.message);
}

function handleResizeObserverErrorEvent(event: Event): boolean {
  if (!isResizeObserverErrorEvent(event)) {
    return false;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
  return true;
}

// 在应用与第三方 error listener 注册前完成包装，只提前吞掉 ResizeObserver loop 噪声。
export function installResizeObserverLoopErrorPreflight(targetWindow: Window & typeof globalThis = window): void {
  const globalState = targetWindow as unknown as Record<string, unknown>;
  if (globalState[installFlag] === true) {
    return;
  }

  globalState[installFlag] = true;

  const originalAddEventListener = targetWindow.addEventListener.bind(targetWindow) as AddEventListenerCompat;
  const originalRemoveEventListener = targetWindow.removeEventListener.bind(targetWindow) as RemoveEventListenerCompat;
  const wrappedErrorListeners = new WeakMap<EventListenerOrEventListenerObject, EventListenerOrEventListenerObject>();

  targetWindow.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) => {
    if (type !== "error" || listener === null) {
      originalAddEventListener(type, listener, options);
      return;
    }

    const wrappedListener: EventListener = (event) => {
      if (handleResizeObserverErrorEvent(event)) {
        return;
      }

      if (typeof listener === "function") {
        listener.call(targetWindow, event);
        return;
      }

      listener.handleEvent(event);
    };

    wrappedErrorListeners.set(listener, wrappedListener);
    originalAddEventListener(type, wrappedListener, options);
  }) as Window["addEventListener"];

  targetWindow.removeEventListener = ((type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) => {
    if (type !== "error" || listener === null) {
      originalRemoveEventListener(type, listener, options);
      return;
    }

    originalRemoveEventListener(type, wrappedErrorListeners.get(listener) ?? listener, options);
    wrappedErrorListeners.delete(listener);
  }) as Window["removeEventListener"];
}

installResizeObserverLoopErrorPreflight();
