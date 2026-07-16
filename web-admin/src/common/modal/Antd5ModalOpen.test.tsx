/* eslint-env jest */

import React from "react";
import {expect, jest} from "@jest/globals";
import {act, render, waitFor} from "@testing-library/react";
import {CaptchaModal} from "./CaptchaModal";
import FaceRecognitionCommonModal from "./FaceRecognitionCommonModal";
import FaceRecognitionModal from "./FaceRecognitionModal";
import * as UserBackend from "../../backend/UserBackend";

const mockLoadTinyFaceDetector = jest.fn<Promise<void>, []>();
const mockLoadFaceLandmark = jest.fn<Promise<void>, []>();
const mockLoadFaceRecognition = jest.fn<Promise<void>, []>();

jest.mock("face-api.js", () => ({
  nets: {
    tinyFaceDetector: {loadFromUri: () => mockLoadTinyFaceDetector()},
    faceLandmark68Net: {loadFromUri: () => mockLoadFaceLandmark()},
    faceRecognitionNet: {loadFromUri: () => mockLoadFaceRecognition()},
  },
  TinyFaceDetectorOptions: function TinyFaceDetectorOptions() {},
  detectAllFaces: () => undefined,
}));

jest.mock("antd/es/upload/Dragger", () => ({__esModule: true, default: () => null}));
jest.mock("../CaptchaWidget", () => ({CaptchaWidget: () => null}));

beforeEach(() => {
  mockLoadTinyFaceDetector.mockResolvedValue(undefined);
  mockLoadFaceLandmark.mockResolvedValue(undefined);
  mockLoadFaceRecognition.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("CaptchaModal loads only when the open prop becomes true", async() => {
  const getCaptcha = jest.spyOn(UserBackend, "getCaptcha").mockResolvedValue({
    type: "Default",
    captchaId: "captcha-id",
    captchaImage: "image",
  } as never);
  const props = {owner: "built-in", name: "captcha", onOk: jest.fn(), onCancel: jest.fn(), isCurrentProvider: true};
  const view = render(<CaptchaModal {...props} open={false} />);
  expect(getCaptcha).not.toHaveBeenCalled();

  view.rerender(<CaptchaModal {...props} open={true} />);
  await waitFor(() => expect(getCaptcha).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(view.getByRole("dialog")).not.toBeNull());
});

test("CaptchaModal opens for a non-default captcha provider", async() => {
  jest.spyOn(UserBackend, "getCaptcha").mockResolvedValue({
    type: "Turnstile",
    clientId: "site-key",
    clientSecret: "client-secret",
    subType: "managed",
    clientId2: "",
    clientSecret2: "",
  } as never);

  const view = render(<CaptchaModal owner="built-in" name="captcha" open={true} onOk={jest.fn()} onCancel={jest.fn()} isCurrentProvider={true} />);
  await waitFor(() => expect(view.getByRole("dialog")).not.toBeNull());
});

test("FaceRecognitionCommonModal opens the camera and stops tracks after close", async() => {
  jest.useFakeTimers();
  const stop = jest.fn();
  const getUserMedia = jest.fn<Promise<MediaStream>, []>().mockResolvedValue({
    getTracks: () => [{stop}],
  } as unknown as MediaStream);
  Object.defineProperty(navigator, "mediaDevices", {configurable: true, value: {getUserMedia}});
  const props = {onOk: jest.fn(), onCancel: jest.fn()};
  const view = render(<FaceRecognitionCommonModal {...props} open={true} />);

  await act(async() => {
    await Promise.resolve();
  });
  expect(getUserMedia).toHaveBeenCalledTimes(1);

  view.rerender(<FaceRecognitionCommonModal {...props} open={false} />);
  await act(async() => {
    await Promise.resolve();
  });
  expect(stop).toHaveBeenCalledTimes(1);
  jest.clearAllTimers();
  jest.useRealTimers();
});

test("FaceRecognitionModal loads models through the open prop", async() => {
  const view = render(<FaceRecognitionModal open={false} withImage={true} onOk={jest.fn()} onCancel={jest.fn()} />);
  expect(mockLoadTinyFaceDetector).not.toHaveBeenCalled();

  view.rerender(<FaceRecognitionModal open={true} withImage={true} onOk={jest.fn()} onCancel={jest.fn()} />);
  await waitFor(() => {
    expect(mockLoadTinyFaceDetector).toHaveBeenCalledTimes(1);
    expect(mockLoadFaceLandmark).toHaveBeenCalledTimes(1);
    expect(mockLoadFaceRecognition).toHaveBeenCalledTimes(1);
  });
});
