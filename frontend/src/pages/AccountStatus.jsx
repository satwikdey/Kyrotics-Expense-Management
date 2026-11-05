import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AccountStatus({ companyName = 'Kyrotics' }) {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const status = userProfile?.approvalStatus || 'pending';
  const isPending = status === 'pending';
  const isRejected = status === 'rejected' || userProfile?.isActive === false;

  return (
    <div className="container-narrow">
      <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>
          {isPending ? '⏳' : '🚫'}
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 10px 0' }}>
          {isPending ? 'Registration Pending Approval' : 'Account Suspended or Not Approved'}
        </h1>

        <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6, margin: '0 auto 24px auto', maxWidth: '380px' }}>
          {isPending ? (
            <>
              Hello <strong>{userProfile?.name}</strong>, your account has been registered with {companyName} and is currently awaiting administrator review. You will be able to access the expense claim portal once approved.
            </>
          ) : (
            <>
              Your account has been deactivated or was not approved by {companyName} administration. Please reach out to your finance administrator for assistance.
            </>
          )}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '280px', margin: '0 auto' }}>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => window.location.reload()}
          >
            🔄 Refresh Approval Status
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={handleLogout}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

