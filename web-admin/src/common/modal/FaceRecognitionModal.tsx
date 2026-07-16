// Copyright 2024 The Casdoor Authors. All Rights Reserved.
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

import * as faceapi from "face-api.js";
import React, {useState} from "react";
import {Button, Modal, Progress, Space, Spin, message} from "antd";
import i18next from "i18next";
import Dragger from "antd/es/upload/Dragger";
import * as Setting from "../../Setting";

type LegacyAny = import("../../types/legacyPage").LegacyAny;

const t = (key: string) => String(i18next.t(key));

const FaceRecognitionModal = (props: LegacyAny) => {
  const {open, onOk, onCancel, withImage} = props;
  const [modelsLoaded, setModelsLoaded] = React.useState(false);
  const [isCameraCaptured, setIsCameraCaptured] = useState(false);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const detection = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);
  const [percent, setPercent] = useState(0);

  const [files, setFiles] = useState<LegacyAny[]>([]);
  const [currentFaceId, setCurrentFaceId] = React.useState<LegacyAny>();
  const [currentFaceIndex, setCurrentFaceIndex] = React.useState<number>();

  React.useEffect(() => {
    if (!open || modelsLoaded) {
      return;
    }

    const loadModels = async() => {
      // const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";
      const MODEL_URL = `${Setting.StaticBaseUrl}/casdoor/models`;

      Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]).then(() => {
        setModelsLoaded(true);
      }).catch(() => {
        message.error(t("login:Model loading failure"));
        onCancel();
      });
    };
    loadModels();
  }, [open, modelsLoaded]);

  React.useEffect(() => {
    if (withImage) {
      return;
    }
    if (open) {
      setPercent(0);
      if (modelsLoaded) {
        navigator.mediaDevices
          .getUserMedia({video: {facingMode: "user"}})
          .then((stream) => {
            mediaStreamRef.current = stream;
            setIsCameraCaptured(true);
          }).catch((error) => {
            handleCameraError(error);
          });
      }
    } else {
      if (detection.current) {
        clearInterval(detection.current);
      }
      detection.current = null;
      setIsCameraCaptured(false);
    }
    return () => {
      if (detection.current) {
        clearInterval(detection.current);
      }
      detection.current = null;
      setIsCameraCaptured(false);
    };
  }, [open, modelsLoaded]);

  React.useEffect(() => {
    if (withImage) {
      return;
    }
    if (isCameraCaptured) {
      let count = 0;
      const interval = setInterval(() => {
        count++;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStreamRef.current;
          videoRef.current.play();
          clearInterval(interval);
        }
        if (count >= 30) {
          clearInterval(interval);
          onCancel();
        }
      }, 100);
    } else {
      mediaStreamRef.current?.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [isCameraCaptured]);

  const handleStreamVideo = () => {
    if (withImage) {
      return;
    }
    let count = 0;
    let goodCount = 0;
    if (!detection.current) {
      detection.current = setInterval(async() => {
        if (modelsLoaded && videoRef.current && open) {
          const faces = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();

          count++;
          if (count % 50 === 0) {
            message.warning(t("login:Please ensure sufficient lighting and align your face in the center of the recognition box"));
          } else if (count > 300) {
            message.error(t("login:Face recognition failed"));
            onCancel();
          }
          if (faces.length === 1) {
            const face = faces[0];
            setPercent(Math.round(face.detection.score * 100));
            const array = Array.from(face.descriptor);
            if (face.detection.score > 0.9) {
              goodCount++;
              if (face.detection.score > 0.99 || goodCount > 10) {
                if (detection.current) {
                  clearInterval(detection.current);
                }
                onOk(array);
              }
            }
          } else {
            setPercent(Math.round(percent / 2));
          }
        }
      }, 100);
    }
  };

  const handleCameraError = (error: LegacyAny) => {
    onCancel();
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

  const getBase64 = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = (error) => reject(error);
    });
  };

  if (!withImage) {
    return (
      <div>
        <Modal
          closable={false}
          maskClosable={false}
          destroyOnClose={true}
          open={open && isCameraCaptured}
          title={t("login:Face Recognition")}
          width={350}
          footer={[
            <Button key="back" onClick={onCancel}>
                  Cancel
            </Button>,
          ]}
        >
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
              modelsLoaded ?
                <div style={{display: "flex", justifyContent: "center", alignContent: "center"}}>
                  <video
                    ref={videoRef}
                    onPlay={handleStreamVideo}
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
                :
                <div>
                  <Spin tip={t("login:Loading")} size="large"
                    style={{display: "flex", justifyContent: "center", alignContent: "center"}}>
                    <div className="content" />
                  </Spin>
                </div>
            }
          </div>
        </Modal>
      </div>
    );
  } else {
    return <div>
      <Modal closable={false}
        maskClosable={false}
        destroyOnClose={true}
        open={open}
        title={t("login:Face Recognition")}
        width={350}
        footer={[
          <Button key="ok" type={"primary"} disabled={!currentFaceId || currentFaceId?.length === 0} onClick={() => {
            onOk(Array.from(currentFaceId.descriptor));
          }}>
            Ok
          </Button>,
          <Button key="back" onClick={onCancel}>
                  Cancel
          </Button>,
        ]}>
        <Space direction={"vertical"} style={{width: "100%"}}>
          <Dragger
            multiple={true}
            defaultFileList={files}
            style={{width: "100%"}}
            beforeUpload={(file: LegacyAny) => {
              getBase64(file).then(res => {
                file.base64 = res;
                files.push(file);
              });
              setCurrentFaceId([]);
              return false;
            }}
            onRemove={(file: LegacyAny) => {
              const index = files.indexOf(file);
              const newFileList = files.slice();
              newFileList.splice(index, 1);
              setFiles(newFileList);
              setCurrentFaceId([]);
            }}
          >
            <p>{t("general:Click to Upload")}</p>
          </Dragger >
          {
            modelsLoaded ? <Button style={{width: "100%"}} onClick={async() => {
              let maxScore = 0;
              for (const file of files) {
                const fileIndex = files.indexOf(file);
                const img = new Image();
                img.src = String(file.base64 ?? "");
                const faceIds = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
                if (faceIds[0]?.detection.score > 0.9 && faceIds[0]?.detection.score > maxScore) {
                  maxScore = faceIds[0]?.detection.score;
                  setCurrentFaceId(faceIds[0]);
                  setCurrentFaceIndex(fileIndex);
                }
              }
              if (maxScore < 0.9) {
                message.error(t("login:Face recognition failed"));
              }
            }}> {t("general:Generate")}</Button> : null
          }
        </Space>
        {
          currentFaceId && currentFaceId.length !== 0 ? (
            <React.Fragment>
              <div>{t("application:Select")}:{files[currentFaceIndex ?? 0]?.name}</div>
              <div><img src={files[currentFaceIndex ?? 0]?.base64} alt="selected" style={{width: "100%"}} /></div>
            </React.Fragment>
          ) : null
        }
      </Modal>
    </div>;
  }
};

export default FaceRecognitionModal;
