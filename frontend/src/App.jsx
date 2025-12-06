import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { CircularProgress, Box } from '@mui/material';

// Pages
import LoginPage from './pages/Auth/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import CreditBackPage from './pages/CreditBack/CreditBackPage';
import PromotionsPage from './pages/Promotions/PromotionsPage';
import ResellersPage from './pages/Resellers/ResellersPage';
import WhatsAppPage from './pages/WhatsApp/WhatsAppPage';
import SettingsPage from './pages/Settings/SettingsPage';

// Layout
import Layout from './components/Layout/Layout';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/credit-back"
        element={
          <ProtectedRoute>
            <CreditBackPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/promotions"
        element={
          <ProtectedRoute>
            <PromotionsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/resellers"
        element={
          <ProtectedRoute>
            <ResellersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/whatsapp"
        element={
          <ProtectedRoute>
            <WhatsAppPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
