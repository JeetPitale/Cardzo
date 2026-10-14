import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Shield, CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw, Zap, ArrowRight, User, Camera, CameraOff, Video, FlipHorizontal, Image as ImageIcon } from 'lucide-react';
import { api } from '../api';
import jsQR from 'jsqr';

interface GarudScannerProps {
  onRefreshData: () => void;
}

export const GarudScannerSimulator: React.FC<GarudScannerProps> = ({ onRefreshData }) => {
  const [tokenInput, setTokenInput] = useState('');
  const [gateLocation, setGateLocation] = useState('Main Gate Alpha Turnstile');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [recentVerifications, setRecentVerifications] = useState<any[]>([]);

  // Camera scanner state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [activeCamIndex, setActiveCamIndex] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper to fetch live token from Aarav for instant demo test
  const [demoTokenLoading, setDemoTokenLoading] = useState(false);

  // Play pleasant audible confirmation chime
  const playScanBeep = (isSuccess: boolean = true) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isSuccess ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(isSuccess ? 880 : 330, ctx.currentTime);
      if (isSuccess) {
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
      }
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch (e) {
      // Audio not permitted or unavailable
    }
  };

  const stopCamera = () => {
    isScanningRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Decode frame using Native BarcodeDetector (instant on iOS/Safari & Chrome) with jsQR fallback
  const decodeVideoFrame = async (video: HTMLVideoElement): Promise<string | null> => {
    // 1. Native Hardware BarcodeDetector (Apple Vision / ML Kit)
    if ('BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        const barcodes = await detector.detect(video);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          return barcodes[0].rawValue;
        }
      } catch (e) {
        // Fallback to jsQR
      }
    }

    // 2. jsQR Engine with adaptive binarization (great for screens & glare)
    try {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (width > 0 && height > 0) {
        if (!canvasRef.current) {
          canvasRef.current = document.createElement('canvas');
        }
        const canvas = canvasRef.current;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);
          const code = jsQR(imageData.data, width, height, {
            inversionAttempts: 'attemptBoth'
          });
          if (code && code.data) {
            return code.data;
          }
        }
      }
    } catch (e) {
      // Continue
    }

    return null;
  };

  const startCamera = async (targetIndex?: number) => {
    setCameraError(null);
    setScanResult(null);

    try {
      stopCamera();

      // Query available video devices
      let devList = cameras;
      if (!devList || devList.length === 0) {
        const allDevices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        devList = allDevices
          .filter(d => d.kind === 'videoinput')
          .map(d => ({ id: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 5)}` }));
        setCameras(devList);
      }

      const camIdx = typeof targetIndex === 'number' ? targetIndex : activeCamIndex;
      setActiveCamIndex(camIdx);

      let constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      if (devList && devList.length > 0 && devList[camIdx]?.id) {
        constraints = {
          video: {
            deviceId: { exact: devList[camIdx].id },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints).catch(async () => {
        return navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        }).catch(() => {
          return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        });
      });

      streamRef.current = stream;
      setIsCameraActive(true);
      isScanningRef.current = true;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // Continuous high-speed scan loop
      const runScanLoop = async () => {
        if (!isScanningRef.current || !videoRef.current) return;
        const video = videoRef.current;

        if (video.readyState >= 2) {
          const detected = await decodeVideoFrame(video);
          if (detected) {
            playScanBeep(true);
            setTokenInput(detected);
            stopCamera();
            handleVerify(detected);
            return;
          }
        }

        if (isScanningRef.current) {
          animFrameRef.current = requestAnimationFrame(runScanLoop);
        }
      };

      animFrameRef.current = requestAnimationFrame(runScanLoop);
    } catch (err: any) {
      console.error('Camera start error:', err);
      setIsCameraActive(false);
      isScanningRef.current = false;
      setCameraError(err.message || 'Unable to access camera. Please check camera permissions in your browser.');
    }
  };

  const handleFlipCamera = async () => {
    if (cameras.length <= 1) return;
    const nextIdx = (activeCamIndex + 1) % cameras.length;
    await startCamera(nextIdx);
  };

  const handleScanFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = objectUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(objectUrl);

      let detectedText: string | null = null;
      if ('BarcodeDetector' in window) {
        try {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await detector.detect(canvas);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            detectedText = barcodes[0].rawValue;
          }
        } catch (e) {}
      }

      if (!detectedText) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth'
        });
        if (code && code.data) {
          detectedText = code.data;
        }
      }

      if (detectedText) {
        playScanBeep(true);
        setTokenInput(detectedText);
        handleVerify(detectedText);
      } else {
        throw new Error('No QR detected');
      }
    } catch (err: any) {
      playScanBeep(false);
      alert('Could not find a valid Cardzo QR code in this image. Please ensure the QR is clear and well-lit.');
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fetchLiveStudentToken = async () => {
    setDemoTokenLoading(true);
    try {
      const loginRes = await fetch(`${api.getBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'aarav@cardzo.io', password: 'Password123!', deviceId: 'aarav-temp' })
      });
      const loginData = await loginRes.json();
      
      const qrRes = await fetch(`${api.getBaseUrl()}/qr/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        },
        body: JSON.stringify({})
      });
      const qrData = await qrRes.json();
      setTokenInput(qrData.token);
    } catch (err: any) {
      alert('Could not fetch test token: ' + err.message);
    } finally {
      setDemoTokenLoading(false);
    }
  };

  const handleVerify = async (tokenToUse?: string) => {
    const activeToken = tokenToUse || tokenInput;
    if (!activeToken) {
      startCamera();
      return;
    }

    setScanning(true);
    setScanResult(null);

    try {
      const res = await api.request('/garud/verify', {
        method: 'POST',
        body: JSON.stringify({
          token: activeToken,
          location: gateLocation
        })
      });

      setScanResult(res);
      playScanBeep(true);
      onRefreshData();
      loadRecentActivity();
    } catch (err: any) {
      playScanBeep(false);
      setScanResult({
        success: false,
        status: 'VERIFICATION_REJECTED',
        message: err.message
      });
    } finally {
      setScanning(false);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const res = await api.request('/garud/activity');
      setRecentVerifications(res.events || []);
    } catch (err) {
      // Ignore if not garud role currently
    }
  };

  useEffect(() => {
    loadRecentActivity();
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="responsive-page">
      <div className="responsive-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Garud Verifier Terminal</h1>
            <span className="badge badge-warning">🛡️ AUTHORIZED OPERATOR MODE</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '4px' }}>
            Hardware-accelerated optical QR scanner with Apple Vision & adaptive screen binarization.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Station:</span>
          <select
            value={gateLocation}
            onChange={(e) => setGateLocation(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-sm)',
              color: '#FFFFFF',
              padding: '6px 10px',
              fontSize: '0.82rem'
            }}
          >
            <option value="Main Gate Alpha Turnstile" style={{ background: '#111827' }}>Main Gate Alpha Turnstile</option>
            <option value="North Campus Turnstile" style={{ background: '#111827' }}>North Campus Turnstile</option>
            <option value="Science & Research Gate" style={{ background: '#111827' }}>Science & Research Gate</option>
            <option value="Sports Arena Gate" style={{ background: '#111827' }}>Sports Arena Gate</option>
          </select>
        </div>
      </div>

      <div className="responsive-two-col">
        {/* Left Column: Live Camera Scanner & Viewfinder */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <QrCode size={18} color="var(--cardzo-blue)" /> Optical Camera Scanner
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isCameraActive && cameras.length > 1 && (
                <button
                  onClick={handleFlipCamera}
                  className="btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '6px 10px', gap: '4px' }}
                  title="Switch to next camera"
                >
                  <FlipHorizontal size={14} /> Flip Camera
                </button>
              )}
              {isCameraActive ? (
                <button
                  onClick={stopCamera}
                  className="btn-danger"
                  style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                >
                  <CameraOff size={14} /> Stop Camera
                </button>
              ) : (
                <button
                  onClick={() => startCamera()}
                  className="btn-primary"
                  style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                >
                  <Camera size={14} /> Open Scanner
                </button>
              )}
            </div>
          </div>

          {/* Scanner Viewfinder Box */}
          <div style={{
            minHeight: '260px',
            borderRadius: 'var(--radius-md)',
            background: '#000000',
            border: isCameraActive ? '2px solid #30D158' : '2px dashed rgba(10, 132, 255, 0.4)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            marginBottom: '18px'
          }}>
            {/* Live Camera Scanner Active Indicator */}
            {isCameraActive && (
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                zIndex: 20,
                background: 'rgba(0, 0, 0, 0.75)',
                border: '1px solid rgba(48, 209, 88, 0.4)',
                borderRadius: '20px',
                padding: '4px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.74rem',
                color: '#34D399',
                backdropFilter: 'blur(8px)'
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#30D158', display: 'inline-block', boxShadow: '0 0 8px #30D158' }} />
                <span>Live Hardware Scanner Active</span>
              </div>
            )}

            {/* Direct High-Resolution HTML5 Video Feed */}
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              style={{
                width: '100%',
                maxHeight: '380px',
                display: isCameraActive ? 'block' : 'none',
                borderRadius: 'var(--radius-md)'
              }}
            />

            {/* Targeting Reticle & Laser overlay when camera is running */}
            {isCameraActive && (
              <div style={{
                position: 'absolute',
                top: '15%',
                bottom: '15%',
                left: '12%',
                right: '12%',
                border: '2px dashed rgba(48, 209, 88, 0.7)',
                borderRadius: '20px',
                pointerEvents: 'none',
                boxShadow: '0 0 24px rgba(48, 209, 88, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* Laser animation */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, #30D158, #0A84FF, transparent)',
                  boxShadow: '0 0 12px #30D158',
                  animation: 'pulseGlow 1.8s infinite ease-in-out'
                }} />
              </div>
            )}

            {/* Standby State when camera is NOT running */}
            {!isCameraActive && (
              <div
                onClick={() => startCamera()}
                style={{
                  width: '100%',
                  height: '260px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  background: 'radial-gradient(circle at center, rgba(10, 132, 255, 0.12) 0%, rgba(0,0,0,0.9) 100%)',
                  padding: '20px'
                }}
              >
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'rgba(10, 132, 255, 0.15)',
                  border: '2px solid rgba(10, 132, 255, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '14px',
                  boxShadow: '0 0 24px rgba(10, 132, 255, 0.3)'
                }}>
                  <Camera size={38} color="#0A84FF" />
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#FFFFFF' }}>
                  Tap to Activate Camera Scanner
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', textAlign: 'center' }}>
                  Hardware-accelerated instant pass detection with screen binarization
                </div>
              </div>
            )}

            {/* Camera error notification if access was denied */}
            {cameraError && (
              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '10px',
                right: '10px',
                background: 'rgba(239, 68, 68, 0.9)',
                color: '#FFFFFF',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                textAlign: 'center'
              }}>
                {cameraError}
              </div>
            )}
          </div>

          {/* Hidden File Input for Scan from Screenshot/Photo */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleScanFromFile}
          />

          {/* Action Row & Manual Input Fallback */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Scan or enter CRDZ- dynamic pass token..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-md)',
                  color: '#FFFFFF',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem'
                }}
              />
              <button
                onClick={() => {
                  if (tokenInput.trim()) {
                    handleVerify();
                  } else {
                    startCamera();
                  }
                }}
                disabled={scanning}
                className="btn-primary"
                style={{ whiteSpace: 'nowrap', gap: '6px' }}
              >
                <Camera size={16} />
                {scanning ? 'Verifying...' : tokenInput.trim() ? 'Verify Token' : 'Open Camera'}
              </button>
            </div>

            {/* Scan from Photo / Screenshot Option */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary"
              style={{ fontSize: '0.8rem', padding: '8px 12px', justifyContent: 'center', gap: '8px', width: '100%' }}
            >
              <ImageIcon size={15} color="#38BDF8" /> Scan from QR Image / Screenshot
            </button>

            {/* Quick Demo Helpers */}
            <div style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-glass)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Testing without a second device?
              </span>
              <button
                onClick={fetchLiveStudentToken}
                disabled={demoTokenLoading}
                className="btn-secondary"
                style={{ fontSize: '0.78rem', padding: '6px 12px', color: '#60A5FA' }}
              >
                <Zap size={14} /> {demoTokenLoading ? 'Fetching...' : 'Fetch Student Pass Token'}
              </button>
            </div>
          </div>
        </div>



        {/* Right Column: High-Contrast Immediate Result Display */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '24px', minHeight: '340px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px' }}>Verification Verdict</h2>

            {!scanResult ? (
              <div style={{
                height: '240px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                textAlign: 'center',
                padding: '24px'
              }}>
                <Shield size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Ready to Verify</div>
                <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                  Scan a Cardzo pass or click "Fetch Student Pass Token" to execute an atomic Check-In / Check-Out transition.
                </div>
              </div>
            ) : scanResult.success && scanResult.action === 'CHECK_IN' ? (
              /* State A -> State B: Check-In Success */
              <div style={{
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(18, 24, 38, 0.9) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.5)',
                boxShadow: '0 8px 32px -8px rgba(16, 185, 129, 0.4)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#34D399', marginBottom: '12px' }}>
                  <CheckCircle2 size={28} />
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>CHECK-IN SUCCESSFUL</div>
                    <div style={{ fontSize: '0.78rem', color: '#E2E8F0' }}>Campus Entry Authorized</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '16px 0', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--cardzo-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    fontWeight: 700
                  }}>
                    {scanResult.cardholder.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{scanResult.cardholder.name}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Roll No: {scanResult.cardholder.identifierNumber} • {scanResult.cardholder.department}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Time: {new Date(scanResult.timestamp).toLocaleTimeString()}</span>
                  <span>Station: {gateLocation}</span>
                </div>

                <button
                  onClick={() => startCamera()}
                  className="btn-primary"
                  style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}
                >
                  <Camera size={16} /> Scan Next Pass
                </button>
              </div>
            ) : scanResult.success && scanResult.action === 'CHECK_OUT' ? (
              /* State B -> State A: Check-Out Success */
              <div style={{
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, rgba(10, 132, 255, 0.2) 0%, rgba(18, 24, 38, 0.9) 100%)',
                border: '1px solid rgba(10, 132, 255, 0.5)',
                boxShadow: '0 8px 32px -8px rgba(10, 132, 255, 0.4)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#60A5FA', marginBottom: '12px' }}>
                  <CheckCircle2 size={28} />
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>CHECK-OUT SUCCESSFUL</div>
                    <div style={{ fontSize: '0.78rem', color: '#E2E8F0' }}>Campus Departure Logged</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '16px 0', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--cardzo-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    fontWeight: 700
                  }}>
                    {scanResult.cardholder.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{scanResult.cardholder.name}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Roll No: {scanResult.cardholder.identifierNumber} • Session Completed
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Departure: {new Date(scanResult.timestamp).toLocaleTimeString()}</span>
                  <span>Station: {gateLocation}</span>
                </div>

                <button
                  onClick={() => startCamera()}
                  className="btn-primary"
                  style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}
                >
                  <Camera size={16} /> Scan Next Pass
                </button>
              </div>
            ) : (
              /* Failure / Expired / Replay Alert */
              <div style={{
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(18, 24, 38, 0.9) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                boxShadow: '0 8px 32px -8px rgba(239, 68, 68, 0.4)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#F87171', marginBottom: '12px' }}>
                  <XCircle size={28} />
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>VERIFICATION REJECTED</div>
                    <div style={{ fontSize: '0.78rem', color: '#FCA5A5' }}>
                      {scanResult.status === 'ALREADY_USED' ? 'Replay Attack Prevented - Already Used' : scanResult.status === 'QR_EXPIRED' ? 'Token Expired' : 'Invalid Pass Token'}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: '0.88rem', color: '#FEE2E2', margin: '14px 0' }}>
                  {scanResult.message || 'The presented credential token is invalid, expired, or already consumed.'}
                </p>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Action Required: Request the cardholder to present a refreshed dynamic pass in Cardzo.
                </div>

                <button
                  onClick={() => startCamera()}
                  className="btn-secondary"
                  style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}
                >
                  <Camera size={16} /> Scan Next Pass
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
