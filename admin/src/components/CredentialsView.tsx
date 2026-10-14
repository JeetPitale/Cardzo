import React, { useState } from 'react';
import { CreditCard, Plus, ShieldCheck, Camera, AlertTriangle, CheckCircle, Ban, Trash2, X } from 'lucide-react';
import { Credential, User } from '../types';
import { api } from '../api';

interface CredentialsViewProps {
  credentials: Credential[];
  users: User[];
  onRefresh: () => void;
}

export const CredentialsView: React.FC<CredentialsViewProps> = ({ credentials, users, onRefresh }) => {
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [targetUserId, setTargetUserId] = useState(users[0]?.id || '');
  const [cardTitle, setCardTitle] = useState('Apex Faculty & Researcher Pass');
  const [cardType, setCardType] = useState('COLLEGE_ID');
  const [colorTheme, setColorTheme] = useState('indigo');
  const [issuerName, setIssuerName] = useState('Apex University Academic Council');
  const [submitting, setSubmitting] = useState(false);

  const handleIssueCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.request('/admin/credentials/issue', {
        method: 'POST',
        body: JSON.stringify({
          userId: targetUserId || users[0]?.id,
          title: cardTitle,
          type: cardType,
          issuerName,
          colorTheme,
          expiresAt: '2028-12-31'
        })
      });
      setShowIssueModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to issue credential.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (credId: string, status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED') => {
    try {
      await api.request(`/admin/credentials/${credId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update credential status.');
    }
  };

  const handleDeleteCredential = async (credId: string, title: string) => {
    if (!window.confirm(`Permanently delete pass "${title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await api.request(`/admin/credentials/${credId}`, {
        method: 'DELETE'
      });
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete credential.');
    }
  };

  return (
    <div className="responsive-page">
      <div className="responsive-header">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Credential Lifecycle Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
            Issue university-verified passes, revoke compromised identities, and audit active wallet passes.
          </p>
        </div>

        <button onClick={() => setShowIssueModal(true)} className="btn-primary">
          <Plus size={16} /> Issue Digital Pass
        </button>
      </div>

      {/* Grid of Credentials */}
      {credentials.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <CreditCard size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
          <p style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>No credentials found in database</p>
          <p style={{ fontSize: '0.85rem', marginBottom: '16px' }}>Issue a new official pass to get started.</p>
          <button onClick={() => setShowIssueModal(true)} className="btn-primary" style={{ margin: '0 auto' }}>
            <Plus size={16} /> Issue First Pass
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {credentials.map((cred) => {
            const isVerified = cred.isVerified;

            return (
              <div
                key={cred.id}
                className="glass-panel"
                style={{
                  padding: '20px',
                  position: 'relative',
                  overflow: 'hidden',
                  background: cred.status === 'REVOKED'
                    ? 'rgba(239, 68, 68, 0.05)'
                    : cred.colorTheme === 'emerald'
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(18, 24, 38, 0.8) 100%)'
                    : cred.colorTheme === 'purple'
                    ? 'linear-gradient(135deg, rgba(191, 90, 242, 0.12) 0%, rgba(18, 24, 38, 0.8) 100%)'
                    : 'linear-gradient(135deg, rgba(10, 132, 255, 0.12) 0%, rgba(18, 24, 38, 0.8) 100%)',
                  border: cred.status === 'REVOKED' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-glass)'
                }}
              >
                {/* Header Badges */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  {isVerified ? (
                    <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck size={14} /> ISSUER VERIFIED
                    </span>
                  ) : (
                    <span className="badge badge-neutral" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Camera size={14} /> SCANNED PHYSICAL COPY
                    </span>
                  )}

                  <span className={`badge ${
                    cred.status === 'ACTIVE' ? 'badge-blue' : cred.status === 'SUSPENDED' ? 'badge-warning' : 'badge-danger'
                  }`}>
                    {cred.status}
                  </span>
                </div>

                {/* Realistic Pass Preview Card */}
                <div style={{
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  background: isVerified ? 'linear-gradient(135deg, #1E3A8A 0%, #172554 100%)' : '#1E293B',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  marginBottom: '16px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#93C5FD' }}>
                      {cred.issuerName}
                    </span>
                    <CreditCard size={18} color="#93C5FD" />
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px' }}>{cred.title}</div>
                  <div style={{ fontSize: '0.85rem', color: '#E2E8F0' }}>{cred.cardholderName}</div>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#94A3B8', marginTop: '8px' }}>
                    ID: {cred.identifier || 'CRDZ-PASS'}
                  </div>
                </div>

                {/* Meta & Expiry */}
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  Category: <strong>{cred.category}</strong> • Valid until: {cred.expiresAt ? new Date(cred.expiresAt).toLocaleDateString() : 'Permanent'}
                </div>

                {/* Status Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-glass)', paddingTop: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {cred.status !== 'ACTIVE' && (
                    <button onClick={() => handleStatusChange(cred.id, 'ACTIVE')} className="btn-secondary" style={{ fontSize: '0.76rem', padding: '6px 10px', color: '#34D399' }}>
                      <CheckCircle size={14} /> Re-activate
                    </button>
                  )}
                  {cred.status === 'ACTIVE' && (
                    <button onClick={() => handleStatusChange(cred.id, 'SUSPENDED')} className="btn-secondary" style={{ fontSize: '0.76rem', padding: '6px 10px', color: '#FBBF24' }}>
                      <AlertTriangle size={14} /> Suspend
                    </button>
                  )}
                  {cred.status !== 'REVOKED' && (
                    <button onClick={() => handleStatusChange(cred.id, 'REVOKED')} className="btn-danger" style={{ fontSize: '0.76rem', padding: '6px 10px' }}>
                      <Ban size={14} /> Revoke
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteCredential(cred.id, cred.title)}
                    title="Delete Pass"
                    className="btn-danger"
                    style={{ fontSize: '0.76rem', padding: '6px 10px', marginLeft: 'auto' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Issue Modal */}
      {showIssueModal && (
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Issue Official Institutional Pass</h2>
              <button onClick={() => setShowIssueModal(false)} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              Create an issuer-verified digital credential directly in the cardholder's wallet.
            </p>

            <form onSubmit={handleIssueCredential}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Select Cardholder</label>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', color: '#FFFFFF' }}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id} style={{ background: '#111827' }}>
                      {u.name} ({u.email}) - {u.department || 'Campus'}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Pass Title</label>
                <input
                  type="text"
                  value={cardTitle}
                  onChange={(e) => setCardTitle(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', color: '#FFFFFF' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Issuer Authority</label>
                <input
                  type="text"
                  value={issuerName}
                  onChange={(e) => setIssuerName(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', color: '#FFFFFF' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Pass Category</label>
                  <select
                    value={cardType}
                    onChange={(e) => setCardType(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', color: '#FFFFFF' }}
                  >
                    <option value="COLLEGE_ID" style={{ background: '#111827' }}>University ID</option>
                    <option value="EMPLOYEE_ID" style={{ background: '#111827' }}>Faculty / Staff</option>
                    <option value="MEMBERSHIP" style={{ background: '#111827' }}>Lab / Facility Pass</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Card Style Theme</label>
                  <select
                    value={colorTheme}
                    onChange={(e) => setColorTheme(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', color: '#FFFFFF' }}
                  >
                    <option value="blue" style={{ background: '#111827' }}>Apex Cobalt Blue</option>
                    <option value="indigo" style={{ background: '#111827' }}>Imperial Indigo</option>
                    <option value="emerald" style={{ background: '#111827' }}>Emerald Green</option>
                    <option value="purple" style={{ background: '#111827' }}>Neon Violet</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowIssueModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Issuing...' : 'Issue Credential'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
