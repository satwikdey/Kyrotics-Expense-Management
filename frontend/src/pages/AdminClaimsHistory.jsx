import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchClaims, exportClaimsToCsv, calculateStats } from '../services/claimService';
import { formatInr, formatIstDate } from '../utils/format';
import KpiCards from '../components/KpiCards';
import FilterTabs from '../components/FilterTabs';

export default function AdminClaimsHistory({ companyName = 'Kyrotics' }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    setLoading(true);
    try {
      const list = await fetchClaims();
      setClaims(list);
    } catch (err) {
      console.error('Failed to load claims history:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats = calculateStats(claims);

  const filteredClaims = claims.filter((claim) => {
    if (filterStatus !== 'all' && claim.status !== filterStatus) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchRef = claim.reference_code?.toLowerCase().includes(term);
      const matchName = claim.user_name?.toLowerCase().includes(term);
      const matchDesc = claim.description?.toLowerCase().includes(term);
      const matchCat = claim.category_name?.toLowerCase().includes(term);
      if (!matchRef && !matchName && !matchDesc && !matchCat) return false;
    }

    if (dateFrom && claim.claim_date < dateFrom) return false;
    if (dateTo && claim.claim_date > dateTo) return false;

    return true;
  });

  const handleExportCsv = () => {
    exportClaimsToCsv(filteredClaims, `${companyName.toLowerCase()}-claims-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-pending">Pending Review</span>;
      case 'approved':
        return <span className="badge badge-approved">Approved (Awaiting Settle)</span>;
      case 'settled':
        return <span className="badge badge-settled">Settled</span>;
      case 'rejected':
        return <span className="badge badge-rejected">Rejected (Auto-Settled)</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  return (
    <div className="container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px 0' }}>All Expense Claims & Audit History</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            Comprehensive company record of all submitted, approved, and settled expenses
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          className="btn btn-secondary btn-sm"
          style={{ whiteSpace: 'nowrap' }}
        >
          📥 Export Safe CSV ({filteredClaims.length})
        </button>
      </div>

      {/* KPI Cards */}
      <KpiCards stats={stats} isAdmin={true} />

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

      {/* Search and Date Range Filters */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div>
            <label className="form-label" style={{ fontSize: '12px' }}>Search Claims</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ref, Employee, Category, Purpose..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ fontSize: '13px', padding: '8px 10px' }}
            />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '12px' }}>From Date</label>
            <input
              type="date"
              className="form-control"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ fontSize: '13px', padding: '8px 10px' }}
            />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '12px' }}>To Date</label>
            <input
              type="date"
              className="form-control"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ fontSize: '13px', padding: '8px 10px' }}
            />
          </div>
          {(searchTerm || dateFrom || dateTo) && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm btn-block"
                onClick={() => {
                  setSearchTerm('');
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Claims List */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          Loading claims history...
        </div>
      ) : filteredClaims.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          No claims matched your filters.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Employee</th>
                  <th>Category</th>
                  <th>Expense Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Bills</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.map((claim) => (
                  <tr key={claim.id}>
                    <td>
                      <Link to={`/claims/${claim.id}`} style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        {claim.reference_code}
                      </Link>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{claim.user_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{claim.user_email}</div>
                    </td>
                    <td>{claim.category_name}</td>
                    <td>{formatIstDate(claim.claim_date)}</td>
                    <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {formatInr(claim.amount_paise)}
                    </td>
                    <td>{getStatusBadge(claim.status)}</td>
                    <td>
                      {claim.attachments && claim.attachments.length > 0 ? (
                        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                          📎 {claim.attachments.length}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--warning-text)', fontWeight: 600 }}>
                          No bill
                        </span>
                      )}
                    </td>
                    <td>
                      <Link to={`/claims/${claim.id}`} className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: '12px', minHeight: '28px' }}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

