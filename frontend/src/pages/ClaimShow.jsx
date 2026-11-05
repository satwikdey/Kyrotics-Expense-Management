import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchClaimById, approveClaim, rejectClaim, settleClaim } from '../services/claimService';
import { formatInr, formatIstDate, formatIstDateTime } from '../utils/format';

export default function ClaimShow() {
  const { id } = useParams();
  const { userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [settlementNote, setSettlementNote] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadClaim();
  }, [id]);

  const loadClaim = async () => {
    setLoading(true);
    try {
      const data = await fetchClaimById(id);
      setClaim(data);
    } catch (err) {
      console.error('Failed to load claim:', err);
      setError('Expense claim not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm(`Approve claim ${claim.reference_code} for ${formatInr(claim.amount_paise)}?`)) return;
    setActionLoading(true);
    setError('');
    try {
      const updated = await approveClaim(claim.id, approvalNote, userProfile);
      setClaim(updated);
      setMessage('Claim approved successfully. It is now ready for settlement.');
    } catch (err) {
      setError(err.message || 'Failed to approve claim.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      return setError('Rejection reason is required.');
    }
    if (!window.confirm(`Reject claim ${claim.reference_code}? Note: Rejected claims are automatically closed with 0 payout.`)) return;
    setActionLoading(true);
    setError('');
    try {
      const updated = await rejectClaim(claim.id, rejectionReason, userProfile);
      setClaim(updated);
      setMessage('Claim rejected and automatically closed with zero reimbursement.');
    } catch (err) {
      setError(err.message || 'Failed to reject claim.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSettle = async () => {
    if (!window.confirm(`Mark claim ${claim.reference_code} as Settled / Paid?`)) return;
    setActionLoading(true);
    setError('');
    try {
      const updated = await settleClaim(claim.id, settlementNote, userProfile);
      setClaim(updated);
      setMessage('Claim marked as settled and closed.');
    } catch (err) {
      setError(err.message || 'Failed to settle claim.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-pending">Pending Review</span>;
      case 'approved':
        return <span className="badge badge-approved">Approved (Awaiting Settlement)</span>;
      case 'settled':
        return <span className="badge badge-settled">Settled / Closed</span>;
      case 'rejected':
        return <span className="badge badge-rejected">Rejected / Auto-Settled</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          Loading claim details...
        </div>
      </div>
    );
  }

  if (error && !claim) {
    return (
      <div className="container">
        <div className="alert alert-danger">{error}</div>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Back button */}
      <div style={{ marginBottom: '14px' }}>
        <button
          onClick={() => navigate(-1)}
          className="btn btn-secondary btn-sm"
          style={{ padding: '4px 10px', fontSize: '13px' }}
        >
          ← Back
        </button>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        {/* Header */}
        <div className="card-header">
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Reference Code
            </span>
            <h1 className="card-title" style={{ fontSize: '20px', color: 'var(--primary)' }}>
              {claim.reference_code}
            </h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)' }}>
              {formatInr(claim.amount_paise)}
            </div>
            <div style={{ marginTop: '4px' }}>{getStatusBadge(claim.status)}</div>
          </div>
        </div>

        {/* Claim Details */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>EMPLOYEE</div>
            <div style={{ fontSize: '15px', fontWeight: 600 }}>{claim.user_name}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{claim.user_email}</div>
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>CATEGORY</div>
            <div style={{ fontSize: '15px', fontWeight: 600 }}>{claim.category_name}</div>
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>EXPENSE DATE</div>
            <div style={{ fontSize: '15px', fontWeight: 600 }}>{formatIstDate(claim.claim_date)}</div>
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>SUBMITTED AT</div>
            <div style={{ fontSize: '15px', fontWeight: 600 }}>{formatIstDateTime(claim.submitted_at)}</div>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '20px', background: 'var(--bg-subtle)', padding: '14px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
            PURPOSE / DESCRIPTION
          </div>
          <div style={{ fontSize: '15px', color: 'var(--text-main)' }}>{claim.description}</div>
        </div>

        {/* Missing Bill Reason */}
        {claim.missing_bill_explanation && (
          <div style={{ marginBottom: '20px', background: '#fffbeb', border: '1px solid #fde68a', padding: '14px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>
              ⚠️ MISSING BILL EXPLANATION
            </div>
            <div style={{ fontSize: '14px', color: '#78350f' }}>{claim.missing_bill_explanation}</div>
          </div>
        )}

        {/* Attachments */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
            Attached Receipts ({claim.attachments ? claim.attachments.length : 0})
          </div>
          {claim.attachments && claim.attachments.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {claim.attachments.map((att, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#ffffff',
                    border: '1px solid var(--border-color)',
                    padding: '8px 14px',
                    borderRadius: '8px',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>
                    📄 {att.name || `Receipt_${idx + 1}`}
                  </span>
                  {att.url && (
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      Download / View ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No receipts attached to this claim.
            </div>
          )}
        </div>

        {/* Decision & Settlement Information */}
        {(claim.decided_at || claim.settled_at) && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', marginTop: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Audit & Decision Log</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              {claim.decided_at && (
                <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                    DECISION ({claim.status.toUpperCase()})
                  </div>
                  <div style={{ fontSize: '14px', marginTop: '4px' }}>
                    <strong>By:</strong> {claim.decided_by_name || 'Admin'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {formatIstDateTime(claim.decided_at)}
                  </div>
                  {claim.decision_note && (
                    <div style={{ fontSize: '13px', marginTop: '6px', fontStyle: 'italic' }}>
                      "{claim.decision_note}"
                    </div>
                  )}
                </div>
              )}

              {claim.settled_at && (
                <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                    SETTLEMENT STATUS
                  </div>
                  <div style={{ fontSize: '14px', marginTop: '4px' }}>
                    <strong>By:</strong> {claim.settled_by_name || 'System / Admin'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {formatIstDateTime(claim.settled_at)}
                  </div>
                  {claim.settlement_note && (
                    <div style={{ fontSize: '13px', marginTop: '6px', fontStyle: 'italic' }}>
                      "{claim.settlement_note}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Admin Action Box */}
      {isAdmin && claim.status === 'pending' && (
        <div className="card" style={{ border: '2px solid #bfdbfe' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', color: '#1e3a8a' }}>
            Admin Review & Approval Decision
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {/* Approve Action */}
            <div style={{ background: '#f0fdf4', padding: '14px', borderRadius: '8px', border: '1px solid #86efac' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#166534', margin: '0 0 8px 0' }}>
                Approve Claim
              </h3>
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Optional approval note..."
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn btn-success btn-block"
                onClick={handleApprove}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : '✓ Approve Claim'}
              </button>
            </div>

            {/* Reject Action */}
            <div style={{ background: '#fef2f2', padding: '14px', borderRadius: '8px', border: '1px solid #fca5a5' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#991b1b', margin: '0 0 8px 0' }}>
                Reject Claim (Auto-Settles to 0)
              </h3>
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Reason for rejection (required)..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                />
              </div>
              <button
                type="button"
                className="btn btn-danger btn-block"
                onClick={handleReject}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : '✕ Reject Claim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Settle Action */}
      {isAdmin && claim.status === 'approved' && (
        <div className="card" style={{ border: '2px solid #86efac', background: '#f0fdf4' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: '#166534' }}>
            Process Reimbursement Settlement
          </h2>
          <p style={{ fontSize: '13px', color: '#14532d', margin: '0 0 12px 0' }}>
            Once bank transfer or UPI reimbursement is completed, mark this approved claim as Settled.
          </p>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Settlement reference (e.g. Bank Ref #UTR123456, Paid via UPI)..."
              value={settlementNote}
              onChange={(e) => setSettlementNote(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn btn-success"
            onClick={handleSettle}
            disabled={actionLoading}
            style={{ width: '100%', maxWidth: '280px' }}
          >
            {actionLoading ? 'Settling...' : '💳 Mark as Settled & Paid'}
          </button>
        </div>
      )}
    </div>
  );
}

