import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  CreditCard,
  QrCode,
  RotateCw,
  Camera,
  CheckCircle2,
  Clock,
  Sparkles,
  Flame,
  ChevronUp,
  X,
  Layers,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { Credential, User } from '../types';
import { api } from '../api';

interface MobileWalletProps {
  currentUser?: User | null;
  onRefreshParent: () => void;
}

export const MobileWalletPreview: React.FC<MobileWalletProps> = ({ currentUser, onRefreshParent }) => {
  const [cards, setCards] = useState<Credential[]>([]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);

  // Dynamic QR Modal State
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrToken, setQrToken] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [tokenExpiresAt, setTokenExpiresAt] = useState<Date | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(45);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [currentAttendance, setCurrentAttendance] = useState<any>({ isCheckedIn: false });

  // Scan a Card Modal State
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanStep, setScanStep] = useState<'capture-front' | 'capture-back' | 'metadata'>('capture-front');
  const [newCardTitle, setNewCardTitle] = useState('Campus Recreation & Gym Pass');
  const [newCardCategory, setNewCardCategory] = useState('Membership');
  const [savingCard, setSavingCard] = useState(false);

  // Student auth token for mobile simulator
  const [studentToken, setStudentToken] = useState<string | null>(null);

  const initStudentSession = async () => {
    try {
      let tokenToUse: string | null = null;

      if (currentUser && currentUser.role === 'CARDHOLDER') {
        // Use active cardholder session directly without creating competing logins
        tokenToUse = api.getToken();
      } else {
        // For admin previewing the student simulator, authenticate safely with a dedicated simulator device ID
        const res = await fetch(`${api.getBaseUrl()}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'aarav@cardzo.io',
            password: 'Password123!',
            deviceId: 'cardzo-simulator-preview-device',
            deviceName: 'Aarav’s iPhone Simulator',
            platform: 'ios'
          })
        });
        const data = await res.json();
        tokenToUse = data.token;
      }

      setStudentToken(tokenToUse);

      if (tokenToUse) {
        // Load cards
        const cardsRes = await fetch(`${api.getBaseUrl()}/cards`, {
          headers: { Authorization: `Bearer ${tokenToUse}` }
        });
        const cardsData = await cardsRes.json();
        setCards(cardsData.cards || []);

        // Load attendance state
        const attRes = await fetch(`${api.getBaseUrl()}/attendance/current`, {
          headers: { Authorization: `Bearer ${tokenToUse}` }
        });
        const attData = await attRes.json();
        setCurrentAttendance(attData);
      }
    } catch (err) {
      console.error('Failed to init student session:', err);
    }
  };

  useEffect(() => {
    initStudentSession();
  }, [currentUser?.id]);

  // Countdown timer for active QR token
  useEffect(() => {
    if (!showQrModal || !tokenExpiresAt) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((tokenExpiresAt.getTime() - Date.now()) / 1000));
      setSecondsRemaining(remaining);

      // If token expired, auto-refresh or prompt
      if (remaining <= 0) {
        generateDynamicQr();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [showQrModal, tokenExpiresAt]);

  const generateDynamicQr = async () => {
    if (!studentToken) return;
    setGeneratingQr(true);
    try {
      const selectedCard = cards[activeCardIndex];
      const res = await fetch(`${api.getBaseUrl()}/qr/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`
        },
        body: JSON.stringify({ credentialId: selectedCard?.id })
      });
      const data = await res.json();

      setQrToken(data.token);
      setTokenExpiresAt(new Date(data.expiresAt));
      setSecondsRemaining(data.validitySeconds || 45);

      // Generate visual QR Code
      const qrCodeUrl = await QRCode.toDataURL(data.token, {
        width: 220,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrDataUrl(qrCodeUrl);

      // Refresh attendance status
      const attRes = await fetch(`${api.getBaseUrl()}/attendance/current`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      const attData = await attRes.json();
      setCurrentAttendance(attData);
    } catch (err: any) {
      console.error('Error generating dynamic QR:', err);
    } finally {
      setGeneratingQr(false);
    }
  };

  const handleOpenCard = (index: number) => {
    setActiveCardIndex(index);
    setShowQrModal(true);
    generateDynamicQr();
  };

  const handleSaveScannedCard = async () => {
    if (!studentToken) return;
    setSavingCard(true);
    try {
      const holderName = (currentUser && currentUser.role === 'CARDHOLDER') ? currentUser.name : 'Aarav Sharma';
      await fetch(`${api.getBaseUrl()}/cards/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`
        },
        body: JSON.stringify({
          title: newCardTitle,
          type: 'MEMBERSHIP',
          issuerName: 'Apex Arena & Campus Gym',
          cardholderName: holderName,
          identifier: 'FIT-2024-' + Math.floor(1000 + Math.random() * 9000),
          category: newCardCategory,
          colorTheme: 'purple',
          isScannedPhysical: true
        })
      });

      setShowScanModal(false);
      setScanStep('capture-front');
      initStudentSession();
      onRefreshParent();
    } catch (err) {
      alert('Failed to save scanned card.');
    } finally {
      setSavingCard(false);
    }
  };

  return (
    <div className="mobile-wallet-container">
      {/* Mobile Device Mockup Frame (Adapts to real phones naturally) */}
      <div className="mobile-phone-frame">
        {/* Dynamic Island Pill (Hidden on mobile screens) */}
        <div className="dynamic-island-pill" style={{
          width: '110px',
          height: '28px',
          background: '#000000',
          borderRadius: '20px',
          position: 'absolute',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
          <span style={{ fontSize: '0.65rem', color: '#9CA3AF', fontWeight: 600 }}>Cardzo</span>
        </div>

        {/* Mobile Header Bar */}
        <div className="mobile-header-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/assets/cardzo-logo.png" alt="logo" style={{ width: '28px', height: '28px', borderRadius: '7px' }} />
            <span style={{ fontSize: '1.15rem', fontWeight: 800 }}>Wallet</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Live Campus Attendance Status Pill */}
            <span className={`badge ${currentAttendance.isCheckedIn ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '0.72rem' }}>
              {currentAttendance.isCheckedIn ? '● Checked In' : '○ Checked Out'}
            </span>

            <button
              onClick={() => setShowScanModal(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Scan a Physical Card"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Gamified Campus Streak Banner */}
        <div style={{
          margin: '0 16px 14px',
          padding: '10px 14px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(10, 132, 255, 0.1) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={20} color="#F59E0B" />
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FBBF24' }}>5-Day Campus Streak</div>
              <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>98.5% on-time verification</div>
            </div>
          </div>
          <Sparkles size={16} color="#FBBF24" />
        </div>

        {/* Apple Wallet Style Stacked Card Deck */}
        <div style={{
          flex: 1,
          padding: '10px 16px 80px',
          position: 'relative',
          overflowY: 'auto'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            PASSES & DIGITAL IDENTITY ({cards.length})
          </div>

          <div style={{ position: 'relative', height: `${cards.length * 90 + 160}px` }}>
            {cards.map((card, idx) => {
              const isFront = flippedCardId !== card.id;
              const isVerified = card.isVerified;

              return (
                <div
                  key={card.id}
                  onClick={() => handleOpenCard(idx)}
                  style={{
                    position: 'absolute',
                    top: `${idx * 75}px`,
                    left: 0,
                    right: 0,
                    height: '190px',
                    borderRadius: '20px',
                    padding: '18px',
                    background: card.colorTheme === 'emerald'
                      ? 'linear-gradient(135deg, #065F46 0%, #022C22 100%)'
                      : card.colorTheme === 'purple'
                      ? 'linear-gradient(135deg, #6B21A8 0%, #3B0764 100%)'
                      : 'linear-gradient(135deg, #1E40AF 0%, #0F172A 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 -4px 20px rgba(0,0,0,0.6)',
                    cursor: 'pointer',
                    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = `translateY(-10px) scale(1.02)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = `translateY(0) scale(1)`;
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#93C5FD', letterSpacing: '0.05em' }}>
                        {card.issuerName}
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '2px' }}>{card.title}</div>
                    </div>

                    {isVerified ? (
                      <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                        <ShieldCheck size={12} /> VERIFIED
                      </span>
                    ) : (
                      <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                        SCANNED
                      </span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>{card.cardholderName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#CBD5E1', fontFamily: 'monospace' }}>
                        {card.identifier || 'CRDZ-ID'}
                      </div>
                    </div>

                    <div style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.7rem'
                    }}>
                      <QrCode size={14} /> Tap to Open
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Floating Tap-to-Open Dynamic QR Bottom Sheet / Overlay */}
        {showQrModal && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(16px)',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            animation: 'fadeIn 0.25s ease'
          }}>
            <div style={{
              background: '#111827',
              borderTopLeftRadius: '32px',
              borderTopRightRadius: '32px',
              padding: '24px 20px 32px',
              border: '1px solid var(--border-glass)',
              boxShadow: '0 -20px 40px rgba(0,0,0,0.8)'
            }}>
              {/* Sheet Drag Bar */}
              <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto 16px' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>Dynamic Identity Pass</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Aarav Sharma • CS-2023-0492</div>
                </div>
                <button
                  onClick={() => setShowQrModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* QR Code Container with Circular Countdown Timer */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                margin: '12px 0',
                boxShadow: '0 12px 32px rgba(0,0,0,0.4)'
              }}>
                {generatingQr ? (
                  <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid #0A84FF', borderTopColor: 'transparent', borderRadius: '50%' }} />
                  </div>
                ) : (
                  <img src={qrDataUrl} alt="Dynamic QR" style={{ width: '200px', height: '200px' }} />
                )}

                {/* Countdown Progress & Security Hash */}
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1E293B', fontWeight: 600, fontSize: '0.85rem' }}>
                  <Clock size={16} color="#0A84FF" />
                  <span>Valid for <strong>{secondsRemaining}s</strong></span>
                </div>
                <div style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#64748B', marginTop: '4px' }}>
                  {qrToken.substring(0, 18)}...
                </div>
              </div>

              {/* State Status Banner */}
              <div style={{
                padding: '10px 14px',
                borderRadius: '12px',
                background: currentAttendance.isCheckedIn ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: currentAttendance.isCheckedIn ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-glass)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px'
              }}>
                <span style={{ fontSize: '0.8rem', color: currentAttendance.isCheckedIn ? '#34D399' : 'var(--text-secondary)' }}>
                  {currentAttendance.isCheckedIn ? '● Status: Currently Checked In' : '○ Status: Checked Out'}
                </span>
                <button
                  onClick={generateDynamicQr}
                  className="btn-secondary"
                  style={{ fontSize: '0.74rem', padding: '4px 8px' }}
                >
                  <RotateCw size={12} /> Refresh
                </button>
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Present this screen to authorized Garud verifier at turnstiles.
              </div>
            </div>
          </div>
        )}

        {/* Scan a Physical Card Modal (Flow Demo) */}
        {showScanModal && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            zIndex: 60,
            display: 'flex',
            flexDirection: 'column',
            padding: '48px 20px 24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Scan Physical Card</div>
              <button onClick={() => setShowScanModal(false)} style={{ color: '#FFFFFF', background: 'transparent' }}>
                <X size={20} />
              </button>
            </div>

            {scanStep === 'capture-front' ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {/* Camera Viewfinder with Aspect Ratio Box */}
                <div style={{
                  width: '300px',
                  height: '190px',
                  borderRadius: '16px',
                  border: '2px solid #0A84FF',
                  boxShadow: '0 0 24px rgba(10, 132, 255, 0.5)',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.03)'
                }}>
                  <Camera size={36} color="#0A84FF" />
                  <div style={{ position: 'absolute', bottom: '8px', fontSize: '0.7rem', color: '#93C5FD' }}>
                    ALIGN FRONT OF CARD IN FRAME
                  </div>
                </div>

                <div style={{ marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  Preserves original aspect ratio, layout, and colors without alteration.
                </div>

                <button
                  onClick={() => setScanStep('metadata')}
                  className="btn-primary"
                  style={{ marginTop: '32px', width: '100%', justifyContent: 'center' }}
                >
                  Capture Card Front
                </button>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34D399',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle2 size={16} /> Original Card Capture Completed
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Card Name / Title
                  </label>
                  <input
                    type="text"
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border-glass)', borderRadius: '10px', color: '#FFFFFF' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Category
                  </label>
                  <select
                    value={newCardCategory}
                    onChange={(e) => setNewCardCategory(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border-glass)', borderRadius: '10px', color: '#FFFFFF' }}
                  >
                    <option value="College ID" style={{ background: '#111827' }}>College ID</option>
                    <option value="Driving Licence" style={{ background: '#111827' }}>Driving Licence</option>
                    <option value="Membership" style={{ background: '#111827' }}>Membership Card</option>
                    <option value="Employee ID" style={{ background: '#111827' }}>Employee ID</option>
                  </select>
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Note: Physical card scans remain convenient visual copies and are clearly marked as unverified.
                </div>

                <button
                  onClick={handleSaveScannedCard}
                  disabled={savingCard}
                  className="btn-primary"
                  style={{ marginTop: 'auto', width: '100%', justifyContent: 'center' }}
                >
                  {savingCard ? 'Saving to Wallet...' : 'Save to Cardzo Wallet'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feature Guide Panel Next to Phone Mockup */}
      <div className="wallet-side-panel">
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '10px' }}>Apple Wallet-Inspired Experience</h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Interact with the phone simulator on the left to experience Cardzo as an enrolled student or faculty cardholder:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#60A5FA' }}>1. Stacked Pass Browsing</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Hover and tap any card in the deck to bring it into focus.
              </div>
            </div>

            <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#34D399' }}>2. Tap-to-Open Dynamic QR</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Opens floating sheet with a real-time 45s countdown timer and encrypted token.
              </div>
            </div>

            <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#FBBF24' }}>3. Scan a Physical Card Flow</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Tap the (+) icon in the top right to simulate scanning a new physical card with front/back guidance.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
