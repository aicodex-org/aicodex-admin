import {beforeEach, expect, test, vi} from "vitest";
import React from "react";
import {render} from "@testing-library/react";
import OAuthWidget from "./OAuthWidget";
import * as AuthBackend from "../auth/AuthBackend";
import * as Setting from "../Setting";
import {fireEvent} from "@testing-library/react";

type UnlinkMock = {
  (...args: unknown[]): unknown;
  mockReset: () => UnlinkMock;
  mockResolvedValue: (value: unknown) => UnlinkMock;
};

vi.mock("../auth/AuthBackend", () => {
  return {unlink: vi.fn()};
});
vi.mock("../account/AccountAvatar", () => ({
  default: function AccountAvatarMock(props: {alt?: string}) {
    return <span data-testid="account-avatar">{props.alt}</span>;
  },
}));

const unlinkMock = AuthBackend.unlink as unknown as UnlinkMock;

function renderWalletWidget(linkedValue: string) {
  const onUnlinked = vi.fn();
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
  vi.spyOn(Setting, "getLanguage").mockReturnValue("en");
  vi.spyOn(Setting, "isMobile").mockReturnValue(false);
  vi.spyOn(Setting, "isAdminUser").mockReturnValue(false);
  vi.spyOn(Setting, "getProviderLogo").mockReturnValue(<span>Wallet</span>);
  vi.spyOn(Setting, "showMessage").mockImplementation(() => undefined);
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
