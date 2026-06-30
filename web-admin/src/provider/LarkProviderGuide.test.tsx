/* eslint-env jest */
// eslint-disable-next-line unused-imports/no-unused-imports
import type {ReactElement} from "react";
import {jest, expect as jestExpect} from "@jest/globals";
import {render} from "@testing-library/react";
import {renderLarkProviderGuide} from "./LarkProviderGuide";

type DomMatcherResult = ReturnType<typeof jestExpect> & {
  toBeInTheDocument: () => void;
};

const expect = jestExpect as unknown as (actual: unknown) => DomMatcherResult;

jest.mock("i18next", () => {
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
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    } as unknown as MediaQueryList)) as typeof window.matchMedia;
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("renders Feishu/Lark shared type and callback guidance", () => {
    const {getByDisplayValue, getByText} = render(renderLarkProviderGuide({
      type: "Lark",
      disableSsl: false,
    }, "https://auth.example.com") as ReactElement);

    expect(getByText("Feishu / Lark login setup")).toBeInTheDocument();
    expect(getByText(/Lark Provider type supports domestic Feishu and global Lark/)).toBeInTheDocument();
    expect(getByText(/Domestic Feishu/)).toBeInTheDocument();
    expect(getByText(/AICodex client redirect URI/)).toBeInTheDocument();
    expect(getByText(/custom scheme deep link/)).toBeInTheDocument();
    expect(getByDisplayValue("https://auth.example.com/callback")).toBeInTheDocument();
  });
});
