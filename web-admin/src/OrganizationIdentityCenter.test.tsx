import {describe, expect, test} from "vitest";
import React from "react";
import {render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import OrganizationIdentityCenter from "./OrganizationIdentityCenter";

type OrganizationIdentityPage = "organizations" | "users" | "roles" | "permissions";

function renderIdentityPage(page: OrganizationIdentityPage) {
  return render(
    <MemoryRouter>
      <OrganizationIdentityCenter
        page={page}
        currentOrganization={page === "users" ? "team-alpha" : "All"}
        total={42}
        loadedCount={10}
      >
        <div>{`${page} table remains reachable`}</div>
      </OrganizationIdentityCenter>
    </MemoryRouter>
  );
}

describe("OrganizationIdentityCenter", () => {
  (["organizations", "users", "roles", "permissions"] as OrganizationIdentityPage[]).forEach(page => {
    test(`renders ${page} as the shared compact list shell`, () => {
      const view = renderIdentityPage(page);

      expect(view.container.querySelector(".organization-identity-compact-list-page")).not.toBeNull();
      expect(view.container.querySelector(`.organization-identity-compact-list-page-${page}`)).not.toBeNull();
      expect(view.getByText(`${page} table remains reachable`)).not.toBeNull();
      expect(view.queryByTestId("organization-identity-workbench")).toBeNull();
      expect(view.container.querySelector(".organization-identity-list-section")).toBeNull();
      expect(view.container.querySelector(".organization-identity-governance-summary")).toBeNull();

      view.unmount();
    });
  });

  test("does not render duplicated role or permission navigation shortcuts", () => {
    const roleView = renderIdentityPage("roles");
    expect(roleView.queryByText("角色授权工作台")).toBeNull();
    expect(roleView.queryByText("审查高权限角色")).toBeNull();
    expect(roleView.queryByText("核对权限覆盖")).toBeNull();
    expect(roleView.queryByText("核对成员绑定")).toBeNull();
    roleView.unmount();

    const permissionView = renderIdentityPage("permissions");
    expect(permissionView.queryByText("权限目录工作台")).toBeNull();
    expect(permissionView.queryByText("核对权限目录")).toBeNull();
    expect(permissionView.queryByText("核对角色引用")).toBeNull();
    expect(permissionView.queryByText("核对权限粒度")).toBeNull();
    permissionView.unmount();
  });

  test("does not render synthetic counts while list data is loading", () => {
    const view = render(
      <MemoryRouter>
        <OrganizationIdentityCenter page="roles">
          <div>Role table loading</div>
        </OrganizationIdentityCenter>
      </MemoryRouter>
    );

    expect(view.queryByText("-")).toBeNull();
    expect(view.queryByText("当前筛选结果")).toBeNull();
    expect(view.queryByText(/已加载行数/)).toBeNull();
    expect(view.getByText("Role table loading")).not.toBeNull();
    view.unmount();
  });
});
