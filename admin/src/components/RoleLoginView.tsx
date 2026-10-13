import React, { useState } from 'react';
import { Shield, Smartphone, Building, KeyRound, Lock, AlertCircle, ArrowRight, CheckCircle2, UserCheck, Settings } from 'lucide-react';
import { api } from '../api';
import { User } from '../types';

export type PortalRole = 'ADMIN' | 'GARUD' | 'CARDHOLDER';

interface RoleLoginViewProps {
  onLoginSuccess: (user: User, token: string) => void;
}

const ROLE_METADATA: Record<PortalRole, {
  name: string;
  badge: string;
  icon: React.ReactNode;
  accentColor: string;
  accentBg: string;
  tagline: string;
  description: string;
  demoEmail: string;
  demoPassword: string;
  demoName: string;
  permissions: string[];
}> = {
  ADMIN: {
    name: 'Institutional Admin',
    badge: 'CAMPUS REGISTRAR & IT',
    icon: <Building size={22} color="#0A84FF" />,
    accentColor: '#0A84FF',
    accentBg: 'rgba(10, 132, 255, 0.12)',
    tagline: 'Institutional Governance & Pass Issuer Portal',
    description: 'Comprehensive administrative oversight: Issue digital passes, manage student & security staff directories, inspect turnstile attendance, and review immutable audit logs.',
    demoEmail: 'admin@cardzo.io',
    demoPassword: 'Password123!',
    demoName: 'Dr. Elena Vance (Registrar)',
    permissions: [
      'Full Student & Verifier Directory Management',
      'Batch CSV Credential Provisioning',
      'Turnstile Attendance Real-time Monitoring',
      'Audited Manual Checkout Corrections'
    ]
  },
  GARUD: {
    name: 'Garud Verifier Gate',
    badge: 'GATE SECURITY & TURNSTILE',
    icon: <Shield size={22} color="#30D158" />,
    accentColor: '#30D158',
    accentBg: 'rgba(48, 209, 88, 0.12)',
    tagline: 'High-Contrast Turnstile Verification Terminal',
    description: 'Dedicated high-speed security terminal for campus gates. Atomically evaluates dynamic 45-second QR tokens, prevents replay attacks, and transitions check-in/out states.',
    demoEmail: 'garud@cardzo.io',
    demoPassword: 'Password123!',
    demoName: 'Officer Vikram Singh (Gate Alpha)',
    permissions: [
      'Zero-Trust Dynamic QR Code Token Verification',
      'Atomic Check-in & Check-out State Machine',
      'Single-Use Token Enforcement (Replay Block)',
      'Live Gate Influx & Active Sessions Telemetry'
    ]
  },
  CARDHOLDER: {
    name: 'Student & Cardholder',
    badge: 'DIGITAL IDENTITY WALLET',
    icon: <Smartphone size={22} color="#BF5AF2" />,
    accentColor: '#BF5AF2',
    accentBg: 'rgba(191, 90, 242, 0.12)',
    tagline: 'Personal Apple Wallet-Style Identity Container',
    description: 'Cardholder mobile-first identity wallet. Generates cryptographically sealed rotating dynamic QR codes, preserves physical scanned credentials, and displays attendance history.',
    demoEmail: 'aarav@cardzo.io',
    demoPassword: 'Password123!',
    demoName: 'Aarav Sharma (Student ID: TECH-2024-001)',
    permissions: [
      '45-Second Rotating Cryptographic Dynamic Pass',
      'Original Physical Scanned Card Preservation',
      'Single-Device Authenticated Session Protection',
      'Real-time Personal Check-in / Check-out History'
    ]
  }
};

