import React, { useState } from 'react';
import { Users, Search, UserPlus, Shield, ShieldCheck, ShieldAlert, Upload, Check, Trash2, Edit2, X, Plus } from 'lucide-react';
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Add User Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('Password123!');
  const [newRole, setNewRole] = useState<'CARDHOLDER' | 'GARUD' | 'ADMIN'>('CARDHOLDER');
  const [newDepartment, setNewDepartment] = useState('Computer Science');
  const [newIdentifier, setNewIdentifier] = useState('');

  // Bulk Modal State
  const [bulkCsvText, setBulkCsvText] = useState(
`Rohan Gupta,rohan@cardzo.io,Mechanical Engineering,ME-2023-0881,CARDHOLDER
Ananya Sen,ananya@cardzo.io,Data Science & AI,DS-2024-0342,CARDHOLDER
Officer Manoj Kumar,manoj@cardzo.io,Campus Security - Gate Beta,SEC-4091,GARUD`
  );

  const [submitting, setSubmitting] = useState(false);
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.request('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole,
          department: newDepartment,
          identifierNumber: newIdentifier
        })
      });
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewIdentifier('');
      setStatusMessage('User created successfully in database!');
      setTimeout(() => setStatusMessage(null), 4000);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    try {
      await api.request(`/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editingUser.name,
          email: editingUser.email,
          role: editingUser.role,
          department: editingUser.department,
          identifierNumber: editingUser.identifierNumber
        })
      });
      setEditingUser(null);
      setStatusMessage('User details updated successfully!');
      setTimeout(() => setStatusMessage(null), 3000);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${userName}"? This will remove all their credentials and sessions.`)) {
      return;
    }
    try {
      await api.request(`/admin/users/${userId}`, { method: 'DELETE' });
      setStatusMessage(`User "${userName}" was permanently removed.`);
      setTimeout(() => setStatusMessage(null), 3000);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user.');
    }
  };

  const handleBulkImport = async () => {
    setSubmitting(true);
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
      setSubmitting(false);
    }
  };

  return (
    <div className="responsive-page">
      {/* Header and Actions */}
      <div className="responsive-header">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>User & Identity Directory</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
            Full CRUD management of campus cardholders, institutional staff, and authorized Garud gate verifiers.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus size={16} /> Add User
          </button>
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
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px', position: 'relative' }}>
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

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
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
      <div className="glass-panel table-responsive-container">
        <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-glass)' }}>
              <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Cardholder / Name</th>
              <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>ID / Roll Number</th>
              <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Department</th>
              <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Role</th>
              <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Credentials</th>
              <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
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
                    {user.role === 'GARUD' ? '🛡️ GARUD' : user.role === 'ADMIN' ? '👑 ADMIN' : 'CARDHOLDER'}
                  </span>
                </td>
                <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                  {user._count?.credentials || 0} passes
                </td>
                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                    {user.role === 'CARDHOLDER' ? (
                      <button
                        onClick={() => handleRoleChange(user.id, 'GARUD')}
                        title="Promote to Garud Gate Verifier"
                        style={{
                          background: 'rgba(245, 158, 11, 0.15)',
                          border: '1px solid rgba(245, 158, 11, 0.4)',
                          color: '#FBBF24',
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}
                      >
                        Make Garud
                      </button>
                    ) : user.role === 'GARUD' ? (
                      <button
                        onClick={() => handleRoleChange(user.id, 'CARDHOLDER')}
                        title="Revoke Garud Role"
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          color: '#F87171',
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}
                      >
                        Demote
                      </button>
                    ) : null}

                    <button
                      onClick={() => setEditingUser({ ...user })}
                      title="Edit User"
                      className="btn-secondary"
                      style={{ padding: '6px 8px' }}
                    >
                      <Edit2 size={13} />
                    </button>

                    <button
                      onClick={() => handleDeleteUser(user.id, user.name)}
                      title="Delete User"
                      className="btn-danger"
                      style={{ padding: '6px 8px' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
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
          <div className="glass-panel" style={{ width: '480px', padding: '28px', background: '#111827', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Enroll New User</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Maya Krishnan"
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', color: '#FFFFFF' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Institutional Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. maya@cardzo.io"
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', color: '#FFFFFF' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Role</label>
                  <select
                    value={newRole}
                    onChange={(e: any) => setNewRole(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', color: '#FFFFFF' }}
                  >
                    <option value="CARDHOLDER" style={{ background: '#111827' }}>Cardholder</option>
                    <option value="GARUD" style={{ background: '#111827' }}>Garud Verifier</option>
                    <option value="ADMIN" style={{ background: '#111827' }}>Admin</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Roll / ID Number</label>
                  <input
                    type="text"
                    value={newIdentifier}
                    onChange={(e) => setNewIdentifier(e.target.value)}
                    placeholder="e.g. CS-2026-901"
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', color: '#FFFFFF' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Department</label>
                <input
                  type="text"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  placeholder="e.g. Computer Science"
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', color: '#FFFFFF' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Initial Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', color: '#FFFFFF' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Creating...' : 'Enroll User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
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
          <div className="glass-panel" style={{ width: '480px', padding: '28px', background: '#111827', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Edit User Details</h2>
              <button onClick={() => setEditingUser(null)} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Full Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', color: '#FFFFFF' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Email</label>
                <input
                  type="email"
                  required
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', color: '#FFFFFF' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Role</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', color: '#FFFFFF' }}
                  >
                    <option value="CARDHOLDER" style={{ background: '#111827' }}>Cardholder</option>
                    <option value="GARUD" style={{ background: '#111827' }}>Garud Verifier</option>
                    <option value="ADMIN" style={{ background: '#111827' }}>Admin</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Roll / ID</label>
                  <input
                    type="text"
                    value={editingUser.identifierNumber || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, identifierNumber: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', color: '#FFFFFF' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Department</label>
                <input
                  type="text"
                  value={editingUser.department || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', color: '#FFFFFF' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setEditingUser(null)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              <button onClick={handleBulkImport} disabled={submitting} className="btn-primary">
                {submitting ? 'Importing...' : 'Confirm & Enroll Users'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
