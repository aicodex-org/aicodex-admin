import {expect, test, vi} from "vitest";
import AuthCallbackWithRouter, {resolveAuthCallbackCode} from "./AuthCallback";

vi.mock("i18next", () => ({
  __esModule: true,
  default: {
    use() {
      return this;
    },
    init: () => Promise.resolve(),
    translator: {
      translate: (key: string) => key,
    },
    t(this: {translator: {translate: (key: string) => string}}, key: string) {
      return this.translator.translate(key);
    },
  },
}));

test("callback loading message keeps the i18next receiver bound", () => {
  const AuthCallback = (AuthCallbackWithRouter as unknown as {
    WrappedComponent: new(props: {location: {search: string}}) => {render: () => JSX.Element};
  }).WrappedComponent;
  const callback = new AuthCallback({location: {search: ""}});

  expect(() => callback.render()).not.toThrow();
});

test("callback ignores retired Web3 storage token keys", () => {
  const storage = {getItem: vi.fn(() => "must-not-be-consumed")};
  const params = new URLSearchParams("?web3AuthTokenKey=Web3AuthToken_legacy");

  expect(resolveAuthCallbackCode(params, storage)).toBeNull();
  expect(storage.getItem).not.toHaveBeenCalled();
});

test.each([
  ["?code=oauth-code", "oauth-code"],
  ["?auth_code=wecom-code", "wecom-code"],
  ["?authCode=dingtalk-code", "dingtalk-code"],
])("callback keeps supported authorization code aliases for %s", (search, expected) => {
  expect(resolveAuthCallbackCode(new URLSearchParams(search), {getItem: vi.fn()})).toBe(expected);
});
