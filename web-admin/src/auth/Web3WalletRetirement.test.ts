/* eslint-env jest */
import {expect, jest, test} from "@jest/globals";
import {clearRetiredWeb3WalletAuthTokens, isRetiredWeb3WalletProvider} from "./Web3WalletRetirement";

test.each([
  [undefined, false],
  [{category: "Web3", type: "Custom"}, true],
  [{category: "  wEb3 ", type: "Custom"}, true],
  [{category: "OAuth", type: " MetaMask "}, true],
  [{category: "SAML", type: "web3onboard"}, true],
  [{category: "OAuth", type: "GitHub"}, false],
  [{category: "Web30", type: "MetaMask2"}, false],
])("classifies retired wallet provider %p as %p", (provider, expected) => {
  expect(isRetiredWeb3WalletProvider(provider)).toBe(expected);
});

test("clears only legacy wallet token keys without reading their values", () => {
  const keys = ["theme", "Web3AuthToken_first", "signinUrl", "Web3AuthToken_second"];
  const storage = {
    get length() {
      return keys.length;
    },
    key: jest.fn((index: number) => keys[index] ?? null),
    removeItem: jest.fn(),
  };

  clearRetiredWeb3WalletAuthTokens(storage);

  expect(storage.removeItem).toHaveBeenCalledTimes(2);
  expect(storage.removeItem).toHaveBeenNthCalledWith(1, "Web3AuthToken_first");
  expect(storage.removeItem).toHaveBeenNthCalledWith(2, "Web3AuthToken_second");
});
