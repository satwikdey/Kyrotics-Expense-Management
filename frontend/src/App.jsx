import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Header from './components/Header';
import BottomNav from './components/BottomNav';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import AccountStatus from './pages/AccountStatus';
import ClaimCreate from './pages/ClaimCreate';
import ClaimStatus from './pages/ClaimStatus';
import ClaimShow from './pages/ClaimShow';
import AdminClaimsPending from './pages/AdminClaimsPending';
import AdminClaimsSettle from './pages/AdminClaimsSettle';
import AdminClaimsHistory from './pages/AdminClaimsHistory';
import AdminEmployees from './pages/AdminEmployees';

function ProtectedRoute({ children, requireAdmin = false, requireApproved = true }) {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '40px' }}>
        Loading session...
      </div>
    );
  }

  if (!currentUser || !userProfile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && userProfile.role !== 'admin') {
    return <Navigate to="/claims/create" replace />;
  }

  if (requireApproved && userProfile.role !== 'admin' && userProfile.approvalStatus !== 'approved') {
    return <Navigate to="/account-status" replace />;
  }

  return children;
}

export default function App({ companyName = 'Kyrotics' }) {
  const { currentUser, userProfile } = useAuth();
  const location = useLocation();

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="app-layout">
      {!isAuthPage && <Header companyName={companyName} />}

      <main style={{ minHeight: 'calc(100vh - 120px)' }}>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login companyName={companyName} />} />
          <Route path="/register" element={<Register companyName={companyName} />} />
          <Route path="/account-status" element={<AccountStatus companyName={companyName} />} />

          {/* Employee Routes */}
          <Route
            path="/claims/create"
            element={
              <ProtectedRoute>
                <ClaimCreate companyName={companyName} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/claims"
            element={
              <ProtectedRoute>
                <ClaimStatus companyName={companyName} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/claims/:id"
            element={
              <ProtectedRoute>
                <ClaimShow companyName={companyName} />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/claims/pending"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminClaimsPending companyName={companyName} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/claims/settle"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminClaimsSettle companyName={companyName} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/claims/history"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminClaimsHistory companyName={companyName} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/employees"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminEmployees companyName={companyName} />
              </ProtectedRoute>
            }
          />

          {/* Root Redirect */}
          <Route
            path="/"
            element={
              !currentUser ? (
                <Navigate to="/login" replace />
              ) : userProfile?.role === 'admin' ? (
                <Navigate to="/admin/claims/pending" replace />
              ) : userProfile?.approvalStatus !== 'approved' ? (
                <Navigate to="/account-status" replace />
              ) : (
                <Navigate to="/claims/create" replace />
              )
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!isAuthPage && <BottomNav />}
    </div>
  );
}

