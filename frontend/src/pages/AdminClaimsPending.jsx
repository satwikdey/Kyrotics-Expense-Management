import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchClaims, approveClaim, rejectClaim, calculateStats } from '../services/claimService';
import { formatInr, formatIstDate } from '../utils/format';
import KpiCards from '../components/KpiCards';

export default function AdminClaimsPending({ companyName = 'Kyrotics' }) {
  const { userProfile } = useAuth();
  const [claims, setClaims] = useState([]);
  const [allClaims, setAllClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [notes, setNotes] = useState({});
  const [reasons, setReasons] = useState({});
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
      const pendingList = fullList.filter((c) => c.status === 'pending');
      setClaims(pendingList);
    } catch (err) {
      console.error('Failed to load pending claims:', err);
      setError('Failed to load claims.');
    } finally {
      setLoading(false);
    }
  };

  const stats = calculateStats(allClaims);

  const handleApprove = async (claim) => {
    const note = notes[claim.id] || '';
    if (!window.confirm(`Approve claim ${claim.reference_code} for ${formatInr(claim.amount_paise)}?`)) return;

    setActionLoading((prev) => ({ ...prev, [claim.id]: true }));
    setError('');
    try {
      await approveClaim(claim.id, note, userProfile);
      setMessage(`Claim ${claim.reference_code} approved successfully.`);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to approve claim.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [claim.id]: false }));
    }
  };

  const handleReject = async (claim) => {
    const reason = reasons[claim.id] || '';
    if (!reason.trim()) {
      alert('Please enter a rejection reason before rejecting the claim.');
      return;
    }

    if (!window.confirm(`Reject claim ${claim.reference_code}? Rejected claims are automatically closed with zero reimbursement.`)) return;

    setActionLoading((prev) => ({ ...prev, [claim.id]: true }));
    setError('');
    try {
      await rejectClaim(claim.id, reason, userProfile);
      setMessage(`Claim ${claim.reference_code} rejected and auto-settled.`);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to reject claim.');
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
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px 0' }}>Claims Awaiting Decision</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            Review employee claims, approve valid expenses, or reject with reason
          </p>
        </div>
        <Link to="/admin/claims/history" className="btn btn-secondary btn-sm">
          📊 View Full History
        </Link>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          Loading pending review queue...
        </div>
      ) : claims.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎉</div>
          <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 6px 0' }}>All Caught Up!</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            There are currently no expense claims awaiting administrator review.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {claims.map((claim) => (
            <div key={claim.id} className="card" style={{ borderLeft: '5px solid #f59e0b', padding: '18px 20px' }}>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <Link to={`/claims/${claim.id}`} style={{ fontWeight: 800, fontSize: '17px', color: 'var(--primary)' }}>
                      {claim.reference_code}
                    </Link>
                    <span className="badge badge-pending">PENDING REVIEW</span>
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
                  <div style={{ marginTop: '2px' }}>
                    {claim.attachments && claim.attachments.length > 0 ? (
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)' }}>
                        📎 {claim.attachments.length} bill(s) attached
                      </span>
                    ) : (
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#b45309' }}>
                        ⚠️ No bill
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Purpose / Missing Bill box */}
              <div style={{ background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
                <div>
                  <strong>Description:</strong> {claim.description}
                </div>
                {claim.missing_bill_explanation && (
                  <div style={{ marginTop: '4px', color: '#b45309' }}>
                    <strong>Missing Bill Note:</strong> {claim.missing_bill_explanation}
                  </div>
                )}
              </div>

              {/* Inline Action Form Row (matching screenshot!) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', alignItems: 'center' }}>
                {/* Approve Block */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Optional approval note..."
                    value={notes[claim.id] || ''}
                    onChange={(e) => setNotes({ ...notes, [claim.id]: e.target.value })}
                    style={{ fontSize: '13px', padding: '8px 12px' }}
                  />
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={() => handleApprove(claim)}
                    disabled={actionLoading[claim.id]}
                    style={{ whiteSpace: 'nowrap', padding: '8px 16px', fontSize: '14px' }}
                  >
                    ✓ Approve
                  </button>
                </div>

                {/* Reject Block */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Rejection reason (required)..."
                    value={reasons[claim.id] || ''}
                    onChange={(e) => setReasons({ ...reasons, [claim.id]: e.target.value })}
                    style={{ fontSize: '13px', padding: '8px 12px' }}
                  />
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleReject(claim)}
                    disabled={actionLoading[claim.id]}
                    style={{ whiteSpace: 'nowrap', padding: '8px 16px', fontSize: '14px' }}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>

              {/* View full details link */}
              <div style={{ textAlign: 'right', marginTop: '12px' }}>
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

