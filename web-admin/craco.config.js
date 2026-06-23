const CracoLessPlugin = require("craco-less");
const path = require("path");

const devProxyTarget = process.env.AICODEX_ADMIN_PROXY_TARGET || "http://localhost:8000";

module.exports = {
  devServer: {
    proxy: {
      "/api": {
        target: devProxyTarget,
        changeOrigin: true,
      },
      "/swagger": {
        target: devProxyTarget,
        changeOrigin: true,
      },
      "/files": {
        target: devProxyTarget,
        changeOrigin: true,
      },
      "/.well-known/openid-configuration": {
        target: devProxyTarget,
        changeOrigin: true,
      },
      "/cas/**/serviceValidate": {
        target: devProxyTarget,
        changeOrigin: true,
      },
      "/cas/**/proxyValidate": {
        target: devProxyTarget,
        changeOrigin: true,
      },
      "/cas/**/proxy": {
        target: devProxyTarget,
        changeOrigin: true,
      },
      "/cas/**/validate": {
        target: devProxyTarget,
        changeOrigin: true,
      },
      "/cas/**/p3/serviceValidate": {
        target: devProxyTarget,
        changeOrigin: true,
      },
      "/cas/**/p3/proxyValidate": {
        target: devProxyTarget,
        changeOrigin: true,
      },
      "/scim": {
        target: devProxyTarget,
        changeOrigin: true,
      },
    },
  },
  plugins: [
    {
      plugin: CracoLessPlugin,
      options: {
        lessLoaderOptions: {
          lessOptions: {
            modifyVars: {"@primary-color": "rgb(89,54,213)", "@border-radius-base": "5px"},
            javascriptEnabled: true,
          },
        },
      },
    },
  ],
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      paths.appBuild = path.resolve(__dirname, "build-temp");
      webpackConfig.output.path = path.resolve(__dirname, "build-temp");

      // ignore webpack warnings by source-map-loader
      // https://github.com/facebook/create-react-app/pull/11752#issuecomment-1345231546
      webpackConfig.ignoreWarnings = [
        function ignoreSourcemapsloaderWarnings(warning) {
          return (
            warning.module &&
            warning.module.resource.includes("node_modules") &&
            warning.details &&
            warning.details.includes("source-map-loader")
          );
        },
      ];

      // use polyfill Buffer with Webpack 5
      // https://viglucci.io/articles/how-to-polyfill-buffer-with-webpack-5
      // https://craco.js.org/docs/configuration/webpack/
      webpackConfig.resolve.fallback = {
        buffer: require.resolve("buffer/"),
        process: false,
        util: false,
        url: false,
        zlib: false,
        stream: false,
        http: false,
        https: false,
        assert: false,
        crypto: false,
        os: false,
        fs: false,
      };

      return webpackConfig;
    },
  },
};
