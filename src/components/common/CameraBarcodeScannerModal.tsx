import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig, CameraDevice, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { isExpiredDate } from '../../utils/dateUtils';
import {
  Camera,
  X,
  Zap,
  ZapOff,
  SwitchCamera,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  Layers,
  ShoppingBag,
  Plus,
  RefreshCw,
  Search,
  Barcode,
  Sparkles,
  Flame,
  Upload,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Info,
} from 'lucide-react';

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeDetected: (barcode: string) => void;
  products?: Product[];
}

export interface ScannedItemRecord {
  id: string;
  code: string;
  timestamp: string;
  product?: Product;
  status: 'SUCCESS' | 'NOT_FOUND' | 'EXPIRED' | 'OUT_OF_STOCK';
  message: string;
}

// Full suite of 1D and 2D barcode formats used in retail/distribution
const supportedBarcodeFormats = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
];

export const CameraBarcodeScannerModal: React.FC<CameraBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onBarcodeDetected,
  products = [],
}) => {
  const { language, formatCurrency } = useApp();

  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [zoomSupported, setZoomSupported] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [minZoom, setMinZoom] = useState<number>(1);
  const [maxZoom, setMaxZoom] = useState<number>(3);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [continuousMode, setContinuousMode] = useState<boolean>(true);
  const [manualCode, setManualCode] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [scanHistory, setScanHistory] = useState<ScannedItemRecord[]>([]);
  const [lastScannedProduct, setLastScannedProduct] = useState<{
    product?: Product;
    code: string;
    status: 'SUCCESS' | 'NOT_FOUND' | 'EXPIRED' | 'OUT_OF_STOCK';
    message: string;
  } | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'pos-camera-barcode-reader';
  const lastScanTimeRef = useRef<number>(0);

  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio synthesizer via Web Audio API
  const playSound = useCallback((type: 'success' | 'error' | 'warning') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'success') {
        // High pitch clean POS beep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'warning' || type === 'error') {
        // Low double buzz
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  }, [soundEnabled]);

  // Handle scanned barcode data
  const processBarcode = useCallback(
    (decodedText: string) => {
      const trimmed = decodedText.trim();
      if (!trimmed) return;

      const now = Date.now();
      // Debounce identical scans within 1.2 seconds if continuous mode
      if (trimmed === lastScannedCode && now - lastScanTimeRef.current < 1200) {
        return;
      }
      lastScanTimeRef.current = now;
      setLastScannedCode(trimmed);

      // Check product match
      const match = products.find(
        p => p.barcode === trimmed || p.sku.toLowerCase() === trimmed.toLowerCase()
      );

      let status: 'SUCCESS' | 'NOT_FOUND' | 'EXPIRED' | 'OUT_OF_STOCK' = 'SUCCESS';
      let message = '';

      if (!match) {
        status = 'NOT_FOUND';
        message = language === 'bn' ? `"${trimmed}" বারকোডের পণ্য পাওয়া যায়নি!` : `No product found for code "${trimmed}"!`;
        playSound('warning');
      } else {
        // Expiration check
        let isExpired = false;
        if (match.batches && match.batches.length > 0) {
          const activeBatches = match.batches.filter(b => (b.stock || 0) > 0);
          if (activeBatches.length > 0) {
            const hasValidBatch = activeBatches.some(b => !isExpiredDate(b.expDate));
            isExpired = !hasValidBatch;
          }
        } else if (isExpiredDate(match.expDate)) {
          isExpired = true;
        }

        if (isExpired) {
          status = 'EXPIRED';
          message = language === 'bn' ? `⚠️ "${match.name}" মেয়াদোত্তীর্ণ পণ্য!` : `⚠️ "${match.name}" is expired!`;
          playSound('error');
        } else if (match.stock <= 0) {
          status = 'OUT_OF_STOCK';
          message = language === 'bn' ? `⚠️ "${match.name}" স্টক শেষ!` : `⚠️ "${match.name}" is out of stock!`;
          playSound('warning');
        } else {
          status = 'SUCCESS';
          message = language === 'bn' ? `✅ "${match.name}" যোগ হয়েছে` : `✅ Added "${match.name}"`;
          playSound('success');
        }
      }

      const record: ScannedItemRecord = {
        id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        code: trimmed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        product: match,
        status,
        message,
      };

      setScanHistory(prev => [record, ...prev.slice(0, 20)]);
      setLastScannedProduct({
        product: match,
        code: trimmed,
        status,
        message,
      });

      // Notify parent handler to add to cart / apply code
      onBarcodeDetected(trimmed);

      // If single scan mode, close modal
      if (!continuousMode && status === 'SUCCESS') {
        setTimeout(() => {
          onClose();
        }, 500);
      }
    },
    [continuousMode, language, lastScannedCode, onBarcodeDetected, onClose, playSound, products]
  );

  // Stop Scanner safely
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {
        // ignore already stopped errors
      }
      scannerRef.current = null;
      setIsScanning(false);
      setIsTorchOn(false);
    }
  }, []);

  // Start Scanner function
  const startScanner = useCallback(
    async (cameraSource: string | { facingMode: string }) => {
      setErrorMsg('');
      setTorchSupported(false);
      setZoomSupported(false);

      try {
        // Ensure old instance is cleaned up
        await stopScanner();

        // Check if reader element exists in DOM
        const elem = document.getElementById(readerElementId);
        if (!elem) return;

        // Create Html5Qrcode with hardware-accelerated BarcodeDetector & full format coverage
        const html5QrCode = new Html5Qrcode(readerElementId, {
          useBarCodeDetectorIfSupported: true,
          formatsToSupport: supportedBarcodeFormats,
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        const isMobile = window.innerWidth < 768;
        const config: Html5QrcodeCameraScanConfig = {
          fps: 15, // Optimal 15 fps provides reliable processing without CPU throttle on mobile
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            // Flexible responsive viewfinder allowing horizontal & 2D code alignments
            const width = Math.min(Math.floor(viewfinderWidth * (isMobile ? 0.92 : 0.86)), 460);
            const height = Math.min(Math.floor(viewfinderHeight * (isMobile ? 0.60 : 0.52)), 250);
            return { width: Math.max(width, 240), height: Math.max(height, 130) };
          },
          aspectRatio: isMobile ? 1.333333 : 1.777778,
          disableFlip: false,
        };

        await html5QrCode.start(
          cameraSource as any,
          config,
          (decodedText) => {
            processBarcode(decodedText);
          },
          () => {
            // Ignore per-frame non-matching cycles
          }
        );

        setIsScanning(true);

        // Check capabilities (Flashlight Torch & Hardware Zoom)
        try {
          const track = (html5QrCode as any).getRunningTrack();
          if (track && typeof track.getCapabilities === 'function') {
            const capabilities = track.getCapabilities();
            if (capabilities.torch) {
              setTorchSupported(true);
            }
            if (capabilities.zoom) {
              setZoomSupported(true);
              setMinZoom(capabilities.zoom.min || 1);
              setMaxZoom(capabilities.zoom.max || 4);
            }
          }
        } catch {
          // Ignore capability check failures
        }
      } catch (err: any) {
        setIsScanning(false);
        const errMsg = err?.message || String(err);
        if (
          errMsg.includes('Requested device not found') ||
          errMsg.includes('NotFoundError') ||
          errMsg.includes('DevicesNotFoundError')
        ) {
          setErrorMsg(
            language === 'bn'
              ? 'ডিভাইসে কোনো সক্রিয় ক্যামেরা পাওয়া যায়নি। আপনি নিচের ম্যানুয়াল কোড ইনপুট, হ্যান্ডহেল্ড বারকোড গান বা ছবি আপলোড সুবিধা ব্যবহার করতে পারেন।'
              : 'No camera hardware found on this device. You can type/scan with USB barcode gun or upload a barcode image below.'
          );
        } else if (
          errMsg.includes('NotAllowedError') ||
          errMsg.includes('Permission denied') ||
          errMsg.includes('PermissionDismissedError')
        ) {
          setErrorMsg(
            language === 'bn'
              ? 'ক্যামেরা পারমিশন ডিনাইড হয়েছে। আপনার ব্রাউজারের অ্যাড্রেস বার বা সাইট সেটিংসে ক্যামেরা পারমিশন Allow করুন।'
              : 'Camera permission denied. Please allow camera access in your browser address bar or site permissions.'
          );
        } else {
          setErrorMsg(
            language === 'bn'
              ? `ক্যামেরা চালু করতে সমস্যা হয়েছে (${errMsg})। রিট্রাই বাটনে ক্লিক করুন বা ক্যামেরা পরিবর্তন করুন।`
              : `Could not start camera: ${errMsg}. Please click Retry or Switch Camera.`
          );
        }
      }
    },
    [language, processBarcode, stopScanner]
  );

  // Initialize and start camera safely
  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg('');
    setLastScannedProduct(null);
    setIsTorchOn(false);
    setZoomLevel(1);

    let isMounted = true;

    // Check mediaDevices support
    if (!navigator?.mediaDevices?.getUserMedia) {
      setErrorMsg(
        language === 'bn'
          ? 'এই ব্রাউজারে লাইভ ক্যামেরা সাপোর্ট নেই। নিচে কোড লিখুন বা ছবি আপলোড করুন।'
          : 'Live camera is not supported in this browser. Please enter code manually or upload an image.'
      );
      return;
    }

    // On mobile devices, default to facingMode: 'environment' (rear camera with autofocus)
    const cameraSource = selectedCameraId ? selectedCameraId : { facingMode: facingMode };

    startScanner(cameraSource).then(() => {
      if (!isMounted) return;
      // Enumerate available cameras once stream has started
      Html5Qrcode.getCameras()
        .then(devices => {
          if (!isMounted) return;
          if (devices && devices.length > 0) {
            setCameras(devices);
          }
        })
        .catch(() => {
          // ignore enumeration error
        });
    });

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen, selectedCameraId, facingMode, startScanner, stopScanner]);

  // Scan from uploaded image file
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setErrorMsg('');

    try {
      const html5QrCode = new Html5Qrcode('temp-barcode-file-scanner', {
        useBarCodeDetectorIfSupported: true,
        formatsToSupport: supportedBarcodeFormats,
        verbose: false,
      });
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      processBarcode(decodedText);
    } catch (err: any) {
      playSound('warning');
      setErrorMsg(
        language === 'bn'
          ? 'ছবি থেকে বারকোড বা কিউআর কোড পড়া যায়নি। স্পষ্ট ও ফোকাসড ছবি আপলোড করুন।'
          : 'Could not detect barcode from image. Please ensure the code is clear and well-lit.'
      );
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Toggle Torch
  const handleToggleTorch = async () => {
    if (!scannerRef.current || !torchSupported) return;
    try {
      const nextState = !isTorchOn;
      await (scannerRef.current as any).applyVideoConstraints({
        advanced: [{ torch: nextState }],
      });
      setIsTorchOn(nextState);
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  // Zoom control
  const handleSetZoom = async (level: number) => {
    if (!scannerRef.current || !zoomSupported) return;
    try {
      const target = Math.min(Math.max(level, minZoom), maxZoom);
      await (scannerRef.current as any).applyVideoConstraints({
        advanced: [{ zoom: target }],
      });
      setZoomLevel(target);
    } catch (err) {
      console.warn('Zoom change failed:', err);
    }
  };

  // Switch Camera (Flip between rear and front or cycle devices)
  const handleSwitchCamera = () => {
    if (cameras.length > 1) {
      const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
      if (currentIndex >= 0) {
        const nextIndex = (currentIndex + 1) % cameras.length;
        setSelectedCameraId(cameras[nextIndex].id);
        return;
      }
    }
    // Toggle facingMode directly
    setSelectedCameraId('');
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Handle Manual Code Submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    processBarcode(manualCode.trim());
    setManualCode('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[94vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Header Bar */}
        <div className="px-4 py-3 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-800/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/40 rounded-xl border border-indigo-400/30 text-indigo-300">
              <Camera className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base leading-tight">
                  {language === 'bn' ? 'ক্যামেরা বারকোড স্ক্যানার' : 'Camera Barcode Scanner'}
                </h3>
                {continuousMode ? (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Flame className="w-3 h-3 text-emerald-400" />
                    Continuous POS
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-full text-[10px] font-bold">
                    Single Scan
                  </span>
                )}
              </div>
              <p className="text-[11px] text-indigo-200/80">
                {language === 'bn'
                  ? 'ফোনের ক্যামেরা পণ্যের বারকোড বা কিউআর কোডের দিকে তাক করুন'
                  : 'Point camera at product barcode or QR code'}
              </p>
            </div>
          </div>

          {/* Quick Header Controls */}
          <div className="flex items-center gap-1.5">
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                soundEnabled ? 'bg-indigo-700/60 text-white' : 'bg-slate-800 text-slate-400'
              }`}
              title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Continuous Mode Toggle */}
            <button
              type="button"
              onClick={() => setContinuousMode(!continuousMode)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                continuousMode
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Continuous Multi-Scan Mode"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{continuousMode ? 'Multi-Scan' : 'Single'}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="p-2 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scanner Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {/* Camera Viewport Container */}
          <div className="relative bg-black rounded-2xl overflow-hidden shadow-inner aspect-[4/3] max-h-[360px] flex items-center justify-center border border-slate-800">
            {/* The Html5Qrcode mounting div */}
            <div id={readerElementId} className="w-full h-full object-cover" />

            {/* Scanner Viewfinder HUD Overlay */}
            {isScanning && !errorMsg && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                {/* Viewfinder Target Box */}
                <div className="relative w-64 sm:w-80 h-36 sm:h-44 border-2 border-indigo-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                  {/* Corner Reticles */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                  {/* Animated Red Laser Scan Beam */}
                  <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_8px_#f43f5e] animate-bounce top-1/2 -translate-y-1/2" />
                </div>

                <div className="mt-3 px-3 py-1 bg-black/70 backdrop-blur-md rounded-full text-[11px] font-bold text-slate-200 border border-white/10 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>
                    {language === 'bn'
                      ? 'বারকোড ফ্রেমের মাঝখানে সোজা রাখুন'
                      : 'Align barcode inside target frame'}
                  </span>
                </div>
              </div>
            )}

            {/* Error / Permission Guidance */}
            {errorMsg && (
              <div className="absolute inset-0 bg-slate-900/95 p-6 flex flex-col items-center justify-center text-center z-20">
                <div className="p-3 bg-amber-500/20 rounded-2xl border border-amber-500/30 text-amber-400 mb-2">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-white text-sm mb-1">
                  {language === 'bn' ? 'ক্যামেরা চালু করা যায়নি' : 'Camera Hardware / Access Notice'}
                </h4>
                <p className="text-xs text-slate-300 max-w-md mb-4 leading-relaxed">{errorMsg}</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedCameraId) {
                        startScanner(selectedCameraId);
                      } else {
                        startScanner({ facingMode: facingMode });
                      }
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'ক্যামেরা রিট্রাই' : 'Retry Camera'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <SwitchCamera className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'ক্যামেরা ফ্লিপ' : 'Flip Camera'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {isUploadingImage
                        ? language === 'bn' ? 'স্ক্যান হচ্ছে...' : 'Scanning Image...'
                        : language === 'bn' ? 'বারকোড ছবি আপলোড' : 'Upload Barcode Image'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Bottom In-Viewport Controls (Torch / Zoom / Switch Camera) */}
            {isScanning && !errorMsg && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-10">
                {/* Zoom Controls if hardware supported */}
                {zoomSupported && (
                  <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-xl text-white">
                    <button
                      type="button"
                      onClick={() => handleSetZoom(zoomLevel - 0.5)}
                      disabled={zoomLevel <= minZoom}
                      className="p-1.5 hover:bg-white/20 disabled:opacity-30 rounded-lg text-xs transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono font-bold px-1">{zoomLevel.toFixed(1)}x</span>
                    <button
                      type="button"
                      onClick={() => handleSetZoom(zoomLevel + 0.5)}
                      disabled={zoomLevel >= maxZoom}
                      className="p-1.5 hover:bg-white/20 disabled:opacity-30 rounded-lg text-xs transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Torch / Flashlight */}
                {torchSupported && (
                  <button
                    type="button"
                    onClick={handleToggleTorch}
                    className={`p-2 rounded-xl backdrop-blur-md text-xs font-bold transition-all cursor-pointer ${
                      isTorchOn
                        ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_#f59e0b]'
                        : 'bg-black/60 text-white hover:bg-black/80'
                    }`}
                    title={isTorchOn ? 'Turn Flash Off' : 'Turn Flash On'}
                  >
                    {isTorchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                  </button>
                )}

                {/* Switch Camera (Always available for front/rear flip) */}
                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  className="p-2 bg-black/60 hover:bg-black/80 text-white backdrop-blur-md rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="Switch Camera (Rear / Front)"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Camera Selection Dropdown (if multiple cameras available) */}
          {cameras.length > 1 && (
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Camera className="w-3.5 h-3.5" />
                {language === 'bn' ? 'ক্যামেরা উৎস:' : 'Camera Source:'}
              </span>
              <select
                value={selectedCameraId}
                onChange={e => setSelectedCameraId(e.target.value)}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 max-w-xs truncate"
              >
                <option value="">{language === 'bn' ? 'ডিফল্ট ব্যাক ক্যামেরা (Auto)' : 'Default Rear Camera (Auto)'}</option>
                {cameras.map(cam => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label || `Camera ${cam.id.substr(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Mobile Tip */}
          <div className="flex items-center gap-2 p-2 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 text-[11px] text-indigo-700 dark:text-indigo-300">
            <Info className="w-4 h-4 shrink-0 text-indigo-500" />
            <span>
              {language === 'bn'
                ? 'টিপস: ফোনের ক্যামেরা বারকোড থেকে ৫-১০ ইঞ্চি দূরে সোজা রাখুন। অন্ধকার থাকলে ফ্ল্যাশলাইট অন করুন।'
                : 'Tip: Hold phone 5-10 inches away from barcode. Enable flashlight in low-light conditions.'}
            </span>
          </div>

          {/* Scanned Item Live Preview Card */}
          {lastScannedProduct && (
            <div
              className={`p-3 rounded-xl border transition-all animate-in zoom-in-95 duration-150 ${
                lastScannedProduct.status === 'SUCCESS'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                  : lastScannedProduct.status === 'EXPIRED'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                  : lastScannedProduct.status === 'OUT_OF_STOCK'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div
                    className={`p-2 rounded-xl mt-0.5 ${
                      lastScannedProduct.status === 'SUCCESS'
                        ? 'bg-emerald-600 text-white'
                        : lastScannedProduct.status === 'EXPIRED'
                        ? 'bg-rose-600 text-white'
                        : lastScannedProduct.status === 'OUT_OF_STOCK'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-600 text-white'
                    }`}
                  >
                    {lastScannedProduct.status === 'SUCCESS' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 bg-white/80 dark:bg-slate-900/80 rounded border border-slate-200 dark:border-slate-700">
                        {lastScannedProduct.code}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          lastScannedProduct.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                        }`}
                      >
                        {lastScannedProduct.status}
                      </span>
                    </div>

                    {lastScannedProduct.product ? (
                      <div className="mt-1">
                        <div className="font-bold text-sm text-slate-900 dark:text-white">
                          {lastScannedProduct.product.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3 mt-0.5">
                          <span>
                            Price:{' '}
                            <strong className="text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(lastScannedProduct.product.salesPrice)}
                            </strong>
                          </span>
                          <span>
                            Stock: <strong>{lastScannedProduct.product.stock} {lastScannedProduct.product.unit}</strong>
                          </span>
                          {lastScannedProduct.product.expDate && (
                            <span>Exp: {lastScannedProduct.product.expDate}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                        {lastScannedProduct.message}
                      </div>
                    )}
                  </div>
                </div>

                {/* Session Scanned Count Badge */}
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Session Items
                  </span>
                  <span className="font-mono font-bold text-lg text-indigo-600 dark:text-indigo-400">
                    {scanHistory.filter(s => s.status === 'SUCCESS').length}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Manual Input Fallback & Photo Scan Strip */}
          <form
            onSubmit={handleManualSubmit}
            className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800"
          >
            {/* Hidden image upload input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            <div className="relative flex-1">
              <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder={
                  language === 'bn'
                    ? 'ম্যানুয়াল কোড লিখুন বা হ্যান্ডহেল্ড ইউএসবি স্ক্যানার গান দিয়ে স্ক্যান করুন...'
                    : 'Type code manually or scan with handheld USB barcode gun...'
                }
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingImage}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
              title={language === 'bn' ? 'ছবি থেকে বারকোড স্ক্যান' : 'Scan from Photo'}
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{language === 'bn' ? 'ছবি' : 'Image'}</span>
            </button>

            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'যোগ করুন' : 'Add Code'}</span>
            </button>
          </form>

          {/* Hidden scanner container for file scanning */}
          <div id="temp-barcode-file-scanner" className="hidden" />

          {/* Recent Scanned Log Feed (Continuous Mode) */}
          {scanHistory.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-850/60 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
                <span>{language === 'bn' ? 'সাম্প্রতিক স্ক্যান তালিকা' : 'Recently Scanned in this Session'}</span>
                <span className="font-mono text-[10px]">
                  {scanHistory.length} attempts
                </span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                {scanHistory.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-2.5 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700/60 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          item.status === 'SUCCESS'
                            ? 'bg-emerald-500'
                            : item.status === 'EXPIRED'
                            ? 'bg-rose-500'
                            : 'bg-amber-500'
                        }`}
                      />
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0">
                        {item.code}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400 truncate">
                        {item.product ? item.product.name : item.message}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.product && (
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(item.product.salesPrice)}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">{item.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            {continuousMode ? (
              <span>⚡ Continuous scanning active. Scanned items are added to invoice instantly.</span>
            ) : (
              <span>Single scan mode. Modal will close automatically on scan.</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            {language === 'bn' ? 'সম্পন্ন (Done)' : 'Done & Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

