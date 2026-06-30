import {defineConfig} from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:7001",
    "retries": {
      "runMode": 2,
      "openMode": 0,
    },
  },
});
