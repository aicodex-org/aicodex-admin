/* eslint-env jest */
import {expect, jest, test} from "@jest/globals";
import AuthCallbackWithRouter from "./AuthCallback";

jest.mock("i18next", () => ({
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
