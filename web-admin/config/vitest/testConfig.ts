import type {InlineConfig} from "vitest/node";

/** 可直接审计的runner契约；绝对资产alias仍由顶层Vitest配置负责。 */
export const testConfig = {
  environment: "jsdom",
  environmentOptions: {jsdom: {url: "http://localhost"}},
  setupFiles: ["src/setupTests.ts"],
  globals: false,
  maxWorkers: 1,
  fileParallelism: false,
  sequence: {concurrent: false},
  isolate: true,
  mockReset: true,
  include: [
    "src/**/__tests__/**/*.{js,jsx,ts,tsx}",
    "src/**/*.{spec,test}.{js,jsx,ts,tsx}",
  ],
  coverage: {
    provider: "v8",
    include: ["src/**/*.{js,jsx,ts,tsx}"],
    exclude: [
      "src/**/*.d.ts",
      "src/**/*.{test,spec}.{js,jsx,ts,tsx}",
      "src/**/__tests__/**",
    ],
    reportsDirectory: "coverage",
    reporter: ["text", "json", "lcov", "clover"],
  },
} satisfies InlineConfig;
