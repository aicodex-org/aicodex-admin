import {describe, expect, test, vi} from "vitest";
import React from "react";
import {render} from "@testing-library/react";
import ShortcutsPage, {buildShortcutItems} from "./ShortcutsPage";

vi.mock("./GridCards", () => ({
  __esModule: true,
  default: ({items}: {items: Array<{link: string; logo: string}>}) => (
    <div data-testid="shortcut-grid">
      {items.map(item => (
        <a key={item.link} href={item.link}>
          {item.logo}
        </a>
      ))}
    </div>
  ),
}));

describe("ShortcutsPage", () => {
  test("builds management shortcuts with static logos", () => {
    expect(buildShortcutItems("/static").map(item => ({
      link: item.link,
      logo: item.logo,
      createdTime: item.createdTime,
    }))).toEqual([
      {link: "/organizations", logo: "/static/img/organizations.png", createdTime: ""},
      {link: "/users", logo: "/static/img/users.png", createdTime: ""},
      {link: "/providers", logo: "/static/img/providers.png", createdTime: ""},
      {link: "/applications", logo: "/static/img/applications.png", createdTime: ""},
    ]);
  });

  test("renders the shortcut grid", () => {
    const view = render(<ShortcutsPage />);

    const grid = view.getByTestId("shortcut-grid");

    expect(grid.querySelectorAll("a")).toHaveLength(4);
    expect(grid.querySelector("a[href=\"/organizations\"]")).not.toBeNull();
  });
});
