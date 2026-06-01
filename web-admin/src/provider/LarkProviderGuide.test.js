/* eslint-env jest */
import {render} from "@testing-library/react";
import {renderLarkProviderGuide} from "./LarkProviderGuide";

jest.mock("i18next", () => {
  const mockI18next = {
    t: key => {
      const [, value] = key.split(":");
      return value || key;
    },
    init: jest.fn(() => Promise.resolve()),
  };
  mockI18next.use = jest.fn(() => mockI18next);

  return {
    __esModule: true,
    default: mockI18next,
    ...mockI18next,
  };
});

describe("renderLarkProviderGuide", () => {
  beforeEach(() => {
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("renders Feishu/Lark shared type and callback guidance", () => {
    const {getByDisplayValue, getByText} = render(renderLarkProviderGuide({
      type: "Lark",
      disableSsl: false,
    }, "https://auth.example.com"));

    expect(getByText("Feishu / Lark login setup")).toBeInTheDocument();
    expect(getByText(/Lark Provider type supports domestic Feishu and global Lark/)).toBeInTheDocument();
    expect(getByText(/Domestic Feishu/)).toBeInTheDocument();
    expect(getByText(/AICodex client redirect URI/)).toBeInTheDocument();
    expect(getByText(/custom scheme deep link/)).toBeInTheDocument();
    expect(getByDisplayValue("https://auth.example.com/callback")).toBeInTheDocument();
  });
});
