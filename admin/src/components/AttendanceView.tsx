import React, { useState } from 'react';
import { Activity, Search, AlertCircle, CheckCircle2, Clock, ShieldCheck, UserMinus } from 'lucide-react';
import { AttendanceSession, AuditLog } from '../types';
import { api } from '../api';

interface AttendanceViewProps {
  sessions: AttendanceSession[];
  auditLogs: AuditLog[];
  onRefresh: () => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({ sessions, auditLogs, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'sessions' | 'audit'>('sessions');

  // Manual correction state
  const [selectedSessionForCheckout, setSelectedSessionForCheckout] = useState<AttendanceSession | null>(null);
  const [checkoutReason, setCheckoutReason] = useState('Forgotten checkout - verified student departed via security checkpoint.');
  const [submittingCheckout, setSubmittingCheckout] = useState(false);

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.user.identifierNumber && s.user.identifierNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleForceCheckout = async () => {
    if (!selectedSessionForCheckout) return;
    setSubmittingCheckout(true);
    try {
      await api.request(`/admin/attendance/${selectedSessionForCheckout.id}/force-checkout`, {
        method: 'POST',
        body: JSON.stringify({ reason: checkoutReason })
      });
      setSelectedSessionForCheckout(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to force checkout.');
    } finally {
      setSubmittingCheckout(false);
    }
  };

  return (
    <div className="responsive-page">
      <div className="responsive-header">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Attendance & Campus Turnstile Ledger</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
            ACID-enforced single active attendance sessions, Garud verification timestamps, and audited manual checkout corrections.
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255, 255, 255, 0.05)', padding: '4px', borderRadius: 'var(--radius-md)', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('sessions')}
            style={{
              background: activeTab === 'sessions' ? 'var(--cardzo-gradient)' : 'transparent',
              color: '#FFFFFF',
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '0.84rem'
            }}
          >
            Attendance Sessions ({sessions.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            style={{
              background: activeTab === 'audit' ? 'var(--cardzo-gradient)' : 'transparent',
              color: '#FFFFFF',
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '0.84rem'
            }}
          >
            Security Audit Trail ({auditLogs.length})
          </button>
        </div>
      </div>

      {activeTab === 'sessions' ? (
        <>
          {/* Filter Bar */}
          <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by student name or roll number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 42px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {['ALL', 'CHECKED_IN', 'CHECKED_OUT'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  style={{
                    background: statusFilter === status ? 'rgba(10, 132, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: statusFilter === status ? '1px solid rgba(10, 132, 255, 0.5)' : '1px solid var(--border-glass)',
                    color: statusFilter === status ? '#60A5FA' : 'var(--text-secondary)',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}
                >
                  {status === 'CHECKED_IN' ? '● CHECKED IN' : status === 'CHECKED_OUT' ? '✓ CHECKED OUT' : 'ALL SESSIONS'}
                </button>
              ))}
            </div>
          </div>

          {/* Sessions Table */}
          <div className="glass-panel table-responsive-container">
            <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-glass)' }}>
                  <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Cardholder</th>
                  <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Check-In Time</th>
                  <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Check-Out Time</th>
                  <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Location</th>
                  <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>Audited Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session) => (
                  <tr key={session.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 600 }}>{session.user.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {session.user.identifierNumber || 'Student'} • {session.user.department || 'General'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className={`badge ${session.status === 'CHECKED_IN' ? 'badge-success' : 'badge-neutral'}`}>
                        {session.status === 'CHECKED_IN' ? '● CHECKED IN' : '✓ CHECKED OUT'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', color: '#E2E8F0' }}>
                      {new Date(session.checkInTimestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '16px 20px', color: '#94A3B8' }}>
                      {session.checkOutTimestamp ? new Date(session.checkOutTimestamp).toLocaleString() : 'Active in Session'}
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                      {session.location || 'Main Campus Turnstile'}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      {session.status === 'CHECKED_IN' ? (
                        <button
                          onClick={() => setSelectedSessionForCheckout(session)}
                          className="btn-danger"
                          style={{ fontSize: '0.76rem', padding: '6px 10px' }}
                        >
                          <UserMinus size={14} /> Force Checkout
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* Audit Trail Table */
        <div className="glass-panel table-responsive-container">
          <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-glass)' }}>
                <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Timestamp</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Security Action</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Actor</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Audit Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span className="badge badge-blue">{log.action}</span>
                  </td>
                  <td style={{ padding: '14px 20px', color: '#E2E8F0' }}>
                    {log.actor ? `${log.actor.name} (${log.actor.role})` : 'System'}
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual Checkout Correction Modal */}
      {selectedSessionForCheckout && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="glass-panel" style={{ width: '500px', padding: '28px', background: '#111827' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#F87171', marginBottom: '8px' }}>
              <AlertCircle size={22} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Audited Manual Checkout Correction</h2>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              You are manually terminating the active campus attendance session for <strong>{selectedSessionForCheckout.user.name}</strong>. A mandatory reason must be provided for security compliance.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Reason for Manual Override</label>
              <textarea
                rows={4}
                value={checkoutReason}
                onChange={(e) => setCheckoutReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#FFFFFF',
                  fontSize: '0.85rem'
                }}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setSelectedSessionForCheckout(null)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleForceCheckout} disabled={submittingCheckout} className="btn-danger">
                {submittingCheckout ? 'Closing...' : 'Confirm Force Checkout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
