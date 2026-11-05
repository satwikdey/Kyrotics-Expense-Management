import React, { useState, useEffect } from 'react';
import { fetchEmployees, updateEmployeeStatus, inviteEmployee } from '../services/claimService';
import { formatIstDateTime } from '../utils/format';

export default function AdminEmployees({ companyName = 'Kyrotics' }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const list = await fetchEmployees();
      setEmployees(list);
    } catch (err) {
      console.error('Failed to load employees:', err);
      setError('Failed to load employees.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (empId, newStatus) => {
    if (!window.confirm(`Update employee status to "${newStatus}"?`)) return;
    setActionLoading(true);
    setError('');
    try {
      await updateEmployeeStatus(empId, newStatus);
      setMessage(`Employee status updated to ${newStatus}.`);
      loadEmployees();
    } catch (err) {
      setError(err.message || 'Failed to update employee status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    try {
      await inviteEmployee({
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        phone: invitePhone.trim(),
      });
      setMessage(`Invitation sent to ${inviteEmail}.`);
      setInviteName('');
      setInviteEmail('');
      setInvitePhone('');
      setShowInviteModal(false);
      loadEmployees();
    } catch (err) {
      setError(err.message || 'Failed to invite employee.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="container">
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
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px 0' }}>Company Employees</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            Approve new employee self-registrations and manage company access
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowInviteModal(!showInviteModal)}
          className="btn btn-primary btn-sm"
        >
          {showInviteModal ? 'Cancel' : '➕ Invite Employee'}
        </button>
      </div>

      {/* Invite Form */}
      {showInviteModal && (
        <div className="card" style={{ border: '2px solid #bfdbfe', background: '#eff6ff', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 12px 0', color: '#1e3a8a' }}>
            Invite New Employee to {companyName}
          </h2>
          <form onSubmit={handleInvite}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '13px' }}>Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Employee name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '13px' }}>Work Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="employee@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '13px' }}>Phone Number</label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="+91 98765 43210"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={actionLoading}>
                {actionLoading ? 'Sending...' : 'Send Invitation & Pre-Approve'}
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowInviteModal(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Employee List Table */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          Loading employees...
        </div>
      ) : employees.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          No employees found.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Approval Status</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{emp.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{emp.email}</div>
                      {emp.phone && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📞 {emp.phone}</div>}
                    </td>
                    <td>
                      <span className="badge badge-neutral" style={{ textTransform: 'uppercase' }}>
                        {emp.role}
                      </span>
                    </td>
                    <td>
                      {emp.approvalStatus === 'approved' ? (
                        <span className="badge badge-approved">Approved</span>
                      ) : emp.approvalStatus === 'pending' ? (
                        <span className="badge badge-pending">Pending Review</span>
                      ) : (
                        <span className="badge badge-rejected">Deactivated / Rejected</span>
                      )}
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {formatIstDateTime(emp.created_at)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {emp.approvalStatus === 'pending' && (
                          <>
                            <button
                              type="button"
                              className="btn btn-success btn-sm"
                              style={{ padding: '3px 8px', fontSize: '11px', minHeight: '28px' }}
                              onClick={() => handleStatusChange(emp.id, 'approved')}
                              disabled={actionLoading}
                            >
                              ✓ Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              style={{ padding: '3px 8px', fontSize: '11px', minHeight: '28px' }}
                              onClick={() => handleStatusChange(emp.id, 'rejected')}
                              disabled={actionLoading}
                            >
                              ✕ Reject
                            </button>
                          </>
                        )}
                        {emp.approvalStatus === 'approved' && emp.role !== 'admin' && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: '11px', minHeight: '28px', color: 'var(--danger-btn)' }}
                            onClick={() => handleStatusChange(emp.id, 'deactivated')}
                            disabled={actionLoading}
                          >
                            Deactivate
                          </button>
                        )}
                        {emp.approvalStatus === 'deactivated' && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: '11px', minHeight: '28px', color: '#16a34a' }}
                            onClick={() => handleStatusChange(emp.id, 'approved')}
                            disabled={actionLoading}
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
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

