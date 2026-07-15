export type RuntimeMode = "development" | "production" | "test" | string;

/** 应用源码可消费的构建期运行环境；隔离 Vite 常量与 Jest fallback。 */
export interface RuntimeEnv {
  mode: RuntimeMode;
  publicBaseUrl: string;
  routerBasename: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

interface RuntimeEnvInput {
  mode?: string;
  publicUrl?: string;
}

/** 将 PUBLIC_URL 规范化为带首尾斜杠的部署 base，完整 HTTP(S) URL 保持 origin。 */
export function normalizePublicBaseUrl(publicUrl?: string): string {
  const trimmed = `${publicUrl ?? ""}`.trim();
  if (trimmed === "" || trimmed === "/") {
    return "/";
  }

  const withLeadingSlash = /^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")
    ? trimmed
    : `/${trimmed}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

/** 将仓库 public 资源路径拼接到已配置的部署 base。 */
export function joinPublicAssetUrl(publicBaseUrl: string, assetPath: string): string {
  return `${normalizePublicBaseUrl(publicBaseUrl)}${assetPath.replace(/^\/+/, "")}`;
}

/** 仅为仓库 public branding 资源补部署 base，API 与外部资源 URL 保持原语义。 */
export function resolvePublicAssetUrl(publicBaseUrl: string, assetUrl: string): string {
  return assetUrl.startsWith("/branding/")
    ? joinPublicAssetUrl(publicBaseUrl, assetUrl)
    : assetUrl;
}

/** 将资源 base 转为 React Router 可消费的 pathname，并移除非根路径末尾斜杠。 */
export function getRouterBasename(publicBaseUrl: string): string {
  const normalizedBase = normalizePublicBaseUrl(publicBaseUrl);
  const pathname = /^https?:\/\//i.test(normalizedBase)
    ? new URL(normalizedBase).pathname
    : normalizedBase;
  return pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
}

/** 将浏览器物理路径还原为应用路由路径；不属于当前部署 base 的路径保持原样。 */
export function getRuntimePathname(pathname: string, routerBasename: string): string {
  if (routerBasename === "/") {
    return pathname;
  }
  if (pathname === routerBasename) {
    return "/";
  }
  return pathname.startsWith(`${routerBasename}/`)
    ? pathname.slice(routerBasename.length)
    : pathname;
}

/** 从构建 mode 与 PUBLIC_URL 创建不可变语义的运行环境快照。 */
export function createRuntimeEnv({mode = "development", publicUrl = "/"}: RuntimeEnvInput): RuntimeEnv {
  const publicBaseUrl = normalizePublicBaseUrl(publicUrl);
  return {
    mode,
    publicBaseUrl,
    routerBasename: getRouterBasename(publicBaseUrl),
    isDevelopment: mode === "development",
    isProduction: mode === "production",
  };
}

function readLegacyProcessEnv(name: "NODE_ENV" | "PUBLIC_URL"): string | undefined {
  if (typeof process === "undefined") {
    return undefined;
  }
  return process.env[name];
}

// Vite 在 production/dev 构建时替换这两个常量；process.env 仅供现有 Jest runner 使用。
const buildMode = typeof __AICODEX_ADMIN_MODE__ === "string"
  ? __AICODEX_ADMIN_MODE__
  : readLegacyProcessEnv("NODE_ENV");
const buildPublicUrl = typeof __AICODEX_ADMIN_PUBLIC_URL__ === "string"
  ? __AICODEX_ADMIN_PUBLIC_URL__
  : readLegacyProcessEnv("PUBLIC_URL");

export const runtimeEnv = createRuntimeEnv({
  mode: buildMode,
  publicUrl: buildPublicUrl,
});

/** 使用当前构建环境生成仓库 public 资源 URL。 */
export function getPublicAssetUrl(assetPath: string): string {
  return joinPublicAssetUrl(runtimeEnv.publicBaseUrl, assetPath);
}
