import React, { useState } from 'react';
import { Shield, Smartphone, QrCode, LogOut, CheckCircle2, Menu, X, LayoutDashboard, Users, CreditCard, Clock, UserCheck } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  currentUser: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onQuickSwitchUser: (email: string) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onQuickSwitchUser,
  onLogout
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const role = currentUser?.role || 'ADMIN';

  const roleBadgeConfig = {
    ADMIN: { label: 'ADMINISTRATOR', badgeClass: 'badge-blue', color: '#0A84FF' },
    GARUD: { label: 'GARUD VERIFIER', badgeClass: 'badge-warning', color: '#30D158' },
    CARDHOLDER: { label: 'STUDENT WALLET', badgeClass: 'badge-success', color: '#BF5AF2' }
  }[role] || { label: role, badgeClass: 'badge-neutral', color: '#0A84FF' };

  return (
    <header className="glass-panel navbar-container" style={{
      margin: '12px 16px',
      padding: '12px 20px',
      position: 'sticky',
      top: '12px',
      zIndex: 50
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        gap: '12px'
      }}>
        {/* Brand & Institution Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/assets/cardzo-logo.png"
            alt="Cardzo"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              boxShadow: `0 4px 14px ${roleBadgeConfig.color}55`
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Cardzo</span>
              <span className={`badge ${roleBadgeConfig.badgeClass}`} style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                {roleBadgeConfig.label}
              </span>
            </div>
            <div className="navbar-subtitle" style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
              {currentUser?.name || 'Apex Institute of Technology'}
            </div>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Admin Tabs */}
          {role === 'ADMIN' && (
            <>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}
                style={{ fontSize: '0.84rem', padding: '7px 12px' }}
              >
                <LayoutDashboard size={15} />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}
                style={{ fontSize: '0.84rem', padding: '7px 12px' }}
              >
                <Users size={15} />
                Users & Roles
              </button>
              <button
                onClick={() => setActiveTab('credentials')}
                className={activeTab === 'credentials' ? 'btn-primary' : 'btn-secondary'}
                style={{ fontSize: '0.84rem', padding: '7px 12px' }}
              >
                <CreditCard size={15} />
                Credentials
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={activeTab === 'attendance' ? 'btn-primary' : 'btn-secondary'}
                style={{ fontSize: '0.84rem', padding: '7px 12px' }}
              >
                <Clock size={15} />
                Attendance & Audit
              </button>
              <button
                onClick={() => setActiveTab('garud-scanner')}
                style={{
                  background: activeTab === 'garud-scanner' ? 'var(--cardzo-gradient)' : 'rgba(94, 92, 230, 0.15)',
                  border: '1px solid rgba(94, 92, 230, 0.4)',
                  color: '#FFFFFF',
                  padding: '7px 12px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.84rem',
                  fontWeight: 600
                }}
              >
                <QrCode size={15} />
                Garud Verifier
              </button>
              <button
                onClick={() => setActiveTab('mobile-wallet')}
                style={{
                  background: activeTab === 'mobile-wallet' ? 'var(--cardzo-gradient)' : 'rgba(191, 90, 242, 0.15)',
                  border: '1px solid rgba(191, 90, 242, 0.4)',
                  color: '#BF5AF2',
                  padding: '7px 12px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.84rem',
                  fontWeight: 600
                }}
              >
                <Smartphone size={15} />
                Wallet Simulator
              </button>
            </>
          )}

          {/* Garud Security Verifier Tabs */}
          {role === 'GARUD' && (
            <>
              <button
                onClick={() => setActiveTab('garud-scanner')}
                className={activeTab === 'garud-scanner' ? 'btn-primary' : 'btn-secondary'}
                style={{ fontSize: '0.84rem', padding: '7px 14px' }}
              >
                <QrCode size={16} />
                Gate Verifier Terminal
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={activeTab === 'attendance' ? 'btn-primary' : 'btn-secondary'}
                style={{ fontSize: '0.84rem', padding: '7px 14px' }}
              >
                <Clock size={16} />
                Gate Attendance Logs
              </button>
            </>
          )}

          {/* Cardholder / Student Tabs */}
          {role === 'CARDHOLDER' && (
            <>
              <button
                onClick={() => setActiveTab('mobile-wallet')}
                className={activeTab === 'mobile-wallet' ? 'btn-primary' : 'btn-secondary'}
                style={{ fontSize: '0.84rem', padding: '7px 14px' }}
              >
                <Smartphone size={16} />
                My Pass Wallet & Dynamic QR
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={activeTab === 'attendance' ? 'btn-primary' : 'btn-secondary'}
                style={{ fontSize: '0.84rem', padding: '7px 14px' }}
              >
                <Clock size={16} />
                My Attendance History
              </button>
            </>
          )}
        </nav>

        {/* User Persona & Logout Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Persona Switcher for Quick Testing */}
          <div className="persona-switcher-box" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <select
              value={currentUser?.email || ''}
              onChange={(e) => onQuickSwitchUser(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 8px',
                fontSize: '0.78rem',
                cursor: 'pointer',
                maxWidth: '160px'
              }}
            >
              <option value="admin@cardzo.io" style={{ background: '#111827' }}>👑 Admin: Elena</option>
              <option value="garud@cardzo.io" style={{ background: '#111827' }}>🛡️ Garud: Vikram</option>
              <option value="aarav@cardzo.io" style={{ background: '#111827' }}>🎓 Student: Aarav</option>
            </select>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            title="Log Out & Switch Role"
            className="btn-danger"
            style={{
              padding: '6px 10px',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <LogOut size={14} />
            <span className="logout-text">Logout</span>
          </button>

          {/* Mobile Hamburger Button */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-sm)',
              padding: '7px',
              color: '#FFFFFF',
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-drawer" style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border-glass)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {role === 'ADMIN' && (
            <>
              <button
                onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
                className={activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <LayoutDashboard size={16} /> Dashboard
              </button>
              <button
                onClick={() => { setActiveTab('users'); setMobileMenuOpen(false); }}
                className={activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <Users size={16} /> Users & Roles
              </button>
              <button
                onClick={() => { setActiveTab('credentials'); setMobileMenuOpen(false); }}
                className={activeTab === 'credentials' ? 'btn-primary' : 'btn-secondary'}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <CreditCard size={16} /> Credentials
              </button>
              <button
                onClick={() => { setActiveTab('attendance'); setMobileMenuOpen(false); }}
                className={activeTab === 'attendance' ? 'btn-primary' : 'btn-secondary'}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <Clock size={16} /> Attendance & Audit
              </button>
              <button
                onClick={() => { setActiveTab('garud-scanner'); setMobileMenuOpen(false); }}
                className={activeTab === 'garud-scanner' ? 'btn-primary' : 'btn-secondary'}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <QrCode size={16} /> Garud Verifier Terminal
              </button>
              <button
                onClick={() => { setActiveTab('mobile-wallet'); setMobileMenuOpen(false); }}
                className={activeTab === 'mobile-wallet' ? 'btn-primary' : 'btn-secondary'}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <Smartphone size={16} /> Student Wallet Simulator
              </button>
            </>
          )}

          {role === 'GARUD' && (
            <>
              <button
                onClick={() => { setActiveTab('garud-scanner'); setMobileMenuOpen(false); }}
                className={activeTab === 'garud-scanner' ? 'btn-primary' : 'btn-secondary'}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <QrCode size={16} /> Gate Verifier Terminal
              </button>
              <button
                onClick={() => { setActiveTab('attendance'); setMobileMenuOpen(false); }}
                className={activeTab === 'attendance' ? 'btn-primary' : 'btn-secondary'}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <Clock size={16} /> Gate Attendance Logs
              </button>
            </>
          )}

          {role === 'CARDHOLDER' && (
            <>
              <button
                onClick={() => { setActiveTab('mobile-wallet'); setMobileMenuOpen(false); }}
                className={activeTab === 'mobile-wallet' ? 'btn-primary' : 'btn-secondary'}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <Smartphone size={16} /> My Pass Wallet & Dynamic QR
              </button>
              <button
                onClick={() => { setActiveTab('attendance'); setMobileMenuOpen(false); }}
                className={activeTab === 'attendance' ? 'btn-primary' : 'btn-secondary'}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <Clock size={16} /> My Attendance History
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
};
