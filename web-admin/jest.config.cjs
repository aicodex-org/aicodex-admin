/**
 * web-admin 的 Jest 真值配置；显式保留迁移前 React Scripts 的测试语义。
 * Vite production build 不读取此文件。
 */
module.exports = {
  roots: ["<rootDir>/src"],
  collectCoverageFrom: ["src/**/*.{js,jsx,ts,tsx}", "!src/**/*.d.ts"],
  coverageDirectory: "coverage",
  coverageProvider: "babel",
  coverageReporters: ["json", "text", "lcov", "clover"],
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  testEnvironment: "jest-environment-jsdom",
  testEnvironmentOptions: {url: "http://localhost"},
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}",
    "<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}",
  ],
  testRunner: "jest-circus/runner",
  transform: {
    "^.+\\.(js|jsx|mjs|cjs|ts|tsx)$": "<rootDir>/config/jest/babelTransform.cjs",
  },
  transformIgnorePatterns: [
    "[/\\\\]node_modules[/\\\\].+\\.(js|jsx|mjs|cjs|ts|tsx)$",
    "^.+\\.module\\.(css|sass|scss|less)$",
  ],
  moduleNameMapper: {
    "^react-native$": "react-native-web",
    "^.+\\.module\\.(css|sass|scss|less)$": "identity-obj-proxy",
    "^.+\\.(css|sass|scss|less)$": "<rootDir>/config/jest/styleMock.cjs",
    "^.+\\.svg$": "<rootDir>/config/jest/svgMock.cjs",
    "^.+\\.(bmp|gif|jpe?g|png|webp|avif|eot|otf|ttf|woff2?|mp3|mp4|wav|m4a|aac|oga)$":
      "<rootDir>/config/jest/fileMock.cjs",
  },
  moduleFileExtensions: [
    "web.js",
    "js",
    "web.ts",
    "ts",
    "web.tsx",
    "tsx",
    "json",
    "web.jsx",
    "jsx",
    "node",
  ],
  resetMocks: true,
  watchPlugins: ["jest-watch-typeahead/filename", "jest-watch-typeahead/testname"],
};
