import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchClaims, calculateStats } from '../services/claimService';
import { formatInr, formatIstDate } from '../utils/format';
import KpiCards from '../components/KpiCards';
import FilterTabs from '../components/FilterTabs';

export default function ClaimStatus() {
  const { userProfile } = useAuth();
  const location = useLocation();

  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [notification, setNotification] = useState(
    location.state?.submitted ? 'Claim submitted successfully! It is now pending administrator review.' : ''
  );

  useEffect(() => {
    loadClaims();
  }, [userProfile]);

  const loadClaims = async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      // Pass null for status to get all for stats calculation, then filter on client
      const list = await fetchClaims(null, userProfile.uid);
      setClaims(list);
    } catch (err) {
      console.error('Failed to load employee claims:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats = calculateStats(claims);

  const filteredClaims = claims.filter((claim) => {
    if (filterStatus === 'all') return true;
    return claim.status === filterStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-pending">Pending Review</span>;
      case 'approved':
        return <span className="badge badge-approved">Approved</span>;
      case 'settled':
        return <span className="badge badge-settled">Settled</span>;
      case 'rejected':
        return <span className="badge badge-rejected">Rejected</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  return (
    <div className="container">
      {notification && (
        <div className="alert alert-success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{notification}</span>
          <button
            type="button"
            onClick={() => setNotification('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px 0' }}>My Expense Claims</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            Track decision status and settlement for all your submitted claims
          </p>
        </div>
        <Link to="/claims/create" className="btn btn-primary btn-sm">
          ➕ Submit New Claim
        </Link>
      </div>

      {/* Colorful Gradient KPI Cards */}
      <KpiCards stats={stats} isAdmin={false} />

      {/* Filter Tabs */}
      <FilterTabs
        activeFilter={filterStatus}
        onSelect={setFilterStatus}
        counts={{
          total: claims.length,
          pending: stats.pending,
          approved: stats.approved,
          settled: stats.settled,
          rejected: stats.rejected,
        }}
      />

      {/* Claims List */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          Loading your claims...
        </div>
      ) : filteredClaims.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ fontSize: '16px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
            No expense claims found for the selected status.
          </p>
          <Link to="/claims/create" className="btn btn-primary btn-sm">
            Submit Your First Claim
          </Link>
        </div>
      ) : (
        <div>
          {filteredClaims.map((claim) => (
            <Link
              key={claim.id}
              to={`/claims/${claim.id}`}
              className={`claim-card claim-card-${claim.status}`}
            >
              <div className="claim-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="claim-card-ref">{claim.reference_code}</span>
                  {getStatusBadge(claim.status)}
                </div>
                <div className="claim-card-amount">{formatInr(claim.amount_paise)}</div>
              </div>

              <div style={{ fontWeight: 600, fontSize: '14px', margin: '4px 0' }}>
                {claim.description}
              </div>

              <div className="claim-card-meta">
                <span>
                  📅 {formatIstDate(claim.claim_date)} • 🏷️ {claim.category_name}
                </span>
                <span>
                  {claim.attachments && claim.attachments.length > 0 ? (
                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                      📎 {claim.attachments.length} bill(s)
                    </span>
                  ) : (
                    <span style={{ color: 'var(--warning-text)', fontWeight: 600 }}>
                      ⚠️ No bill
                    </span>
                  )}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

