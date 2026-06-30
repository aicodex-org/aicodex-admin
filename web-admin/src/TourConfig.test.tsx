import {
  TourObj,
  getNextButtonChild,
  getNextUrl,
  getSteps,
  getTourVisible,
  setIsTourVisible,
  setOrgIsTourVisible,
  setTourLogo
} from "./TourConfig";
import {expect, jest} from "@jest/globals";

describe("TourConfig enterprise identity routes", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("keeps the legacy English tour closed on enterprise identity routes by default", () => {
    expect(getTourVisible("/applications")).toBe(false);
    expect(getTourVisible("/application-usage-access")).toBe(false);
    expect(getTourVisible("/providers")).toBe(false);
    expect(getTourVisible("/records")).toBe(false);
    expect(getTourVisible("/agents")).toBe(false);
    expect(getTourVisible("/applications/admin/app-built-in?tab=providers")).toBe(false);
  });

  test("keeps explicit user choice for non-enterprise legacy routes", () => {
    expect(getTourVisible("/sysinfo")).toBe(true);

    localStorage.setItem("isTourVisible", "false");

    expect(getTourVisible("/sysinfo")).toBe(false);
  });

  test("uses the current browser path when no explicit path is provided", () => {
    window.history.pushState({}, "", "/applications?tab=providers");
    localStorage.setItem("isTourVisible", "true");

    expect(getTourVisible()).toBe(false);

    window.history.pushState({}, "", "/sysinfo");
    expect(getTourVisible()).toBe(true);
    expect(getNextUrl()).toBe("syncers");
  });

  test("keeps legacy tour helpers working outside enterprise identity routes", () => {
    const listener = jest.fn();
    window.addEventListener("storageTourChanged", listener);

    setIsTourVisible(false);

    expect(localStorage.getItem("isTourVisible")).toBe("false");
    expect(listener).toHaveBeenCalledTimes(1);

    setOrgIsTourVisible(false);

    expect(localStorage.getItem("isTourVisible")).toBe("false");

    localStorage.setItem("isTourVisible", "true");
    setOrgIsTourVisible(true);
    expect(localStorage.getItem("isTourVisible")).toBe("true");

    expect(getNextUrl("/home")).toBe("organizations");
    expect(getNextButtonChild("sysinfo")).toBe("Go to \"Sysinfo List\"");
    expect(getNextButtonChild("")).toBe("Finish");

    window.removeEventListener("storageTourChanged", listener);
  });

  test("returns current page steps without auto-opening enterprise tours", () => {
    window.history.pushState({}, "", "/home");
    expect(getSteps()).toBe(TourObj.home);

    window.history.pushState({}, "", "/unknown-route");
    expect(getSteps()).toEqual([]);
  });

  test("updates custom tour logo when a non-empty logo is provided", () => {
    const originalCover = TourObj.home[0].cover;

    setTourLogo("");
    expect(TourObj.home[0].cover).toBe(originalCover);

    setTourLogo("/custom-logo.png");
    const cover = TourObj.home[0]?.cover as React.ReactElement<{src?: string}>;
    expect(cover.props.src).toBe("/custom-logo.png");
  });
});
