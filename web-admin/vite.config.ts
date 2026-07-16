import {defineConfig, loadEnv, type ProxyOptions} from "vite";
import react from "@vitejs/plugin-react";
import {normalizePublicBaseUrl} from "./src/config/runtimeEnv";

const defaultDevProxyTarget = "http://localhost:8000";
const proxyContexts = [
  "/api",
  "/swagger",
  "/files",
  "/.well-known/openid-configuration",
  "/scim",
  "^/cas/[^/]+/(?:p3/)?(?:serviceValidate|proxyValidate|proxy|validate)(?:$|\\?)",
] as const;

function resolvePort(value?: string): number {
  if (!value) {
    return 7002;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return port;
}

function createProxy(target: string): Record<string, ProxyOptions> {
  return Object.fromEntries(proxyContexts.map(context => [context, {
    target,
    changeOrigin: true,
  }]));
}

export default defineConfig(({mode}) => {
  const fileEnv = loadEnv(mode, process.cwd(), "");
  const publicBaseUrl = normalizePublicBaseUrl(process.env.PUBLIC_URL || fileEnv.PUBLIC_URL);
  const devProxyTarget = process.env.AICODEX_ADMIN_DEV_PROXY_TARGET
    || process.env.AICODEX_ADMIN_PROXY_TARGET
    || fileEnv.AICODEX_ADMIN_DEV_PROXY_TARGET
    || fileEnv.AICODEX_ADMIN_PROXY_TARGET
    || defaultDevProxyTarget;

  return {
    base: publicBaseUrl,
    plugins: [react()],
    resolve: {
      alias: {
        buffer: "buffer/",
      },
    },
    define: {
      __AICODEX_ADMIN_MODE__: JSON.stringify(mode),
      __AICODEX_ADMIN_PUBLIC_URL__: JSON.stringify(publicBaseUrl),
      global: "globalThis",
    },
    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
          modifyVars: {
            "@primary-color": "rgb(89,54,213)",
            "@border-radius-base": "5px",
          },
        },
      },
    },
    optimizeDeps: {
      include: ["buffer"],
    },
    server: {
      host: "0.0.0.0",
      port: resolvePort(process.env.PORT || fileEnv.PORT),
      strictPort: true,
      hmr: {
        overlay: true,
      },
      proxy: createProxy(devProxyTarget),
    },
    build: {
      outDir: "build",
      emptyOutDir: true,
      sourcemap: false,
      target: "es2020",
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  };
});
