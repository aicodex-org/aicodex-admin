/* eslint-env jest */
import React from "react";
import {render} from "@testing-library/react";
import {beforeEach, expect, jest} from "@jest/globals";
import OAuthWidget from "./OAuthWidget";
import * as AuthBackend from "../auth/AuthBackend";
import * as Setting from "../Setting";

type UnlinkMock = {
  (...args: unknown[]): unknown;
  mockReset: () => UnlinkMock;
  mockResolvedValue: (value: unknown) => UnlinkMock;
};

const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {click: (element: Element) => boolean};
};

jest.mock("../auth/AuthBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jest};
  return {unlink: factoryJest.fn()};
});
jest.mock("../account/AccountAvatar", () => function AccountAvatarMock(props: {alt?: string}) {
  return <span data-testid="account-avatar">{props.alt}</span>;
});

const unlinkMock = AuthBackend.unlink as unknown as UnlinkMock;

function renderWalletWidget(linkedValue: string) {
  const onUnlinked = jest.fn();
  const user = {id: "user-1", metamask: linkedValue, properties: {}};
  const account = {id: "user-1", isAdmin: false};
  const providerItem = {
    name: "legacy-wallet",
    canUnlink: true,
    provider: {name: "legacy-wallet", category: "Web3", type: "MetaMask"},
  };

  return {
    onUnlinked,
    view: render(
      <OAuthWidget
        labelSpan={3}
        user={user}
        account={account}
        application={{affiliationUrl: ""}}
        providerItem={providerItem}
        onUnlinked={onUnlinked}
      />
    ),
  };
}

beforeEach(() => {
  unlinkMock.mockReset();
  unlinkMock.mockResolvedValue({status: "ok"} as never);
  jest.spyOn(Setting, "getLanguage").mockReturnValue("en");
  jest.spyOn(Setting, "isMobile").mockReturnValue(false);
  jest.spyOn(Setting, "isAdminUser").mockReturnValue(false);
  jest.spyOn(Setting, "getProviderLogo").mockReturnValue(<span>Wallet</span>);
  jest.spyOn(Setting, "showMessage").mockImplementation(() => undefined);
});

test("does not render a Link action for an empty retired wallet binding", () => {
  const {view} = renderWalletWidget("");

  expect(view.queryByText("Link")).toBeNull();
  expect(view.container.firstChild).toBeNull();
});

test("unlinks a historical wallet binding through the generic backend without wallet SDK work", () => {
  const {view} = renderWalletWidget("legacy-wallet-binding");

  expect(view.queryByText("Link")).toBeNull();
  const unlinkButton = view.container.querySelector("button");
  expect(unlinkButton).not.toBeNull();
  fireEvent.click(unlinkButton as HTMLButtonElement);
  expect(unlinkMock).toHaveBeenCalledWith({
    providerType: "MetaMask",
    user: expect.objectContaining({id: "user-1", metamask: "legacy-wallet-binding"}),
  });
});