export const RoleLoginView: React.FC<RoleLoginViewProps> = ({ onLoginSuccess }) => {
  const [selectedRole, setSelectedRole] = useState<PortalRole>('ADMIN');
  const [email, setEmail] = useState('admin@cardzo.io');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState(api.getBaseUrl());
  const [showServerConfig, setShowServerConfig] = useState(false);

  const activeMeta = ROLE_METADATA[selectedRole];

  const handleRoleSelect = (role: PortalRole) => {
    setSelectedRole(role);
    setEmail(ROLE_METADATA[role].demoEmail);
    setPassword(ROLE_METADATA[role].demoPassword);
    setError(null);
    setInfoMessage(null);
  };

  const executeLogin = async (loginEmail: string, loginPass: string) => {
    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await api.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: loginEmail,
          password: loginPass,
          deviceId: `cardzo-${selectedRole.toLowerCase()}-web-${Date.now()}`,
          deviceName: `${activeMeta.name} Workstation`,
          platform: 'web'
        })
      });

      const user: User = res.user;

      // Role Mismatch Check
      if (selectedRole === 'ADMIN' && user.role !== 'ADMIN') {
        setInfoMessage(`Signed in as ${user.name} (${user.role} role). Redirecting to your authorized ${user.role === 'GARUD' ? 'Garud Verifier' : 'Student'} portal...`);
      } else if (selectedRole === 'GARUD' && user.role !== 'GARUD' && user.role !== 'ADMIN') {
        setInfoMessage(`Notice: Account has ${user.role} role. Redirecting to your personal wallet portal...`);
      }

      api.setToken(res.token);
      setTimeout(() => {
        onLoginSuccess(user, res.token);
      }, infoMessage ? 900 : 200);

    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px 16px',
      position: 'relative'
    }}>
      {/* Background ambient lighting */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(700px, 90vw)',
        height: '350px',
        background: `radial-gradient(ellipse at center, ${activeMeta.accentBg} 0%, transparent 70%)`,
        pointerEvents: 'none',
        zIndex: 0,
        transition: 'all 0.5s ease'
      }} />

      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px', zIndex: 1 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px'
        }}>
          <img
            src="/assets/cardzo-logo.png"
            alt="Cardzo"
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              boxShadow: `0 8px 24px -4px ${activeMeta.accentColor}66`
            }}
          />
          <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Cardzo</span>
              <span className="badge" style={{
                background: activeMeta.accentBg,
                color: activeMeta.accentColor,
                border: `1px solid ${activeMeta.accentColor}44`
              }}>
                {activeMeta.badge}
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              One Pass. Every Identity.
            </div>
          </div>
        </div>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '0.92rem',
          maxWidth: '520px',
          margin: '0 auto'
        }}>
          Select your institutional role to access your dedicated Cardzo portal.
        </p>
      </div>

      {/* Role Selector Tabs */}
      <div className="role-tabs-container" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
        width: '100%',
        maxWidth: '720px',
        marginBottom: '20px',
        zIndex: 1
      }}>
        {(['ADMIN', 'GARUD', 'CARDHOLDER'] as PortalRole[]).map((role) => {
          const isSelected = selectedRole === role;
          const meta = ROLE_METADATA[role];
          return (
            <button
              key={role}
              onClick={() => handleRoleSelect(role)}
              type="button"
              style={{
                background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                border: isSelected ? `2px solid ${meta.accentColor}` : '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                boxShadow: isSelected ? `0 6px 24px -6px ${meta.accentColor}44` : 'none'
              }}
            >
              <div style={{
                padding: '8px',
                borderRadius: '10px',
                background: isSelected ? meta.accentBg : 'rgba(255, 255, 255, 0.04)'
              }}>
                {meta.icon}
              </div>
              <div style={{
                fontWeight: 700,
                fontSize: '0.92rem',
                color: isSelected ? '#FFFFFF' : 'var(--text-secondary)'
              }}>
                {meta.name}
              </div>
              <span style={{
                fontSize: '0.7rem',
                padding: '2px 8px',
                borderRadius: '999px',
                background: isSelected ? meta.accentBg : 'transparent',
                color: isSelected ? meta.accentColor : 'var(--text-muted)',
                fontWeight: 600
              }}>
                {role}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Login Card */}
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '720px',
        padding: '32px',
        zIndex: 1,
        border: `1px solid ${activeMeta.accentColor}33`,
        boxShadow: `0 16px 48px -12px rgba(0, 0, 0, 0.6), 0 0 24px -8px ${activeMeta.accentColor}22`
      }}>
        {/* Role Briefing */}
        <div style={{
          borderBottom: '1px solid var(--border-glass)',
          paddingBottom: '20px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {activeMeta.name} Authentication
            </h2>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              color: activeMeta.accentColor,
              fontWeight: 600
            }}>
              <CheckCircle2 size={16} />
              Single-Device Session Guard Active
            </div>
          </div>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.88rem',
            lineHeight: 1.5,
            marginTop: '6px'
          }}>
            {activeMeta.description}
          </p>

          {/* Key Capabilities Pills */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '12px'
          }}>
            {activeMeta.permissions.map((perm, idx) => (
              <span key={idx} style={{
                fontSize: '0.72rem',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-glass)',
                color: 'var(--text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span style={{ color: activeMeta.accentColor }}>•</span> {perm}
              </span>
            ))}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            color: '#F87171',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div style={{
            background: activeMeta.accentBg,
            border: `1px solid ${activeMeta.accentColor}44`,
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            color: activeMeta.accentColor,
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px'
          }}>
            <UserCheck size={18} />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={(e) => { e.preventDefault(); executeLogin(email, password); }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Institutional Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@cardzo.io"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-md)',
                  color: '#FFFFFF',
                  fontSize: '0.92rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Account Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-md)',
                  color: '#FFFFFF',
                  fontSize: '0.92rem'
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: `linear-gradient(135deg, ${activeMeta.accentColor} 0%, #5E5CE6 100%)`,
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.96rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: `0 8px 24px -4px ${activeMeta.accentColor}66`,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? (
                <>
                  <div className="animate-spin" style={{ width: '18px', height: '18px', border: '2px solid #FFFFFF', borderTopColor: 'transparent', borderRadius: '50%' }} />
                  Verifying Cryptographic Session...
                </>
              ) : (
                <>
                  <span>Sign In to {activeMeta.name}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {/* Quick Demo Autofill & Login */}
            <button
              type="button"
              onClick={() => {
                setEmail(activeMeta.demoEmail);
                setPassword(activeMeta.demoPassword);
                executeLogin(activeMeta.demoEmail, activeMeta.demoPassword);
              }}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.04)',
                border: `1px dashed ${activeMeta.accentColor}66`,
                color: activeMeta.accentColor,
                fontWeight: 600,
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <KeyRound size={16} />
              <span>1-Click Demo Login as {activeMeta.demoName}</span>
            </button>

            {/* Server Endpoint Config */}
            <div style={{ marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowServerConfig(!showServerConfig)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  margin: '0 auto'
                }}
              >
                <Settings size={13} />
                <span>API Endpoint: {serverUrl}</span>
              </button>

              {showServerConfig && (
                <div style={{
                  marginTop: '10px',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-glass)'
                }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Backend API URL:
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="https://cardzo-backend.vercel.app/api"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '0.8rem'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        api.setBaseUrl(serverUrl);
                        setShowServerConfig(false);
                      }}
                      style={{
                        padding: '8px 14px',
                        background: activeMeta.accentColor,
                        color: '#FFFFFF',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: 'none'
                      }}
                    >
                      Save
                    </button>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Enter your live backend API URL (ends with <code>/api</code>).
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Security Footnote */}
      <div style={{
        marginTop: '20px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.78rem',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        zIndex: 1
      }}>
        <Lock size={14} />
        <span>Protected by Cardzo Zero-Trust Security • SHA-256 Dynamic Tokens • Single-Device Atomic Invalidation</span>
      </div>
    </div>
  );
};
