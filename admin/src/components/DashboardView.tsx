import React from 'react';
import { Users, Shield, UserCheck, CreditCard, Activity, ArrowUpRight, Zap, CheckCircle2, Clock } from 'lucide-react';
import { AttendanceSession, AuditLog } from '../types';

interface DashboardViewProps {
  metrics: {
    totalCardholders: number;
    totalVerifiers: number;
    currentlyCheckedIn: number;
    issuedCredentials: number;
    todayTransitions: number;
  };
  recentSessions: AttendanceSession[];
  recentAudits: AuditLog[];
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  recentSessions,
  recentAudits,
  onNavigate
}) => {
  return (
    <div style={{ padding: '0 24px 32px' }}>
      {/* Hero Welcome & Tagline */}
      <div className="glass-panel" style={{
        padding: '24px 32px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, rgba(10, 132, 255, 0.12) 0%, rgba(94, 92, 230, 0.08) 100%)',
        border: '1px solid rgba(10, 132, 255, 0.25)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Institutional Command Center</h1>
            <span className="badge badge-success">● SYSTEM ONLINE</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '650px', lineHeight: 1.5 }}>
            <strong>Cardzo</strong> empowers campus security and registrars with single-device verified identity, original-look digital wallets, and zero-trust Garud QR verification.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => onNavigate('garud-scanner')} className="btn-primary">
            <Shield size={18} />
            Open Garud Scanner
          </button>
          <button onClick={() => onNavigate('mobile-wallet')} className="btn-secondary">
            Student Wallet Demo
          </button>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        {/* Metric 1 */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Active Cardholders</span>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(10, 132, 255, 0.15)', color: 'var(--cardzo-blue)' }}>
              <Users size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{metrics.totalCardholders}</div>
          <div style={{ fontSize: '0.78rem', color: '#34D399', marginTop: '6px' }}>Enrolled students & staff</div>
        </div>

        {/* Metric 2 */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Currently On Campus</span>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#34D399' }}>
              <UserCheck size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34D399' }}>{metrics.currentlyCheckedIn}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px' }}>Active Checked In sessions</div>
        </div>

        {/* Metric 3 */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Garud Verifiers</span>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24' }}>
              <Shield size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{metrics.totalVerifiers}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px' }}>Gate operators & security</div>
        </div>

        {/* Metric 4 */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Digital Credentials</span>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(191, 90, 242, 0.15)', color: 'var(--cardzo-purple)' }}>
              <CreditCard size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{metrics.issuedCredentials}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px' }}>Stored passes & IDs</div>
        </div>

        {/* Metric 5 */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Turnstile Events Today</span>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(94, 92, 230, 0.15)', color: 'var(--cardzo-indigo)' }}>
              <Activity size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{metrics.todayTransitions}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px' }}>Atomic state transitions</div>
        </div>
      </div>

      {/* Main Grid: Live Gate Stream & System Architecture */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
        {/* Left Column: Live Campus Attendance Stream */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Live Gate Activity Stream</h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Instant atomic transitions verified by Garud staff</p>
            </div>
            <button onClick={() => onNavigate('attendance')} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
              View All <ArrowUpRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentSessions.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No attendance sessions recorded yet today. Use the Garud Scanner or Student Wallet to test!
              </div>
            ) : (
              recentSessions.slice(0, 6).map((session) => (
                <div
                  key={session.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-glass)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'var(--cardzo-gradient)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.9rem'
                    }}>
                      {session.user.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{session.user.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {session.user.identifierNumber || 'Student'} • {session.user.department || 'General'}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge ${session.status === 'CHECKED_IN' ? 'badge-success' : 'badge-neutral'}`}>
                      {session.status === 'CHECKED_IN' ? '● CHECKED IN' : '✓ CHECKED OUT'}
                    </span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {new Date(session.checkInTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {session.location ? ` • ${session.location}` : ''}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Security Architecture & Real-Time Guarantees */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Cardzo Security Model */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} color="var(--cardzo-blue)" />
              Security & Trust Guarantees
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#60A5FA' }}>
                  <Zap size={14} /> Single-Device Session Enforcement
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Logging in on a second device immediately invalidates all previous sessions. Replay tokens rejected atomically.
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#34D399' }}>
                  <Clock size={14} /> 45s Cryptographic Dynamic QR
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Short-lived, single-use SHA256 hashed tokens bound to the active session. Consumed upon scan to eliminate replay.
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#BF5AF2' }}>
                  <CheckCircle2 size={14} /> Strict Attendance State Machine
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Strict Checked Out ↔ Checked In states. Only 1 active session per cardholder. Duplicate check-ins blocked.
                </div>
              </div>
            </div>
          </div>

          {/* Recent Audit Trail Preview */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Security Audit Ledger</h2>
              <button onClick={() => onNavigate('attendance')} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                Full Log
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentAudits.slice(0, 4).map((log) => (
                <div key={log.id} style={{ fontSize: '0.78rem', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.action}</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '3px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {log.details}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
