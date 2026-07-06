const resizeObserverLoopErrorMessages = [
  "ResizeObserver loop completed with undelivered notifications",
  "ResizeObserver loop limit exceeded",
];

export function isResizeObserverLoopError(message: unknown): boolean {
  return resizeObserverLoopErrorMessages.some(errorMessage => `${message ?? ""}`.includes(errorMessage));
}

// 只屏蔽浏览器 ResizeObserver 已知噪声，普通运行时错误仍交给原有 error handler。
export function installResizeObserverLoopErrorGuard(): void {
  const originalOnError = window.onerror;

  window.onerror = (message, source, lineno, colno, error) => {
    if (isResizeObserverLoopError(message) || isResizeObserverLoopError(error?.message)) {
      return true;
    }

    if (typeof originalOnError === "function") {
      return originalOnError.call(window, message, source, lineno, colno, error);
    }

    return false;
  };

  window.addEventListener("error", (event) => {
    if (!isResizeObserverLoopError(event.message) && !isResizeObserverLoopError(event.error?.message)) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
}
