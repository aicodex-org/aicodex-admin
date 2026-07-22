import {afterEach, beforeEach, expect, test, vi} from "vitest";
import React from "react";
import {cleanup, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import copy from "copy-to-clipboard";
import * as Setting from "../Setting";
import ListPageIdentityCell from "./ListPageIdentityCell";
import {fireEvent} from "@testing-library/react";

type LooseMock = {
  (...args: unknown[]): unknown;
  mockReturnValue: (value: unknown) => LooseMock;
};

const copyMock = copy as unknown as LooseMock;

vi.mock("copy-to-clipboard", () => {
  return {default: vi.fn()};
});

beforeEach(() => {
  copyMock.mockReturnValue(true);
  vi.spyOn(Setting, "showMessage").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

test("renders identity content and copies the secondary identifier through the weak action", () => {
  const view = render(
    <MemoryRouter>
      <ListPageIdentityCell
        classPrefix="organization-table-identity"
        title="联软科技集团平台组织"
        titleTo="/organizations/engineering"
        secondary="wecom-dept-wwe7e01c69367e67bf"
        copyLabel="复制组织 ID"
        iconSrc="/static/org.png"
        iconAlt="组织图标"
        onCopiedMessage="已复制组织 ID"
      />
    </MemoryRouter>
  );

  const link = view.getByText("联软科技集团平台组织").closest("a");
  const copyButton = view.getByLabelText("复制组织 ID");

  expect(link?.getAttribute("href")).toBe("/organizations/engineering");
  expect(view.getByAltText("组织图标").getAttribute("src")).toContain("/static/org.png");
  expect(view.container.querySelector(".organization-table-identity-id")?.textContent).toBe("wecom-dept-wwe7e01c69367e67bf");

  fireEvent.click(copyButton);

  expect(copy).toHaveBeenCalledWith("wecom-dept-wwe7e01c69367e67bf");
  expect(Setting.showMessage).toHaveBeenCalledWith("success", "已复制组织 ID");
});

test("uses the title as fallback icon alt and hides copy action when no value is available", () => {
  const view = render(
    <MemoryRouter>
      <ListPageIdentityCell
        classPrefix="group-table-identity"
        title="平台维护群组"
        titleTo="/groups/platform"
        secondary=""
        copyValue=""
        copyLabel="复制群组 ID"
        iconSrc="/static/group.png"
        onCopiedMessage="已复制群组 ID"
      />
    </MemoryRouter>
  );

  expect(view.getByAltText("平台维护群组").getAttribute("src")).toContain("/static/group.png");
  expect(view.queryByLabelText("复制群组 ID")).toBeNull();
  expect(view.container.querySelector(".group-table-identity-copy-id")).toBeNull();
});
