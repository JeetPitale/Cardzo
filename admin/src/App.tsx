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
import { AlertTriangle, Lock, Shield } from 'lucide-react';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [loading, setLoading] = useState(false);

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

  const loadAllData = async () => {
    try {
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

      // Load credentials
      const cardsRes = await api.request('/cards').catch(() => ({ cards: [] }));
      setCredentials(cardsRes.cards || []);
    } catch (err) {
      console.error('Failed to load portal data:', err);
    }
  };

  const handleLoginSuccess = async (user: User, token: string) => {
    setCurrentUser(user);
    setSessionRevokedNotice(false);

    // Set initial active tab based on role
    if (user.role === 'GARUD') {
      setActiveTab('garud-scanner');
    } else if (user.role === 'CARDHOLDER') {
      setActiveTab('mobile-wallet');
    } else {
      setActiveTab('dashboard');
    }

    await loadAllData();
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

      if (res.user.role === 'GARUD') {
        setActiveTab('garud-scanner');
      } else if (res.user.role === 'CARDHOLDER') {
        setActiveTab('mobile-wallet');
      } else {
        setActiveTab('dashboard');
      }

      await loadAllData();
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
    setCurrentUser(null);
    setSessionRevokedNotice(false);
  };

  useEffect(() => {
    // Listen for single-device revocation
    api.onSessionRevoked(() => {
      setSessionRevokedNotice(true);
    });
  }, []);

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
        setActiveTab={setActiveTab}
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
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'users' && (
          <UsersView users={users} onRefresh={loadAllData} />
        )}

        {activeTab === 'credentials' && (
          <CredentialsView credentials={credentials} users={users} onRefresh={loadAllData} />
        )}

        {activeTab === 'attendance' && (
          <AttendanceView sessions={sessions} auditLogs={auditLogs} onRefresh={loadAllData} />
        )}

        {activeTab === 'garud-scanner' && (
          <GarudScannerSimulator onRefreshData={loadAllData} />
        )}

        {activeTab === 'mobile-wallet' && (
          <MobileWalletPreview onRefreshParent={loadAllData} />
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
