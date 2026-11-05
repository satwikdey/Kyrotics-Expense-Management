import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header({ companyName = 'Kyrotics' }) {
  const { userProfile, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to={isAdmin ? '/admin/claims/pending' : '/claims/create'} className="brand">
          <span>{companyName} Expenses</span>
          <span className="brand-tag">{isAdmin ? 'ADMIN' : 'EMPLOYEE'}</span>
        </Link>
        {userProfile && (
          <div className="header-user">
            <span style={{ fontWeight: 500 }}>{userProfile.name}</span>
            <button
              onClick={handleLogout}
              className="btn btn-secondary btn-sm"
              style={{ padding: '4px 10px', fontSize: '12px', minHeight: '30px' }}
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

