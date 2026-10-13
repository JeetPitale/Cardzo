import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Shield, CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw, Zap, ArrowRight, User, Camera, CameraOff, Video } from 'lucide-react';
import { api } from '../api';
import { Html5Qrcode } from 'html5-qrcode';

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
  const qrScannerRef = useRef<Html5Qrcode | null>(null);

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
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch (e) {
      // Audio not permitted or unavailable
    }
  };

  const stopCamera = async () => {
    try {
      if (qrScannerRef.current && qrScannerRef.current.isScanning) {
        await qrScannerRef.current.stop();
      }
      qrScannerRef.current = null;
    } catch (err) {
      console.warn('Error stopping scanner:', err);
    } finally {
      setIsCameraActive(false);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setScanResult(null);

    try {
      await stopCamera();

      const qrScanner = new Html5Qrcode('garud-qr-reader');
      qrScannerRef.current = qrScanner;

      const qrCodeSuccessCallback = async (decodedText: string) => {
        playScanBeep(true);
        setTokenInput(decodedText);
        // Stop camera on success to avoid re-triggering
        await stopCamera();
        handleVerify(decodedText);
      };

      // Try environment (back) camera first, fallback to user camera
      const config = {
        fps: 15,
        qrbox: { width: 240, height: 240 },
        aspectRatio: 1.0
      };

      try {
        await qrScanner.start(
          { facingMode: 'environment' },
          config,
          qrCodeSuccessCallback,
          () => {}
        );
        setIsCameraActive(true);
      } catch (backCamErr) {
        // Fallback to front/user camera (e.g. laptop webcam)
        await qrScanner.start(
          { facingMode: 'user' },
          config,
          qrCodeSuccessCallback,
          () => {}
        );
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.error('Camera start error:', err);
      setIsCameraActive(false);
      setCameraError(err.message || 'Unable to access camera. Please check camera permissions.');
    }
  };

  const fetchLiveStudentToken = async () => {
    setDemoTokenLoading(true);
    try {
      // Temporarily login as Aarav to generate dynamic token
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
      // If token input is empty, trigger camera open instead
      startCamera();
      return;
    }

    setScanning(true);
    setScanResult(null);

    try {
      // Ensure we are authenticated as Garud or Admin
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
      // Cleanup camera on unmount
      if (qrScannerRef.current && qrScannerRef.current.isScanning) {
        qrScannerRef.current.stop().catch(() => {});
      }
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
            Optical camera QR scanner for campus security and turnstile operators with zero-trust validation.
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <QrCode size={18} color="var(--cardzo-blue)" /> Optical Camera Scanner
            </h2>
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
                onClick={startCamera}
                className="btn-primary"
                style={{ fontSize: '0.78rem', padding: '6px 12px' }}
              >
                <Camera size={14} /> Open Scanner
              </button>
            )}
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
            {/* The HTML5 QR Code Mount Element */}
            <div
              id="garud-qr-reader"
              style={{
                width: '100%',
                display: isCameraActive ? 'block' : 'none',
                overflow: 'hidden'
              }}
            />

            {/* Standby State when camera is NOT running */}
            {!isCameraActive && (
              <div
                onClick={startCamera}
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
                  Uses your mobile/webcam lens to instantly detect & verify student passes
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
