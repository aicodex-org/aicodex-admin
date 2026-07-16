const defaultE2EBaseURL = "http://127.0.0.1:7002";

/** 解析 E2E origin，并阻止含写入行为的测试指向共享或私有环境。 */
export function resolveE2EBaseURL(value?: string): string {
  let url: URL;
  try {
    url = new URL(value || defaultE2EBaseURL);
  } catch {
    throw new Error("E2E base URL must be a valid loopback origin on port 7002");
  }

  if (url.protocol !== "http:") {
    throw new Error("E2E base URL must use http for the local disposable environment");
  }
  if (url.username || url.password) {
    throw new Error("E2E base URL must not include credentials");
  }
  if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
    throw new Error("E2E base URL must use a loopback host");
  }
  if (url.port !== "7002") {
    throw new Error("E2E base URL must use port 7002");
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("E2E base URL must be an origin without path, query, or hash");
  }

  return url.origin;
}

/** 调用方未明确确认一次性数据库时，在浏览器行为开始前 fail-closed。 */
export function assertDisposableE2EEnvironment(value?: string): void {
  if (value !== "1") {
    throw new Error(
      "Refusing write-capable E2E: set AICODEX_ADMIN_E2E_DISPOSABLE_DB=1 only for a disposable database"
    );
  }
}
