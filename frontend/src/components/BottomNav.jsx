import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function BottomNav() {
  const { userProfile, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  if (!userProfile) return null;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <nav className="bottom-nav" aria-label="Mobile Navigation">
      {isAdmin ? (
        <>
          <NavLink
            to="/admin/claims/pending"
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="bottom-nav-icon">⏳</span>
            <span>Pending</span>
          </NavLink>
          <NavLink
            to="/admin/claims/settle"
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="bottom-nav-icon">💳</span>
            <span>Settle</span>
          </NavLink>
          <NavLink
            to="/admin/employees"
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="bottom-nav-icon">👥</span>
            <span>Employees</span>
          </NavLink>
          <NavLink
            to="/admin/claims/history"
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="bottom-nav-icon">📊</span>
            <span>History</span>
          </NavLink>
          <button
            onClick={handleLogout}
            className="bottom-nav-item"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <span className="bottom-nav-icon">🚪</span>
            <span>Sign Out</span>
          </button>
        </>
      ) : (
        <>
          <NavLink
            to="/claims/create"
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="bottom-nav-icon">➕</span>
            <span>Submit Claim</span>
          </NavLink>
          <NavLink
            to="/claims"
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="bottom-nav-icon">📋</span>
            <span>My Claims</span>
          </NavLink>
          <button
            onClick={handleLogout}
            className="bottom-nav-item"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <span className="bottom-nav-icon">🚪</span>
            <span>Sign Out</span>
          </button>
        </>
      )}
    </nav>
  );
}

