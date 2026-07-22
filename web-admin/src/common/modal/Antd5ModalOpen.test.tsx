import {afterEach, beforeEach, expect, test, vi} from "vitest";

import React from "react";
import {act, fireEvent, render, waitFor} from "@testing-library/react";
import {CaptchaModal} from "./CaptchaModal";
import FaceRecognitionCommonModal from "./FaceRecognitionCommonModal";
import FaceRecognitionModal from "./FaceRecognitionModal";
import * as UserBackend from "../../backend/UserBackend";

const mockLoadTinyFaceDetector = vi.fn<() => Promise<void>>();
const mockLoadFaceLandmark = vi.fn<() => Promise<void>>();
const mockLoadFaceRecognition = vi.fn<() => Promise<void>>();

vi.mock("face-api.js", () => ({
  nets: {
    tinyFaceDetector: {loadFromUri: () => mockLoadTinyFaceDetector()},
    faceLandmark68Net: {loadFromUri: () => mockLoadFaceLandmark()},
    faceRecognitionNet: {loadFromUri: () => mockLoadFaceRecognition()},
  },
  TinyFaceDetectorOptions: function TinyFaceDetectorOptions() {},
  detectAllFaces: () => undefined,
}));

vi.mock("antd/es/upload/Dragger", () => ({__esModule: true, default: () => null}));
vi.mock("../CaptchaWidget", () => ({CaptchaWidget: () => null}));

beforeEach(() => {
  mockLoadTinyFaceDetector.mockResolvedValue(undefined);
  mockLoadFaceLandmark.mockResolvedValue(undefined);
  mockLoadFaceRecognition.mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function finishModalExitMotion(): void {
  document.querySelectorAll<HTMLElement>(".ant-modal, .ant-modal-mask").forEach(element => {
    fireEvent.transitionEnd(element);
    fireEvent.animationEnd(element);
  });
}

async function finishModalExitMotionWhenReady(): Promise<void> {
  // rc-motion在leave-active阶段才注册原生结束事件，需等待监听就绪再结束动画。
  await waitFor(() => {
    expect(document.querySelector(".ant-modal.ant-zoom-leave-active")).not.toBeNull();
    expect(document.querySelector(".ant-modal-mask.ant-fade-leave-active")).not.toBeNull();
  });
  finishModalExitMotion();
}

test("CaptchaModal loads only when the open prop becomes true", async() => {
  const getCaptcha = vi.spyOn(UserBackend, "getCaptcha").mockResolvedValue({
    type: "Default",
    captchaId: "captcha-id",
    captchaImage: "image",
  } as never);
  const props = {owner: "built-in", name: "captcha", onOk: vi.fn(), onCancel: vi.fn(), isCurrentProvider: true};
  const view = render(<CaptchaModal {...props} open={false} />);
  expect(getCaptcha).not.toHaveBeenCalled();

  view.rerender(<CaptchaModal {...props} open={true} />);
  await waitFor(() => expect(getCaptcha).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(view.getByRole("dialog")).not.toBeNull());

  view.rerender(<CaptchaModal {...props} open={false} />);
  await finishModalExitMotionWhenReady();
  await waitFor(() => expect(view.queryByRole("dialog")).toBeNull());

  view.rerender(<CaptchaModal {...props} open={true} />);
  await waitFor(() => expect(getCaptcha).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(view.getByRole("dialog")).not.toBeNull());
});

test("CaptchaModal opens for a non-default captcha provider", async() => {
  vi.spyOn(UserBackend, "getCaptcha").mockResolvedValue({
    type: "Turnstile",
    clientId: "site-key",
    clientSecret: "client-secret",
    subType: "managed",
    clientId2: "",
    clientSecret2: "",
  } as never);

  const view = render(<CaptchaModal owner="built-in" name="captcha" open={true} onOk={vi.fn()} onCancel={vi.fn()} isCurrentProvider={true} />);
  await waitFor(() => expect(view.getByRole("dialog")).not.toBeNull());
});

test("FaceRecognitionCommonModal opens the camera and stops tracks after close", async() => {
  vi.useFakeTimers();
  const stopFirstStream = vi.fn();
  const stopSecondStream = vi.fn();
  const getUserMedia = vi.fn<() => Promise<MediaStream>>()
    .mockResolvedValueOnce({getTracks: () => [{stop: stopFirstStream}]} as unknown as MediaStream)
    .mockResolvedValueOnce({getTracks: () => [{stop: stopSecondStream}]} as unknown as MediaStream);
  Object.defineProperty(navigator, "mediaDevices", {configurable: true, value: {getUserMedia}});
  const props = {onOk: vi.fn(), onCancel: vi.fn()};
  const view = render(<FaceRecognitionCommonModal {...props} open={true} />);

  await act(async() => {
    await Promise.resolve();
  });
  expect(getUserMedia).toHaveBeenCalledTimes(1);
  expect(view.getByRole("dialog")).not.toBeNull();

  view.rerender(<FaceRecognitionCommonModal {...props} open={false} />);
  await act(async() => {
    await Promise.resolve();
  });
  act(() => vi.runOnlyPendingTimers());
  finishModalExitMotion();
  expect(stopFirstStream).toHaveBeenCalledTimes(1);
  expect(view.queryByRole("dialog")).toBeNull();

  view.rerender(<FaceRecognitionCommonModal {...props} open={true} />);
  await act(async() => {
    await Promise.resolve();
  });
  expect(getUserMedia).toHaveBeenCalledTimes(2);
  expect(view.getByRole("dialog")).not.toBeNull();

  view.rerender(<FaceRecognitionCommonModal {...props} open={false} />);
  await act(async() => {
    await Promise.resolve();
  });
  expect(stopSecondStream).toHaveBeenCalledTimes(1);
  vi.clearAllTimers();
  vi.useRealTimers();
});

test("FaceRecognitionModal loads models through the open prop", async() => {
  const view = render(<FaceRecognitionModal open={false} withImage={true} onOk={vi.fn()} onCancel={vi.fn()} />);
  expect(mockLoadTinyFaceDetector).not.toHaveBeenCalled();

  view.rerender(<FaceRecognitionModal open={true} withImage={true} onOk={vi.fn()} onCancel={vi.fn()} />);
  await waitFor(() => {
    expect(mockLoadTinyFaceDetector).toHaveBeenCalledTimes(1);
    expect(mockLoadFaceLandmark).toHaveBeenCalledTimes(1);
    expect(mockLoadFaceRecognition).toHaveBeenCalledTimes(1);
  });
  expect(view.getByRole("dialog")).not.toBeNull();

  view.rerender(<FaceRecognitionModal open={false} withImage={true} onOk={vi.fn()} onCancel={vi.fn()} />);
  await finishModalExitMotionWhenReady();
  await waitFor(() => expect(view.queryByRole("dialog")).toBeNull());

  view.rerender(<FaceRecognitionModal open={true} withImage={true} onOk={vi.fn()} onCancel={vi.fn()} />);
  await waitFor(() => expect(view.getByRole("dialog")).not.toBeNull());
  expect(mockLoadTinyFaceDetector).toHaveBeenCalledTimes(1);
  expect(mockLoadFaceLandmark).toHaveBeenCalledTimes(1);
  expect(mockLoadFaceRecognition).toHaveBeenCalledTimes(1);
});
