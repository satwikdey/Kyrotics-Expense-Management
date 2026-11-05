import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchClaims, settleClaim, calculateStats } from '../services/claimService';
import { formatInr, formatIstDate, formatIstDateTime } from '../utils/format';
import KpiCards from '../components/KpiCards';

export default function AdminClaimsSettle() {
  const { userProfile } = useAuth();
  const [claims, setClaims] = useState([]);
  const [allClaims, setAllClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [settleNotes, setSettleNotes] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const fullList = await fetchClaims();
      setAllClaims(fullList);
      const approvedList = fullList.filter((c) => c.status === 'approved');
      setClaims(approvedList);
    } catch (err) {
      console.error('Failed to load claims to settle:', err);
      setError('Failed to load approved claims.');
    } finally {
      setLoading(false);
    }
  };

  const stats = calculateStats(allClaims);

  const handleSettle = async (claim) => {
    const note = settleNotes[claim.id] || '';
    if (!window.confirm(`Mark claim ${claim.reference_code} (${formatInr(claim.amount_paise)}) as Settled / Paid?`)) return;

    setActionLoading((prev) => ({ ...prev, [claim.id]: true }));
    setError('');
    try {
      await settleClaim(claim.id, note, userProfile);
      setMessage(`Claim ${claim.reference_code} marked as Settled.`);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to settle claim.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [claim.id]: false }));
    }
  };

  return (
    <div className="container">
      {/* Top Colorful Gradient KPI Cards */}
      <KpiCards stats={stats} isAdmin={true} />

      {message && (
        <div className="alert alert-success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{message}</span>
          <button type="button" onClick={() => setMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px 0' }}>Reimbursement Settlement Queue</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            Approved claims awaiting bank transfer, UPI payout, or corporate reimbursement
          </p>
        </div>
        <Link to="/admin/claims/history" className="btn btn-secondary btn-sm">
          📊 View Full History
        </Link>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          Loading settlement queue...
        </div>
      ) : claims.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>💳</div>
          <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 6px 0' }}>No Claims Awaiting Settlement</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            All approved claims have been paid and settled.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {claims.map((claim) => (
            <div key={claim.id} className="card" style={{ borderLeft: '5px solid #2563eb', padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <Link to={`/claims/${claim.id}`} style={{ fontWeight: 800, fontSize: '17px', color: 'var(--primary)' }}>
                      {claim.reference_code}
                    </Link>
                    <span className="badge badge-approved">APPROVED (READY TO SETTLE)</span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginTop: '4px' }}>
                    {claim.user_name} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({claim.user_email})</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    📅 {formatIstDate(claim.claim_date)} • 🏷️ {claim.category_name}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatInr(claim.amount_paise)}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Approved by {claim.decided_by_name || 'Admin'}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{ background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '14px' }}>
                <div>
                  <strong>Description:</strong> {claim.description}
                </div>
                {claim.decision_note && (
                  <div style={{ marginTop: '4px', color: '#1e40af' }}>
                    <strong>Approval Note:</strong> "{claim.decision_note}"
                  </div>
                )}
              </div>

              {/* Settle Action Bar */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Settlement reference (e.g. Bank Ref #UTR998822, Paid via UPI)..."
                  value={settleNotes[claim.id] || ''}
                  onChange={(e) => setSettleNotes({ ...settleNotes, [claim.id]: e.target.value })}
                  style={{ flex: '1 1 240px', fontSize: '13px', padding: '9px 12px' }}
                />
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => handleSettle(claim)}
                  disabled={actionLoading[claim.id]}
                  style={{ whiteSpace: 'nowrap', padding: '9px 20px', fontSize: '14px' }}
                >
                  💳 Mark as Settled & Paid
                </button>
              </div>

              <div style={{ textAlign: 'right', marginTop: '10px' }}>
                <Link to={`/claims/${claim.id}`} style={{ fontSize: '13px', fontWeight: 600 }}>
                  View Full Details & Attachments →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

