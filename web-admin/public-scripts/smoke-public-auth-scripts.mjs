import fs from "node:fs";
import vm from "node:vm";

function createStorage() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(key, String(value));
    }
  };
}

function createLocation(url, replacements) {
  const parsed = new URL(url);

  return {
    get hash() {
      return parsed.hash;
    },
    get host() {
      return parsed.host;
    },
    set host(value) {
      parsed.host = value;
    },
    get hostname() {
      return parsed.hostname;
    },
    get href() {
      return parsed.href;
    },
    get origin() {
      return parsed.origin;
    },
    get pathname() {
      return parsed.pathname;
    },
    get port() {
      return parsed.port;
    },
    get protocol() {
      return parsed.protocol;
    },
    set protocol(value) {
      parsed.protocol = value;
    },
    get search() {
      return parsed.search;
    },
    replace(target) {
      replacements.push(String(target));
    }
  };
}

function createBaseContext(url) {
  const replacements = [];
  const localStorage = createStorage();
  const sessionStorage = createStorage();
  const window = {
    location: createLocation(url, replacements)
  };

  const context = {
    URL,
    URLSearchParams,
    atob(value) {
      return Buffer.from(value, "base64").toString("binary");
    },
    btoa(value) {
      return Buffer.from(value, "binary").toString("base64");
    },
    document: {
      body: {
        appendChild() {}
      },
      createElement(tagName) {
        return {
          appendChild() {},
          method: "",
          name: "",
          action: "",
          style: {},
          submit() {},
          tagName,
          type: "",
          value: ""
        };
      },
      getElementById() {
        return {
          style: {},
          textContent: ""
        };
      }
    },
    fetch() {
      throw new Error("Smoke should not issue network requests");
    },
    localStorage,
    navigator: {
      language: "en",
      userAgent: "public-script-smoke"
    },
    sessionStorage,
    window
  };

  context.globalThis = context;
  window.localStorage = localStorage;
  window.sessionStorage = sessionStorage;
  window.navigator = context.navigator;
  window.document = context.document;
  window.URL = URL;
  window.URLSearchParams = URLSearchParams;

  return {context: vm.createContext(context), replacements};
}

async function runAuthCallbackSmoke() {
  const {context} = createBaseContext("https://example.test/callback?code=fake-code");
  const source = fs.readFileSync(new URL("../public/AuthCallbackHandler.js", import.meta.url), "utf8");

  vm.runInContext(source, context, {filename: "AuthCallbackHandler.js"});
  if (typeof context.window.CasdoorAuthCallback?.run !== "function") {
    throw new Error("CasdoorAuthCallback.run was not registered");
  }

  await context.window.CasdoorAuthCallback.run();
}

async function runProviderHintRedirectSmoke() {
  const {context, replacements} = createBaseContext("https://example.test/login/oauth/authorize?client_id=fake-client&provider_hint=");
  const source = fs.readFileSync(new URL("../public/ProviderHintRedirect.js", import.meta.url), "utf8");

  vm.runInContext(source, context, {filename: "ProviderHintRedirect.js"});
  if (typeof context.window.CasdoorProviderHintRedirect?.run !== "function") {
    throw new Error("CasdoorProviderHintRedirect.run was not registered");
  }

  await context.window.CasdoorProviderHintRedirect.run();
  if (replacements[0] !== "/login/oauth/authorize?client_id=fake-client") {
    throw new Error("ProviderHintRedirect fallback mismatch: " + replacements[0]);
  }
}

await runAuthCallbackSmoke();
await runProviderHintRedirectSmoke();

console.log("public auth scripts smoke passed");
