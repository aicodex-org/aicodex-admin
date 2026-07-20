import {afterEach, beforeEach, describe, expect, test, vi} from "vitest";
// eslint-disable-next-line unused-imports/no-unused-imports
import type {ReactElement} from "react";
import {render} from "@testing-library/react";
import {renderLarkProviderGuide} from "./LarkProviderGuide";

vi.mock("i18next", () => {
  const mockI18next = {
    t: (key: string) => {
      const [, value] = key.split(":");
      return value || key;
    },
    init: () => Promise.resolve(),
    use: () => mockI18next,
  };

  return {
    __esModule: true,
    default: mockI18next,
    ...mockI18next,
  };
});

describe("renderLarkProviderGuide", () => {
  beforeEach(() => {
    window.matchMedia = ((query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList)) as typeof window.matchMedia;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("renders Feishu/Lark shared type and callback guidance", () => {
    const {container, getByDisplayValue, getByText} = render(renderLarkProviderGuide({
      type: "Lark",
      disableSsl: false,
    }, "https://auth.example.com") as ReactElement);

    expect(container.querySelector(".provider-edit-guide-row.admin-large-edit-full-width-row")).toBeInTheDocument();
    expect(container.querySelector(".provider-edit-endpoint-mode-panel")).toBeInTheDocument();
    expect(getByText("Feishu / Lark login setup")).toBeInTheDocument();
    expect(getByText(/Lark Provider type supports domestic Feishu and global Lark/)).toBeInTheDocument();
    expect(getByText(/Domestic Feishu/)).toBeInTheDocument();
    expect(getByText(/AICodex client redirect URI/)).toBeInTheDocument();
    expect(getByText(/custom scheme deep link/)).toBeInTheDocument();
    expect(getByDisplayValue("https://auth.example.com/callback")).toBeInTheDocument();
  });

  test("does not render Lark setup guidance for other providers", () => {
    expect(renderLarkProviderGuide({type: "GitHub"}, "https://auth.example.com")).toBeNull();
  });
});
