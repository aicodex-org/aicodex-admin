import react from "@vitejs/plugin-react";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {defineConfig} from "vitest/config";
import {testConfig} from "./config/vitest/testConfig";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const supportPath = (fileName: string): string =>
  path.resolve(rootDir, "config/vitest", fileName);

/**
 * web-admin 的单元测试真值配置。
 * 资产替身只作用于测试module graph，不改变production Vite dev/build行为。
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^.+\.module\.(css|less|sass|scss)$/,
        replacement: supportPath("styleModuleProxy.ts"),
      },
      {
        find: /^.+\.(css|less|sass|scss)$/,
        replacement: supportPath("styleMock.ts"),
      },
      {
        find: /^.+\.svg$/,
        replacement: supportPath("svgMock.tsx"),
      },
      {
        find: /^.+\.(bmp|gif|jpe?g|png|webp|avif|eot|otf|ttf|woff2?|mp3|mp4|wav|m4a|aac|oga)$/,
        replacement: supportPath("fileMock.ts"),
      },
    ],
  },
  test: testConfig,
});
