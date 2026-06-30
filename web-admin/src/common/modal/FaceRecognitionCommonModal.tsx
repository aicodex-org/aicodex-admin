// Copyright 2025 The Casdoor Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {Button, Modal, Progress, message} from "antd";
import React, {useState} from "react";
import i18next from "i18next";

type LegacyAny = import("../../types/legacyPage").LegacyAny;

const t = (key: string) => String(i18next.t(key));

const FaceRecognitionCommonModal = (props: LegacyAny) => {
  const {visible, onOk, onCancel} = props;

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [percent, setPercent] = useState(0);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);
  const [isCameraCaptured, setIsCameraCaptured] = useState(false);
  const [capturedImageArray, setCapturedImageArray] = useState<string[]>([]);

  React.useEffect(() => {
    if (isCameraCaptured) {
      let count = 0;
      let count2 = 0;
      const interval = setInterval(() => {
        count++;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStreamRef.current;
          videoRef.current.play();
          const interval2 = setInterval(() => {
            if (!visible) {
              clearInterval(interval);
              setPercent(0);
            }
            count2++;
            if (count2 >= 8) {
              clearInterval(interval2);
              setPercent(0);
              onOk(capturedImageArray);
            } else if (count2 > 3) {
              setPercent((count2 - 4) * 20);
              const video = videoRef.current;
              if (!video) {
                return;
              }
              const canvas = document.createElement("canvas");
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const context = canvas.getContext("2d");
              context?.drawImage(video, 0, 0, canvas.width, canvas.height);
              const b64 = canvas.toDataURL("image/png");
              capturedImageArray.push(b64);
              setCapturedImageArray(capturedImageArray);
            }
          }, 1000);

          clearInterval(interval);
        }
        if (count >= 30) {
          clearInterval(interval);
        }
      }, 100);
    } else {
      mediaStreamRef.current?.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [isCameraCaptured]);

  React.useEffect(() => {
    if (visible) {
      navigator.mediaDevices
        .getUserMedia({video: {facingMode: "user"}})
        .then((stream) => {
          mediaStreamRef.current = stream;
          setIsCameraCaptured(true);
        }).catch((error: LegacyAny) => {
          handleCameraError(error);
        });
    } else {
      setIsCameraCaptured(false);
      setCapturedImageArray([]);
    }
  }, [visible]);

  const handleCameraError = (error: LegacyAny) => {
    if (error instanceof DOMException) {
      if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        message.error(t("login:Please ensure that you have a camera device for facial recognition"));
      } else if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        message.error(t("login:Please provide permission to access the camera"));
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        message.error(t("login:The camera is currently in use by another webpage"));
      } else if (error.name === "TypeError") {
        message.error(t("login:Please load the webpage using HTTPS, otherwise the camera cannot be accessed"));
      } else {
        message.error(error.message);
      }
    }
  };

  return <div>
    <Modal
      closable={false}
      maskClosable={false}
      title={t("login:Face Recognition")}
      width={350}
      footer={[
        <Button key="ok" type={"primary"} disabled={capturedImageArray.length === 0} onClick={() => {
          onOk(capturedImageArray);
        }}>
        Ok
        </Button>,
        <Button key="back" onClick={onCancel}>
        Cancel
        </Button>,
      ]}
      destroyOnClose={true}
      open={visible}>
      <Progress percent={percent} />
      <div style={{
        marginTop: "20px",
        marginBottom: "50px",
        justifyContent: "center",
        alignContent: "center",
        position: "relative",
        flexDirection: "column",
      }}>
        {
          <div style={{display: "flex", justifyContent: "center", alignContent: "center"}}>
            <video
              ref={videoRef}
              style={{
                borderRadius: "50%",
                height: "220px",
                verticalAlign: "middle",
                width: "220px",
                objectFit: "cover",
              }}
            ></video>
            <div style={{
              position: "absolute",
              width: "240px",
              height: "240px",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}>
              <svg width="240" height="240" fill="none">
                <circle
                  strokeDasharray="700"
                  strokeDashoffset={700 - 6.9115 * percent}
                  strokeWidth="4"
                  cx="120"
                  cy="120"
                  r="110"
                  stroke="#5734d3"
                  transform="rotate(-90, 120, 120)"
                  strokeLinecap="round"
                  style={{transition: "all .2s linear"}}
                ></circle>
              </svg>
            </div>
            <canvas ref={canvasRef} style={{position: "absolute"}} />
          </div>
        }
      </div>
    </Modal>
  </div>;
};

export default FaceRecognitionCommonModal;
