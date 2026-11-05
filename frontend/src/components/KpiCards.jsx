import React from 'react';
import { Link } from 'react-router-dom';
import { formatInr } from '../utils/format';

export default function KpiCards({ stats = {}, isAdmin = false }) {
  const pendingCount = stats.pending || 0;
  const pendingAmount = stats.pendingAmount || 0;

  const approvedCount = stats.approved || 0;
  const approvedAmount = stats.approvedAmount || 0;

  const settledCount = stats.settled || 0;
  const settledAmount = stats.settledAmount || 0;

  const rejectedCount = stats.rejected || 0;
  const rejectedAmount = stats.rejectedAmount || 0;

  return (
    <div className="kpi-grid">
      {/* 1. Pending Review */}
      <div className="kpi-card kpi-card-pending">
        <div className="kpi-card-header">
          <span className="kpi-label">Pending Review</span>
          <span className="kpi-icon-badge" title="Awaiting Decision">⏳</span>
        </div>
        <div className="kpi-value">{pendingCount}</div>
        <div className="kpi-sub">
          <span>{formatInr(pendingAmount)}</span>
          <span>• Requires decision</span>
        </div>
      </div>

      {/* 2. Ready to Settle / Approved */}
      <div className="kpi-card kpi-card-approved">
        <div className="kpi-card-header">
          <span className="kpi-label">Ready to Settle</span>
          <span className="kpi-icon-badge" title="Approved">💳</span>
        </div>
        <div className="kpi-value">{approvedCount}</div>
        <div className="kpi-sub">
          <span>{formatInr(approvedAmount)}</span>
          {isAdmin ? (
            <Link to="/admin/claims/settle" className="kpi-action-pill">
              Go to Settlement →
            </Link>
          ) : (
            <span>• Approved, awaiting payout</span>
          )}
        </div>
      </div>

      {/* 3. Settled / Closed */}
      <div className="kpi-card kpi-card-settled">
        <div className="kpi-card-header">
          <span className="kpi-label">Settled / Closed</span>
          <span className="kpi-icon-badge" title="Settled">✅</span>
        </div>
        <div className="kpi-value">{settledCount}</div>
        <div className="kpi-sub">
          <span>{formatInr(settledAmount)}</span>
          <span>• Reimbursed</span>
        </div>
      </div>

      {/* 4. Rejected */}
      <div className="kpi-card kpi-card-rejected">
        <div className="kpi-card-header">
          <span className="kpi-label">Rejected</span>
          <span className="kpi-icon-badge" title="Rejected">❌</span>
        </div>
        <div className="kpi-value">{rejectedCount}</div>
        <div className="kpi-sub">
          <span>{formatInr(rejectedAmount)}</span>
          <span>• Closed (0 reimbursement)</span>
        </div>
      </div>
    </div>
  );
}

