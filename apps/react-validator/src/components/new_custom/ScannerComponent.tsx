import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import getBackendUrl from "@/lib/config";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { ChecksumException, DecodeHintType, FormatException, NotFoundException } from "@zxing/library";

interface OTPModalProps {
  ticketId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function decodeScannedPayload(scanned: string): any | null {
  try {
    return JSON.parse(scanned);
  } catch {
  }

  if (scanned.startsWith("data:")) {
    const comma = scanned.indexOf(",");
    if (comma !== -1) {
      const b64 = scanned.slice(comma + 1);
      try {
        const decoded = atob(b64);
        return JSON.parse(decoded);
      } catch {
        return null;
      }
    }
  }

  try {
    const decoded = atob(scanned);
    try {
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

const OTPModal = ({ ticketId, onClose, onSuccess }: OTPModalProps) => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleVerifyOTP = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const URL = getBackendUrl();
      const token = localStorage.getItem("token") ?? "";

      if (!URL || !token) {
        setSuccess(false);
        setMessage("Backend URL or auth token missing.");
        return;
      }

      const res = await axios.post(
        `${URL}/validator/validate/otp`,
        { otp_code: otp, ticketId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (res.status === 200) {
        setSuccess(true);
        setMessage("Ticket successfully validated!");
        onSuccess();
      } else {
        setSuccess(false);
        setMessage(res.data?.message || "OTP verification failed.");
      }
    } catch (err: any) {
      console.error("OTP verify error:", err);
      setSuccess(false);
      setMessage(err?.response?.data?.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-xl p-6 w-80 space-y-4 shadow-xl"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.8 }}
        >
          <h2 className="text-lg font-bold text-gray-900 text-center">Enter OTP</h2>
          <Input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter OTP"
            maxLength={6}
            className="text-center"
          />
          <div className="flex justify-between gap-2">
            <Button onClick={handleVerifyOTP} disabled={loading}>
              {loading ? "Verifying..." : "Verify OTP"}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
          {message && (
            <p className={`text-sm text-center ${success ? "text-green-600" : "text-red-600"}`}>
              {message}
            </p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

interface ResultModalProps {
  message: string;
  success: boolean;
  onClose: () => void;
}

const ResultModal = ({ message, success, onClose }: ResultModalProps) => (
  <AnimatePresence>
    <motion.div
      className="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`bg-white rounded-xl p-6 w-80 space-y-4 shadow-xl ${
          success ? "border-green-500 border-2" : "border-red-500 border-2"
        }`}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.8 }}
      >
        <h2 className={`text-lg font-bold text-center ${success ? "text-green-600" : "text-red-600"}`}>
          {success ? "Success" : "Failed"}
        </h2>
        <p className="text-sm text-center">{message}</p>
        <Button onClick={onClose}>Close</Button>
      </motion.div>
    </motion.div>
  </AnimatePresence>
);

const BookMyShowValidator = () => {
  const [ticketCount, setTicketCount] = useState(0);
  const [otpModalTicketId, setOtpModalTicketId] = useState<string | null>(null);
  const [resultModal, setResultModal] = useState<{ show: boolean; success: boolean; message: string }>({
    show: false,
    success: false,
    message: "",
  });
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scannerLoading, setScannerLoading] = useState(true);
  const [pasteText, setPasteText] = useState("");
  const [cameraLabel, setCameraLabel] = useState<string | null>(null);

  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const scanControlsRef = useRef<IScannerControls | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stoppedRef = useRef(false);

  const getReader = () => {
    if (!codeReaderRef.current) {
      const hints = new Map<DecodeHintType, any>();
      hints.set(DecodeHintType.TRY_HARDER, true);
      codeReaderRef.current = new BrowserMultiFormatReader(hints);
    }
    return codeReaderRef.current;
  };

  const pickRearCamera = (devices: MediaDeviceInfo[]) => {
    const rear = devices.find((device) => {
      const label = (device.label || "").toLowerCase();
      return label.includes("back") || label.includes("rear") || label.includes("environment");
    });
    return rear ?? devices[devices.length - 1] ?? devices[0];
  };

  const stopScanner = async () => {
    try {
      stoppedRef.current = true;
      scanControlsRef.current?.stop();
      scanControlsRef.current = null;

      if (videoRef.current?.srcObject instanceof MediaStream) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    } catch {
  
    }
  };

  const handleScanResult = async (decodedText: string) => {
    await stopScanner();

    try {
      const payload = decodeScannedPayload(decodedText);

      if (!payload) throw new Error("Invalid QR payload");

      const ciphertext = payload.ciphertext ?? payload.cipherText ?? payload.cipher;
      const nonce = payload.nonce ?? payload.nonceBase64 ?? payload.n;

      if (!ciphertext || !nonce) throw new Error("Invalid QR payload (missing ciphertext/nonce)");

      const URL = getBackendUrl();
      const token = localStorage.getItem("token") ?? "";

      if (!URL || !token) {
        setResultModal({ show: true, success: false, message: "Backend URL or auth token missing" });
        return;
      }

      const res = await axios.post(
        `${URL}/validator/validate`,
        { ciphertext, nonce },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (res.data?.ticketId) {
        setOtpModalTicketId(res.data.ticketId);
      } else {
        setResultModal({ show: true, success: false, message: res.data?.message || "Invalid ticket scanned" });
        setTimeout(() => startCamera(), 600);
      }
    } catch (err: any) {
      console.error("Scan handling error:", err);
      setResultModal({
        show: true,
        success: false,
        message: err?.response?.data?.message || err?.message || "Failed to process scanned QR",
      });
      setTimeout(() => startCamera(), 600);
    }
  };

  const startCamera = async () => {
    if (stoppedRef.current) {
      stoppedRef.current = false;
    }

    setScannerLoading(true);
    setScannerError(null);

    try {
      const reader = getReader();
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      if (!devices || devices.length === 0) {
        throw new Error("No camera device found");
      }

      const chosenDevice = pickRearCamera(devices);
      setCameraLabel(chosenDevice.label || "Camera");

      if (!videoRef.current) {
        throw new Error("Video element not ready");
      }

      const scanControls = await reader.decodeFromVideoDevice(
        chosenDevice.deviceId,
        videoRef.current,
        async (result, error) => {
          if (stoppedRef.current) return;
          if (result) {
            await handleScanResult(result.getText());
          } else if (
            error &&
            !(error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException)
          ) {
            console.debug("ZXing scan error:", error);
          }
        },
      );

      scanControlsRef.current = scanControls;
      setScannerLoading(false);
    } catch (err: any) {
      console.error("Camera scanner failed:", err);
      const message = (err?.message || err)?.toString() ?? "Failed to start camera";
      if (message.toLowerCase().includes("permission") || message.toLowerCase().includes("denied")) {
        setScannerError("Camera permission denied. Grant access and reload.");
      } else {
        setScannerError("Camera not available or failed to start. Use Upload/Paste fallback.");
      }
      setScannerLoading(false);
    }
  };

  const handleUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setScannerLoading(true);
    setScannerError(null);
    setResultModal((prev) => ({ ...prev, show: false }));

    await stopScanner();

    const objectUrl = URL.createObjectURL(file);
    const image = document.createElement("img");
    image.src = objectUrl;

    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Image load failed"));
      });

      const reader = getReader();
      const result = await reader.decodeFromImageElement(image);

      if (result?.getText()) {
        await handleScanResult(result.getText());
      } else {
        setResultModal({
          show: true,
          success: false,
          message: "Upload succeeded but QR was not decoded. Try another image or paste the QR contents.",
        });
      }
    } catch (err: any) {
      console.error("Upload scan failed:", err);
      setResultModal({ show: true, success: false, message: "Failed to scan uploaded image." });
    } finally {
      URL.revokeObjectURL(objectUrl);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setScannerLoading(false);
      setTimeout(() => startCamera(), 600);
    }
  };

  const handlePasteSubmit = async () => {
    if (!pasteText) return;
    await handleScanResult(pasteText);
  };

  useEffect(() => {
    void startCamera();

    return () => {
      void stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOtpSuccess = () => {
    setOtpModalTicketId(null);
    setTicketCount((prev) => prev + 1);
    setResultModal({ show: true, success: true, message: "Ticket successfully validated!" });
    void startCamera();
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950">
      <div className="absolute top-6 left-6 z-20 rounded-2xl bg-black/70 px-4 py-3 text-white">
        Tickets Validated: {ticketCount}
      </div>

      <div className="absolute top-6 right-6 z-20 rounded-2xl bg-black/70 px-4 py-3 text-white">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Button onClick={() => fileInputRef.current?.click()}>Upload QR image</Button>
            <Button
              variant="outline"
              onClick={() => {
                setScannerLoading(true);
                setScannerError(null);
                void stopScanner().then(() => startCamera());
              }}
            >
              Restart Camera
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUploadChange}
            className="hidden"
          />
          <div className="space-y-2">
            <div className="text-xs text-gray-200">Paste QR contents and press Submit</div>
            <div className="flex gap-2">
              <Input
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste QR text"
                className="min-w-[240px]"
              />
              <Button onClick={handlePasteSubmit}>Submit</Button>
            </div>
          </div>
          {cameraLabel && <div className="text-xs text-gray-300">Camera: {cameraLabel}</div>}
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[720px] max-w-[95%] h-[560px] bg-black rounded-lg overflow-hidden">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
        </div>
      </div>

      {scannerLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
          Starting camera...
        </div>
      )}

      {scannerError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-6 text-center">
          <p className="text-lg font-semibold">Scanner unavailable</p>
          <p className="mt-2 text-sm">{scannerError}</p>
          <p className="mt-2 text-xs text-gray-200">
            Tip: Upload a QR image or paste the QR contents if the camera cannot read it.
          </p>
        </div>
      )}

      <div className="absolute inset-x-0 top-0 h-2 pointer-events-none">
        <motion.div
          className="h-full bg-green-400"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
        />
      </div>

      {otpModalTicketId && (
        <OTPModal ticketId={otpModalTicketId} onClose={() => setOtpModalTicketId(null)} onSuccess={handleOtpSuccess} />
      )}

      {resultModal.show && (
        <ResultModal
          success={resultModal.success}
          message={resultModal.message}
          onClose={() => setResultModal({ ...resultModal, show: false })}
        />
      )}
    </div>
  );
};

export default BookMyShowValidator;


// import { type ChangeEvent, useEffect, useRef, useState } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import axios from "axios";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import getBackendUrl from "@/lib/config";

// interface OTPModalProps {
//   ticketId: string;
//   onClose: () => void;
//   onSuccess: () => void;
// }

// function decodeScannedPayload(scanned: string): any | null {
//   try {
//     return JSON.parse(scanned);
//   } catch {
//     // not raw JSON
//   }

//   if (scanned.startsWith("data:")) {
//     const comma = scanned.indexOf(",");
//     if (comma !== -1) {
//       const b64 = scanned.slice(comma + 1);
//       try {
//         const decoded = atob(b64);
//         return JSON.parse(decoded);
//       } catch {
//         return null;
//       }
//     }
//   }

//   try {
//     const decoded = atob(scanned);
//     try {
//       return JSON.parse(decoded);
//     } catch {
//       return null;
//     }
//   } catch {
//     return null;
//   }
// }

// const OTPModal = ({ ticketId, onClose, onSuccess }: OTPModalProps) => {
//   const [otp, setOtp] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [message, setMessage] = useState<string | null>(null);
//   const [success, setSuccess] = useState(false);

//   const handleVerifyOTP = async () => {
//     setLoading(true);
//     setMessage(null);

//     try {
//       const URL = getBackendUrl();
//       const token = localStorage.getItem("token") ?? "";

//       if (!URL || !token) {
//         setSuccess(false);
//         setMessage("Backend URL or auth token missing.");
//         return;
//       }

//       const res = await axios.post(
//         `${URL}/validator/validate/otp`,
//         { otp_code: otp, ticketId },
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "application/json",
//           },
//         },
//       );

//       if (res.status === 200) {
//         setSuccess(true);
//         setMessage("Ticket successfully validated!");
//         onSuccess();
//       } else {
//         setSuccess(false);
//         setMessage(res.data?.message || "OTP verification failed.");
//       }
//     } catch (err: any) {
//       console.error("OTP verify error:", err);
//       setSuccess(false);
//       setMessage(err?.response?.data?.message || "OTP verification failed.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <AnimatePresence>
//       <motion.div
//         className="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 1 }}
//         exit={{ opacity: 0 }}
//       >
//         <motion.div
//           className="bg-white rounded-xl p-6 w-80 space-y-4 shadow-xl"
//           initial={{ scale: 0.8 }}
//           animate={{ scale: 1 }}
//           exit={{ scale: 0.8 }}
//         >
//           <h2 className="text-lg font-bold text-gray-900 text-center">Enter OTP</h2>
//           <Input
//             type="text"
//             value={otp}
//             onChange={(e) => setOtp(e.target.value)}
//             placeholder="Enter OTP"
//             maxLength={6}
//             className="text-center"
//           />
//           <div className="flex justify-between gap-2">
//             <Button onClick={handleVerifyOTP} disabled={loading}>
//               {loading ? "Verifying..." : "Verify OTP"}
//             </Button>
//             <Button variant="outline" onClick={onClose}>
//               Cancel
//             </Button>
//           </div>
//           {message && (
//             <p className={`text-sm text-center ${success ? "text-green-600" : "text-red-600"}`}>
//               {message}
//             </p>
//           )}
//         </motion.div>
//       </motion.div>
//     </AnimatePresence>
//   );
// };

// interface ResultModalProps {
//   message: string;
//   success: boolean;
//   onClose: () => void;
// }

// const ResultModal = ({ message, success, onClose }: ResultModalProps) => (
//   <AnimatePresence>
//     <motion.div
//       className="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       exit={{ opacity: 0 }}
//     >
//       <motion.div
//         className={`bg-white rounded-xl p-6 w-80 space-y-4 shadow-xl ${
//           success ? "border-green-500 border-2" : "border-red-500 border-2"
//         }`}
//         initial={{ scale: 0.8 }}
//         animate={{ scale: 1 }}
//         exit={{ scale: 0.8 }}
//       >
//         <h2 className={`text-lg font-bold text-center ${success ? "text-green-600" : "text-red-600"}`}>
//           {success ? "Success" : "Failed"}
//         </h2>
//         <p className="text-sm text-center">{message}</p>
//         <Button onClick={onClose}>Close</Button>
//       </motion.div>
//     </motion.div>
//   </AnimatePresence>
// );

// const BookMyShowValidator = () => {
//   const [ticketCount, setTicketCount] = useState(0);
//   const [otpModalTicketId, setOtpModalTicketId] = useState<string | null>(null);
//   const [resultModal, setResultModal] = useState<{ show: boolean; success: boolean; message: string }>({
//     show: false,
//     success: false,
//     message: "",
//   });
//   const [scannerError, setScannerError] = useState<string | null>(null);
//   const [scannerLoading, setScannerLoading] = useState(true);
//   const [pasteText, setPasteText] = useState("");

//   const scannerRef = useRef<any>(null);
//   const fileInputRef = useRef<HTMLInputElement | null>(null);
//   const divId = "qr-scanner";

//   const handleScanError = (errMsg: string) => {
//     console.debug("QR decode attempt failed:", errMsg);
//   };

//   const stopScanner = async () => {
//     try {
//       if (!scannerRef.current) return;
//       if (typeof scannerRef.current.getState === "function") {
//         const state = scannerRef.current.getState();
//         if (state === 1) {
//           await scannerRef.current.stop().catch(() => null);
//         }
//       } else {
//         await scannerRef.current.stop?.().catch(() => null);
//       }
//     } catch {
//       // ignore stop errors
//     }
//   };

//   const handleScanSuccess = async (decodedText: string) => {
//     await stopScanner();

//     try {
//       const payload = decodeScannedPayload(decodedText);
//       if (!payload) throw new Error("Invalid QR payload");

//       const ciphertext = payload.ciphertext ?? payload.cipherText ?? payload.cipher;
//       const nonce = payload.nonce ?? payload.nonceBase64 ?? payload.n;

//       if (!ciphertext || !nonce) throw new Error("Invalid QR payload (missing ciphertext/nonce)");

//       const URL = getBackendUrl();
//       const token = localStorage.getItem("token") ?? "";

//       if (!URL || !token) {
//         setResultModal({ show: true, success: false, message: "Backend URL or auth token missing" });
//         return;
//       }

//       const res = await axios.post(
//         `${URL}/validator/validate`,
//         { ciphertext, nonce },
//         { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
//       );

//       if (res.data?.ticketId) {
//         setOtpModalTicketId(res.data.ticketId);
//       } else {
//         setResultModal({ show: true, success: false, message: res.data?.message || "Invalid ticket scanned" });
//         setTimeout(() => import("html5-qrcode").then((m) => startScanner(m.Html5Qrcode)).catch(() => null), 600);
//       }
//     } catch (err: any) {
//       console.error("Scan handling error:", err);
//       setResultModal({
//         show: true,
//         success: false,
//         message: err?.response?.data?.message || err?.message || "Failed to process scanned QR",
//       });
//       setTimeout(() => import("html5-qrcode").then((m) => startScanner(m.Html5Qrcode)).catch(() => null), 600);
//     }
//   };

//   const startScanner = async (Html5QrcodeClass: any) => {
//     if (!Html5QrcodeClass) return;

//     try {
//       if (scannerRef.current) {
//         try {
//           await scannerRef.current.stop?.();
//         } catch {}
//         try {
//           scannerRef.current.clear?.();
//         } catch {}
//         scannerRef.current = null;
//       }

//       const container = document.getElementById(divId);
//       const containerRect = container?.getBoundingClientRect();
//       const preferredWidth = containerRect?.width ?? Math.min(800, window.innerWidth);
//       const preferredHeight = containerRect?.height ?? Math.min(600, window.innerHeight);

//       const scanner = new Html5QrcodeClass(divId, { verbose: false });

//       const cameras = await Html5QrcodeClass.getCameras();
//       if (!cameras || cameras.length === 0) throw new Error("No camera found");

//       const chosenCamera =
//         cameras.find((c: any) => {
//           const label = (c.label || "").toLowerCase();
//           return label.includes("back") || label.includes("rear") || label.includes("environment");
//         }) ?? cameras[cameras.length - 1] ?? cameras[0];

//       const chosenCameraId = chosenCamera?.id ?? chosenCamera?.deviceId ?? chosenCamera?.deviceid ?? chosenCamera;

//       console.info("Using camera:", chosenCamera?.label ?? chosenCameraId);

//       const qrboxWidth = Math.max(320, Math.floor(preferredWidth * 0.95));
//       const qrboxHeight = Math.max(320, Math.floor(preferredHeight * 0.95));

//       const config = {
//         fps: 5,
//         qrbox: { width: qrboxWidth, height: qrboxHeight },
//         disableFlip: false,
//         aspectRatio: preferredWidth / Math.max(1, preferredHeight),
//         videoConstraints: {
//           width: { ideal: 1920 },
//           height: { ideal: 1080 },
//           facingMode: { ideal: "environment" },
//         },
//       };

//       await scanner.start(chosenCameraId, config, handleScanSuccess, handleScanError);

//       scannerRef.current = scanner;
//       setScannerLoading(false);
//       setScannerError(null);
//     } catch (err: any) {
//       console.error("Scanner start failed:", err);
//       const msg = (err?.message || err)?.toString() ?? "Failed to start camera";
//       if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("notallowed")) {
//         setScannerError("Camera permission denied. Grant access and reload.");
//       } else {
//         setScannerError("Camera not available or failed to start. Use Upload/Paste fallback.");
//       }
//       setScannerLoading(false);
//     }
//   };

//   const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (!file) return;

//     setScannerLoading(true);
//     setScannerError(null);

//     try {
//       const module = await import("html5-qrcode");
//       const Html5QrcodeClass: any = module.Html5Qrcode;

//       if (typeof Html5QrcodeClass.scanFileV2 === "function") {
//         const result = await Html5QrcodeClass.scanFileV2(file, true);
//         const decoded = typeof result === "string" ? result : result?.decodedText;
//         if (decoded) {
//           await handleScanSuccess(decoded);
//           return;
//         }
//       }

//       if (typeof Html5QrcodeClass.scanFile === "function") {
//         const result = await Html5QrcodeClass.scanFile(file, true);
//         if (result) {
//           await handleScanSuccess(result as string);
//           return;
//         }
//       }

//       const resultText = await new Promise<string>((resolve, reject) => {
//         const reader = new FileReader();
//         reader.onload = () => resolve(reader.result as string);
//         reader.onerror = reject;
//         reader.readAsDataURL(file);
//       });

//       const decoded = decodeScannedPayload(resultText);
//       if (decoded) {
//         await handleScanSuccess(resultText);
//       } else {
//         setResultModal({
//           show: true,
//           success: false,
//           message: "Upload succeeded but QR was not decoded. Try another image or use paste fallback.",
//         });
//       }
//     } catch (err: any) {
//       console.error("Upload scan failed:", err);
//       setResultModal({ show: true, success: false, message: "Failed to scan uploaded image." });
//     } finally {
//       setScannerLoading(false);
//       if (fileInputRef.current) fileInputRef.current.value = "";
//       setTimeout(() => import("html5-qrcode").then((m) => startScanner(m.Html5Qrcode)).catch(() => null), 600);
//     }
//   };

//   const handlePasteSubmit = async () => {
//     if (!pasteText) return;
//     await handleScanSuccess(pasteText);
//   };

//   useEffect(() => {
//     let active = true;
//     import("html5-qrcode")
//       .then((module) => {
//         if (!active) return;
//         startScanner(module.Html5Qrcode);
//       })
//       .catch((err) => {
//         console.error("Could not load html5-qrcode:", err);
//         setScannerError("Failed to load scanner library. Use Upload/Paste fallback.");
//         setScannerLoading(false);
//       });

//     return () => {
//       active = false;
//       (async () => {
//         try {
//           if (scannerRef.current) {
//             await scannerRef.current.stop?.().catch(() => null);
//             try {
//               scannerRef.current.clear?.();
//             } catch {}
//           }
//         } catch {}
//         scannerRef.current = null;
//       })();
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   const handleOtpSuccess = () => {
//     setOtpModalTicketId(null);
//     setTicketCount((prev) => prev + 1);
//     setResultModal({ show: true, success: true, message: "Ticket successfully validated!" });
//     import("html5-qrcode").then((m) => startScanner(m.Html5Qrcode)).catch(() => null);
//   };

//   return (
//     <div className="relative w-full h-screen overflow-hidden bg-slate-950">
//       <div className="absolute top-6 left-6 z-20 rounded-2xl bg-black/70 px-4 py-3 text-white">
//         Tickets Validated: {ticketCount}
//       </div>

//       <div className="absolute top-6 right-6 z-20 rounded-2xl bg-black/70 px-4 py-3 text-white">
//         <div className="flex flex-col gap-3">
//           <div className="flex gap-2">
//             <Button
//               onClick={() => fileInputRef.current?.click()}
//               size="sm"
//             >
//               Upload QR image
//             </Button>
//             <Button
//               onClick={() => {
//                 setScannerLoading(true);
//                 setScannerError(null);
//                 import("html5-qrcode")
//                   .then((m) => startScanner(m.Html5Qrcode))
//                   .catch((e) => {
//                     console.error("Restart camera failed:", e);
//                     setScannerLoading(false);
//                     setScannerError("Restart failed. Use Upload/Paste fallback.");
//                   });
//               }}
//               size="sm"
//             >
//               Restart Camera
//             </Button>
//           </div>
//           <input
//             ref={fileInputRef}
//             type="file"
//             accept="image/*"
//             onChange={handleFileChange}
//             className="hidden"
//           />
//           <div className="space-y-2">
//             <div className="text-xs text-gray-200">Paste QR contents and press Submit</div>
//             <div className="flex gap-2">
//               <Input
//                 value={pasteText}
//                 onChange={(e) => setPasteText(e.target.value)}
//                 placeholder="Paste QR text"
//                 className="min-w-[240px]"
//               />
//               <Button onClick={handlePasteSubmit} size="sm">
//                 Submit
//               </Button>
//             </div>
//           </div>
//         </div>
//       </div>

//       <div className="absolute inset-0 flex items-center justify-center">
//         <div id={divId} className="w-[720px] max-w-[95%] h-[560px] bg-black rounded-lg overflow-hidden" />
//       </div>

//       {scannerLoading && (
//         <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
//           Starting camera...
//         </div>
//       )}

//       {scannerError && (
//         <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-6 text-center">
//           <p className="text-lg font-semibold">Scanner unavailable</p>
//           <p className="mt-2 text-sm">{scannerError}</p>
//           <p className="mt-2 text-xs text-gray-200">
//             Tip: Upload a QR image or paste the QR contents if the camera cannot read it.
//           </p>
//         </div>
//       )}

//       <div className="absolute inset-x-0 top-0 h-2 pointer-events-none">
//         <motion.div
//           className="h-full bg-green-400"
//           animate={{ x: ["-100%", "100%"] }}
//           transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
//         />
//       </div>

//       {otpModalTicketId && (
//         <OTPModal ticketId={otpModalTicketId} onClose={() => setOtpModalTicketId(null)} onSuccess={handleOtpSuccess} />
//       )}

//       {resultModal.show && (
//         <ResultModal
//           success={resultModal.success}
//           message={resultModal.message}
//           onClose={() => setResultModal({ ...resultModal, show: false })}
//         />
//       )}
//     </div>
//   );
// };

// export default BookMyShowValidator;
