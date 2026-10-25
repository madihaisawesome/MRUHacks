import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from 'react';

async function requestCameraStream() {
  if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    const err = new Error('Camera needs http://localhost (or HTTPS). Open the Vite Local URL, not a LAN IP.');
    err.name = 'SecureContextError';
    throw err;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    const err = new Error('This browser does not support camera access.');
    err.name = 'UnsupportedError';
    throw err;
  }

  const attempts = [
    { video: true, audio: false },
    { video: { facingMode: 'user' }, audio: false },
    { video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
  ];

  let lastError;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Could not open the camera.');
}

function explainCameraError(error) {
  const name = error?.name || '';
  if (name === 'SecureContextError') {
    return error.message;
  }
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera blocked. In the address bar, click the lock/camera icon → allow Camera, then press Try camera again. Or upload a photo below.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera was found on this device. Upload a photo of your work instead.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'The camera is busy in another app (Zoom, Teams, etc.). Close that app, then Try camera again — or upload a photo.';
  }
  return 'Camera unavailable right now. Upload a photo of your work instead.';
}

const WebcamPanel = forwardRef(function WebcamPanel(
  { disabled = false, onCameraChange },
  ref,
) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);
  const selectedFileRef = useRef(null);
  const [cameraError, setCameraError] = useState('');
  const [usingCamera, setUsingCamera] = useState(false);
  const [starting, setStarting] = useState(true);
  const [filePreview, setFilePreview] = useState('');

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const attachStream = useCallback(async (stream) => {
    streamRef.current = stream;
    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      try {
        await video.play();
      } catch {
      }
    }
    setUsingCamera(true);
    setCameraError('');
    onCameraChange?.(true);
  }, [onCameraChange]);

  const startCamera = useCallback(async () => {
    setStarting(true);
    setCameraError('');
    stopStream();

    try {
      const stream = await requestCameraStream();
      await attachStream(stream);
    } catch (error) {
      stopStream();
      setUsingCamera(false);
      setCameraError(explainCameraError(error));
      onCameraChange?.(false);
    } finally {
      setStarting(false);
    }
  }, [attachStream, onCameraChange, stopStream]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setStarting(true);
      try {
        const stream = await requestCameraStream();
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        await attachStream(stream);
      } catch (error) {
        if (cancelled) return;
        setUsingCamera(false);
        setCameraError(explainCameraError(error));
        onCameraChange?.(false);
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      const stream = streamRef.current;
      streamRef.current = null;
      window.setTimeout(() => {
        stream?.getTracks().forEach((track) => track.stop());
      }, 250);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    hasLiveVideo() {
      const video = videoRef.current;
      return Boolean(
        usingCamera &&
          video &&
          video.srcObject &&
          video.readyState >= 2 &&
          video.videoWidth > 0,
      );
    },
    async captureJpegBase64() {
      if (this.hasLiveVideo()) {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, 640, 480);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        return dataUrl.replace(/^data:image\/jpeg;base64,/, '');
      }

      const file = selectedFileRef.current || fileRef.current?.files?.[0];
      if (!file) {
        throw new Error('Choose a photo below, then press Check my work.');
      }
      return fileToBase64(file);
    },
    getFingerprint() {
      if (!this.hasLiveVideo()) return null;
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, 16, 16);
      const { data } = ctx.getImageData(0, 0, 16, 16);
      const gray = new Uint8Array(16 * 16);
      for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
        gray[j] = Math.round(
          0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2],
        );
      }
      return gray;
    },
  }));

  function onFileChange(event) {
    const file = event.target.files?.[0];
    if (filePreview) URL.revokeObjectURL(filePreview);
    if (!file) {
      selectedFileRef.current = null;
      setFilePreview('');
      return;
    }
    selectedFileRef.current = file;
    setFilePreview(URL.createObjectURL(file));
  }

  return (
    <div className="webcamPanel">
      <div className="webcamStage">
        <video
          ref={videoRef}
          className="webcamVideo"
          style={{ display: usingCamera ? 'block' : 'none' }}
          playsInline
          muted
          autoPlay
        />

        {!usingCamera && (
          <div className="webcamFallback">
            {filePreview ? (
              <img src={filePreview} alt="Upload preview" className="webcamPreview" />
            ) : (
              <p className="meta">
                {starting
                  ? 'Starting camera...'
                  : 'No live camera — upload a photo of your work, then press Check my work.'}
              </p>
            )}
          </div>
        )}
      </div>

      {cameraError && (
        <p className="errorText" role="alert">
          {cameraError}
        </p>
      )}

      {!usingCamera && !starting && (
        <button
          type="button"
          className="button blueButton"
          disabled={disabled}
          onClick={startCamera}
        >
          Try camera again
        </button>
      )}

      <label className="label" htmlFor="webcam-upload">
        {usingCamera ? 'Or upload a photo instead' : 'Upload a photo (works without a camera)'}
      </label>
      <input
        id="webcam-upload"
        ref={fileRef}
        className="input"
        type="file"
        accept="image/*"
        disabled={disabled}
        onChange={onFileChange}
      />
    </div>
  );
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      if (!base64) reject(new Error('Could not read that image.'));
      else resolve(base64);
    };
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.readAsDataURL(file);
  });
}

export function fingerprintsDiffer(a, b, threshold = 18) {
  if (!a || !b || a.length !== b.length) return true;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff += Math.abs(a[i] - b[i]);
  }
  return diff / a.length > threshold;
}

export default WebcamPanel;
