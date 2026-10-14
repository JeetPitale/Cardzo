import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { UsersView } from './components/UsersView';
import { CredentialsView } from './components/CredentialsView';
import { AttendanceView } from './components/AttendanceView';
import { GarudScannerSimulator } from './components/GarudScannerSimulator';
import { MobileWalletPreview } from './components/MobileWalletPreview';
import { RoleLoginView } from './components/RoleLoginView';
import { api } from './api';
import { User, Credential, AttendanceSession, AuditLog } from './types';
import { AlertTriangle, Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('cardzo_active_tab') || 'dashboard' : 'dashboard';
  });
  const [loading, setLoading] = useState(true);

  // App Data
  const [metrics, setMetrics] = useState({
    totalCardholders: 2,
    totalVerifiers: 1,
    currentlyCheckedIn: 0,
    issuedCredentials: 4,
    todayTransitions: 0
  });
  const [users, setUsers] = useState<User[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Single-device revocation state
  const [sessionRevokedNotice, setSessionRevokedNotice] = useState(false);

  const loadAllData = async (user?: User | null) => {
    const active = user !== undefined ? user : currentUser;
    try {
      if (active?.role === 'ADMIN') {
        // Load Analytics
        const analytics = await api.request('/admin/analytics').catch(() => null);
        if (analytics?.metrics) {
          setMetrics(analytics.metrics);
          setAuditLogs(analytics.recentAudits || []);
        }

        // Load Users
        const usersRes = await api.request('/admin/users').catch(() => null);
        if (usersRes?.users) setUsers(usersRes.users);

        // Load Attendance
        const attRes = await api.request('/admin/attendance').catch(() => null);
        if (attRes?.sessions) setSessions(attRes.sessions);

        // Load Audit Logs
        const auditRes = await api.request('/admin/audit-logs').catch(() => null);
        if (auditRes?.logs) setAuditLogs(auditRes.logs);

        // Load all credentials across institution
        const credsRes = await api.request('/admin/credentials').catch(() => ({ credentials: [] }));
        setCredentials(credsRes.credentials || []);
      } else if (active?.role === 'GARUD') {
        // Verifier needs attendance and analytics
        const attRes = await api.request('/admin/attendance').catch(() => null);
        if (attRes?.sessions) setSessions(attRes.sessions);
      } else {
        // Cardholder loads own wallet passes
        const cardsRes = await api.request('/cards').catch(() => ({ cards: [] }));
        setCredentials(cardsRes.cards || []);
      }
    } catch (err) {
      console.error('Failed to load portal data:', err);
    }
  };

  // Restore authenticated session on page refresh
  useEffect(() => {
    const restoreSession = async () => {
      const token = api.getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.request('/auth/me');
        if (res?.user) {
          setCurrentUser(res.user);
          const savedTab = localStorage.getItem('cardzo_active_tab');
          if (savedTab) {
            setActiveTab(savedTab);
          } else if (res.user.role === 'GARUD') {
            setActiveTab('garud-scanner');
          } else if (res.user.role === 'CARDHOLDER') {
            setActiveTab('mobile-wallet');
          } else {
            setActiveTab('dashboard');
          }
          await loadAllData(res.user);
        } else {
          api.setToken(null);
        }
      } catch (err: any) {
        console.warn('Session expired or invalidated:', err.message);
        api.setToken(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Real-time synchronization polling every 8s when user is authenticated
  useEffect(() => {
    if (!currentUser) return;

    loadAllData(currentUser);

    const interval = setInterval(() => {
      loadAllData(currentUser);
    }, 8000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // Synchronize activeTab changes to localStorage
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cardzo_active_tab', newTab);
    }
  };

  const handleLoginSuccess = async (user: User, token: string) => {
    setCurrentUser(user);
    setSessionRevokedNotice(false);

    let nextTab = 'dashboard';
    if (user.role === 'GARUD') {
      nextTab = 'garud-scanner';
    } else if (user.role === 'CARDHOLDER') {
      nextTab = 'mobile-wallet';
    }
    handleTabChange(nextTab);

    await loadAllData(user);
  };

  const handleQuickSwitchUser = async (email: string) => {
    setLoading(true);
    setSessionRevokedNotice(false);
    try {
      const res = await api.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: 'Password123!',
          deviceId: `cardzo-quick-switch-${Date.now()}`,
          deviceName: 'Admin Operations Console',
          platform: 'web'
        })
      });

      api.setToken(res.token);
      setCurrentUser(res.user);

      let nextTab = 'dashboard';
      if (res.user.role === 'GARUD') {
        nextTab = 'garud-scanner';
      } else if (res.user.role === 'CARDHOLDER') {
        nextTab = 'mobile-wallet';
      }
      handleTabChange(nextTab);

      await loadAllData(res.user);
    } catch (err: any) {
      console.error('Quick switch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.request('/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    api.setToken(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('cardzo_active_tab');
    }
    setCurrentUser(null);
    setSessionRevokedNotice(false);
  };

  useEffect(() => {
    // Listen for single-device revocation
    api.onSessionRevoked(() => {
      setSessionRevokedNotice(true);
    });
  }, []);

  // Loading indicator during initial session check
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0B0F19',
        color: '#FFFFFF',
        gap: '16px'
      }}>
        <Loader2 size={36} className="animate-spin" color="#0A84FF" />
        <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>Connecting to Cardzo Database...</p>
      </div>
    );
  }

  // If user is not authenticated, show Role-Based Authentication Gateway
  if (!currentUser) {
    return <RoleLoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Single-Device Session Revocation Alert Banner */}
      {sessionRevokedNotice && (
        <div style={{
          background: 'linear-gradient(90deg, #DC2626 0%, #B91C1C 100%)',
          color: '#FFFFFF',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.88rem',
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} />
            <span>
              <strong>Single-Device Session Enforcement Triggered:</strong> Your account was authenticated on another device. This session has been revoked.
            </span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: '#FFFFFF',
              color: '#B91C1C',
              padding: '4px 12px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700
            }}
          >
            Return to Role Login
          </button>
        </div>
      )}

      {/* Top Responsive Navigation */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onQuickSwitchUser={handleQuickSwitchUser}
        onLogout={handleLogout}
      />

      {/* Main Tab Content */}
      <main style={{ flex: 1 }}>
        {activeTab === 'dashboard' && (
          <DashboardView
            metrics={metrics}
            recentSessions={sessions}
            recentAudits={auditLogs}
            onNavigate={(tab) => handleTabChange(tab)}
          />
        )}

        {activeTab === 'users' && (
          <UsersView users={users} onRefresh={() => loadAllData(currentUser)} />
        )}

        {activeTab === 'credentials' && (
          <CredentialsView credentials={credentials} users={users} onRefresh={() => loadAllData(currentUser)} />
        )}

        {activeTab === 'attendance' && (
          <AttendanceView sessions={sessions} auditLogs={auditLogs} onRefresh={() => loadAllData(currentUser)} />
        )}

        {activeTab === 'garud-scanner' && (
          <GarudScannerSimulator onRefreshData={() => loadAllData(currentUser)} />
        )}

        {activeTab === 'mobile-wallet' && (
          <MobileWalletPreview currentUser={currentUser} onRefreshParent={() => loadAllData(currentUser)} />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        padding: '16px 24px',
        textAlign: 'center',
        borderTop: '1px solid var(--border-glass)',
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/assets/cardzo-logo.png" alt="logo" style={{ width: '20px', height: '20px', borderRadius: '4px' }} />
          <span>Cardzo • One Pass. Every Identity.</span>
        </div>
        <div>
          Production Identity Wallet & Dynamic QR Attendance System • Multi-Role Architecture
        </div>
      </footer>
    </div>
  );
};
