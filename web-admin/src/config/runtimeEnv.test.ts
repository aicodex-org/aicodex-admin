import {describe, expect, test} from "vitest";
import {
  createRuntimeEnv,
  getPublicAssetUrl,
  getRouterBasename,
  getRuntimePathname,
  joinPublicAssetUrl,
  normalizePublicBaseUrl,
  resolvePublicAssetUrl
} from "./runtimeEnv";

describe("runtimeEnv", () => {
  const publicBaseCases: Array<[string | undefined, string]> = [
    [undefined, "/"],
    ["", "/"],
    ["/", "/"],
    ["admin", "/admin/"],
    ["/admin/", "/admin/"],
    ["https://cdn.example.test/admin", "https://cdn.example.test/admin/"],
  ];

  for (const [value, expected] of publicBaseCases) {
    test(`normalizes public base ${value ?? "undefined"} to ${expected}`, () => {
      expect(normalizePublicBaseUrl(value)).toBe(expected);
    });
  }

  test("joins public assets without duplicate or missing separators", () => {
    expect(joinPublicAssetUrl("/", "/branding/icon.svg")).toBe("/branding/icon.svg");
    expect(joinPublicAssetUrl("/admin/", "branding/icon.svg")).toBe("/admin/branding/icon.svg");
    expect(joinPublicAssetUrl("https://cdn.example.test/admin", "/branding/icon.svg"))
      .toBe("https://cdn.example.test/admin/branding/icon.svg");
  });

  test("uses the resolved runtime base for public assets", () => {
    expect(getPublicAssetUrl("branding/icon.svg")).toBe("/branding/icon.svg");
  });

  test("prefixes repository branding assets without rewriting API or external URLs", () => {
    expect(resolvePublicAssetUrl("/admin-console/", "/branding/favicon.png"))
      .toBe("/admin-console/branding/favicon.png");
    expect(resolvePublicAssetUrl("/admin-console/", "/api/get-resource?id=logo"))
      .toBe("/api/get-resource?id=logo");
    expect(resolvePublicAssetUrl("/admin-console/", "https://cdn.example.test/logo.png"))
      .toBe("https://cdn.example.test/logo.png");
  });

  test("derives a router basename from relative and absolute public bases", () => {
    expect(getRouterBasename("/")).toBe("/");
    expect(getRouterBasename("/admin-console/")).toBe("/admin-console");
    expect(getRouterBasename("https://cdn.example.test/admin-console/"))
      .toBe("/admin-console");
  });

  test("removes the deployment basename from browser pathnames", () => {
    expect(getRuntimePathname("/login", "/")).toBe("/login");
    expect(getRuntimePathname("/admin-console", "/admin-console")).toBe("/");
    expect(getRuntimePathname("/admin-console/callback", "/admin-console"))
      .toBe("/callback");
    expect(getRuntimePathname("/other/login", "/admin-console")).toBe("/other/login");
  });

  test("exposes typed development and production mode flags", () => {
    expect(createRuntimeEnv({mode: "development", publicUrl: "/console"})).toEqual({
      mode: "development",
      publicBaseUrl: "/console/",
      routerBasename: "/console",
      isDevelopment: true,
      isProduction: false,
    });
    expect(createRuntimeEnv({mode: "production", publicUrl: ""})).toEqual({
      mode: "production",
      publicBaseUrl: "/",
      routerBasename: "/",
      isDevelopment: false,
      isProduction: true,
    });
  });
});
