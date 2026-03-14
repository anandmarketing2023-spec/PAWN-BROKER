import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera, Image as ImageIcon, X, RotateCcw, Check,
  ZoomIn, Trash2, SwitchCamera, AlertCircle
} from 'lucide-react';

interface OrnamentCameraProps {
  imageUrl: string;
  onChange: (url: string) => void;
}

type Tab = 'preview' | 'camera' | 'gallery';

const OrnamentCamera: React.FC<OrnamentCameraProps> = ({ imageUrl, onChange }) => {
  const [tab, setTab] = useState<Tab>(imageUrl ? 'preview' : 'camera');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // ── Camera lifecycle ───────────────────────────────────────────────────────
  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    setCameraError('');
    try {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        setStream(null);
      }
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
    } catch (err: any) {
      const msg = err.name === 'NotAllowedError'
        ? 'Camera access denied. Please allow camera permission and try again.'
        : err.name === 'NotFoundError'
        ? 'No camera found on this device.'
        : 'Unable to start camera. Use gallery instead.';
      setCameraError(msg);
    }
  }, [stream]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    if (tab === 'camera') {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => { if (tab !== 'camera') stopCamera(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, facingMode]);

  // Stop camera when component unmounts
  useEffect(() => () => stopCamera(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Capture from camera ────────────────────────────────────────────────────
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Respect video dimensions, cap at 1280
    const maxW = 1280;
    let w = video.videoWidth, h = video.videoHeight;
    if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, w, h);

    const compressed = canvas.toDataURL('image/jpeg', 0.75);
    onChange(compressed);
    setTab('preview');
    setIsCapturing(false);
  }, [onChange]);

  // ── Gallery upload ─────────────────────────────────────────────────────────
  const handleGalleryFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 1280;
        let { width: w, height: h } = img;
        if (w > MAX || h > MAX) {
          if (w >= h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.75);
        onChange(compressed);
        setTab('preview');
        setIsProcessing(false);
      };
    };
    reader.readAsDataURL(file);
  }, [onChange]);

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleGalleryFile(file);
    e.target.value = '';
  };

  const flipCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
  };

  const removePhoto = () => {
    onChange('');
    setTab('camera');
  };

  // ── Tab buttons ────────────────────────────────────────────────────────────
  const TabBtn = ({ id, icon: Icon, label }: { id: Tab; icon: React.ElementType; label: string }) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
        tab === id
          ? 'text-yellow-700 border-b-2 border-yellow-500 bg-yellow-50'
          : 'text-slate-400 border-b-2 border-transparent hover:text-slate-600'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">

      {/* Tab bar */}
      <div className="flex border-b border-slate-100">
        {imageUrl && <TabBtn id="preview" icon={Check} label="Preview" />}
        <TabBtn id="camera" icon={Camera} label="Camera" />
        <TabBtn id="gallery" icon={ImageIcon} label="Gallery" />
      </div>

      {/* ── PREVIEW TAB ── */}
      {tab === 'preview' && imageUrl && (
        <div className="relative bg-slate-900">
          <img
            src={imageUrl}
            alt="Ornament"
            className="w-full object-contain max-h-72 cursor-zoom-in"
            onClick={() => setLightboxOpen(true)}
          />
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-lg transition-colors"
              title="Full screen"
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              onClick={() => setTab('camera')}
              className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-lg transition-colors"
              title="Retake"
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              onClick={removePhoto}
              className="p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg transition-colors"
              title="Remove photo"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <div className="absolute bottom-3 left-3">
            <span className="text-[10px] font-bold uppercase tracking-widest bg-black/40 text-white px-2 py-1 rounded">
              Ornament photo saved
            </span>
          </div>
        </div>
      )}

      {/* ── CAMERA TAB ── */}
      {tab === 'camera' && (
        <div className="relative bg-slate-900" style={{ minHeight: 260 }}>
          {cameraError ? (
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center" style={{ minHeight: 260 }}>
              <AlertCircle size={32} className="text-slate-500" />
              <p className="text-sm text-slate-400">{cameraError}</p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="px-4 py-2 bg-yellow-500 text-slate-900 rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => setTab('gallery')}
                className="px-4 py-2 bg-slate-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                Use gallery instead
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full object-cover"
                style={{ maxHeight: 300 }}
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder corners */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-48 h-48">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-yellow-400 rounded-tl" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-yellow-400 rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-yellow-400 rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-yellow-400 rounded-br" />
                </div>
              </div>

              {/* Controls */}
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-gradient-to-t from-black/60 to-transparent">
                <button
                  type="button"
                  onClick={() => galleryRef.current?.click()}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                  title="Open gallery"
                >
                  <ImageIcon size={18} />
                </button>

                <button
                  type="button"
                  onClick={capturePhoto}
                  disabled={isCapturing || !stream}
                  className={`w-16 h-16 rounded-full border-4 border-white flex items-center justify-center transition-all active:scale-90 ${
                    isCapturing || !stream ? 'opacity-50 cursor-not-allowed bg-white/20' : 'bg-white/20 hover:bg-white/30'
                  }`}
                  title="Capture"
                >
                  <div className="w-10 h-10 rounded-full bg-white" />
                </button>

                <button
                  type="button"
                  onClick={flipCamera}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                  title="Flip camera"
                >
                  <SwitchCamera size={18} />
                </button>
              </div>

              <div className="absolute top-3 left-0 right-0 flex justify-center pointer-events-none">
                <span className="text-[10px] font-bold uppercase tracking-widest bg-black/40 text-white px-2 py-1 rounded">
                  {facingMode === 'environment' ? 'Rear camera' : 'Front camera'}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── GALLERY TAB ── */}
      {tab === 'gallery' && (
        <div
          className="flex flex-col items-center justify-center gap-4 p-8 cursor-pointer"
          style={{ minHeight: 260 }}
          onClick={() => galleryRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleGalleryFile(file);
          }}
        >
          {isProcessing ? (
            <>
              <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Processing image...</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-yellow-50 border-2 border-dashed border-yellow-300 flex items-center justify-center">
                <ImageIcon size={28} className="text-yellow-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-700">Tap to choose from gallery</p>
                <p className="text-xs text-slate-400 mt-1">or drag & drop an image here</p>
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-medium">JPG</span>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-medium">PNG</span>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-medium">HEIC</span>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-medium">WEBP</span>
              </div>
              <p className="text-[10px] text-slate-400">Max 2MB &bull; Auto-compressed on upload</p>
            </>
          )}
        </div>
      )}

      {/* Hidden file input for gallery */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleGalleryChange}
      />

      {/* Lightbox */}
      {lightboxOpen && imageUrl && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="absolute top-5 right-5 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            onClick={() => setLightboxOpen(false)}
          >
            <X size={28} />
          </button>
          <img
            src={imageUrl}
            alt="Ornament full view"
            className="max-w-full max-h-[90vh] rounded-xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default OrnamentCamera;
