import React, { useState } from 'react';
import { Users, Search, UserPlus, Shield, ShieldCheck, ShieldAlert, Upload, Check } from 'lucide-react';
import { User } from '../types';
import { api } from '../api';

interface UsersViewProps {
  users: User[];
  onRefresh: () => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ users, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState(
`Rohan Gupta,rohan@cardzo.io,Mechanical Engineering,ME-2023-0881,CARDHOLDER
Ananya Sen,ananya@cardzo.io,Data Science & AI,DS-2024-0342,CARDHOLDER
Officer Manoj Kumar,manoj@cardzo.io,Campus Security - Gate Beta,SEC-4091,GARUD`
  );
  const [importing, setImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.identifierNumber && u.identifierNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.request(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole })
      });
      setStatusMessage(`User role successfully updated to ${newRole}`);
      setTimeout(() => setStatusMessage(null), 3000);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update role.');
    }
  };

  const handleBulkImport = async () => {
    setImporting(true);
    try {
      const lines = bulkCsvText.trim().split('\n');
      const parsedUsers = lines.map((line) => {
        const [name, email, department, identifierNumber, role] = line.split(',').map((s) => s?.trim());
        return { name, email, department, identifierNumber, role: role || 'CARDHOLDER' };
      }).filter((u) => u.name && u.email);

      const res = await api.request('/admin/users/bulk-import', {
        method: 'POST',
        body: JSON.stringify({ users: parsedUsers })
      });

      setStatusMessage(`Imported ${res.createdCount} users successfully!`);
      setTimeout(() => setStatusMessage(null), 4000);
      setShowBulkModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to import roster.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ padding: '0 24px 32px' }}>
      {/* Header and Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>User & Identity Directory</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
            Manage campus cardholders, institutional staff, and authorized Garud gate verifiers.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setShowBulkModal(true)} className="btn-secondary">
            <Upload size={16} /> Bulk Roster CSV Import
          </button>
        </div>
      </div>

      {statusMessage && (
        <div style={{
          padding: '12px 18px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: 'var(--radius-md)',
          color: '#34D399',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.88rem'
        }}>
          <Check size={16} /> {statusMessage}
        </div>
      )}

      {/* Filters Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by student name, roll number, or institutional email..."
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
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Role:</span>
          {['ALL', 'CARDHOLDER', 'GARUD', 'ADMIN'].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              style={{
                background: roleFilter === role ? 'rgba(10, 132, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                border: roleFilter === role ? '1px solid rgba(10, 132, 255, 0.5)' : '1px solid var(--border-glass)',
                color: roleFilter === role ? '#60A5FA' : 'var(--text-secondary)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-glass)' }}>
              <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Cardholder / Name</th>
              <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>ID / Roll Number</th>
              <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Department</th>
              <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Role & Permissions</th>
              <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Credentials</th>
              <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>Role Assignment</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid var(--border-glass)', transition: 'background 0.2s' }}>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'var(--cardzo-gradient)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.9rem'
                    }}>
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{user.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{user.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px 20px', fontFamily: 'monospace', color: '#60A5FA' }}>
                  {user.identifierNumber || '—'}
                </td>
                <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                  {user.department || 'General Campus'}
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <span className={`badge ${user.role === 'ADMIN' ? 'badge-blue' : user.role === 'GARUD' ? 'badge-warning' : 'badge-neutral'}`}>
                    {user.role === 'GARUD' ? '🛡️ GARUD VERIFIER' : user.role === 'ADMIN' ? '👑 ADMIN' : 'CARDHOLDER'}
                  </span>
                </td>
                <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                  {user._count?.credentials || 0} passes
                </td>
                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                  {user.role === 'CARDHOLDER' ? (
                    <button
                      onClick={() => handleRoleChange(user.id, 'GARUD')}
                      style={{
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        color: '#FBBF24',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <ShieldCheck size={14} /> Promote to Garud
                    </button>
                  ) : user.role === 'GARUD' ? (
                    <button
                      onClick={() => handleRoleChange(user.id, 'CARDHOLDER')}
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#F87171',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <ShieldAlert size={14} /> Revoke Verifier
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Institutional Admin</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk Import Modal */}
      {showBulkModal && (
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
          <div className="glass-panel" style={{ width: '560px', padding: '28px', background: '#111827', border: '1px solid var(--border-glass)' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>Bulk User Roster Import</h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Paste CSV records in the format: <code>Name, Email, Department, StudentID, Role</code>
            </p>

            <textarea
              rows={8}
              value={bulkCsvText}
              onChange={(e) => setBulkCsvText(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                marginBottom: '20px'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowBulkModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleBulkImport} disabled={importing} className="btn-primary">
                {importing ? 'Importing...' : 'Confirm & Enroll Users'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
