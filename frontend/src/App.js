import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from './components/ui/toaster';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Feedback from './pages/Feedback';
import RequestAccess from './pages/RequestAccess';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    // Wrap the entire app in AuthProvider so all components can access auth state
    <AuthProvider>
      {/* BrowserRouter handles client-side routing */}
      <BrowserRouter>
        <div className="App">
          <Routes>
            {/* Public route: login page */}
            <Route path="/login" element={<Login />} />
            {/* Public route: user can request access to the system */}
            <Route path="/request-access" element={<RequestAccess />} />
            {/* Protected user dashboard, only accessible when logged in */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            {/* Admin dashboard, requires user with admin role */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            {/* Authenticated feedback page */}
            <Route
              path="/feedback"
              element={
                <ProtectedRoute>
                  <Feedback />
                </ProtectedRoute>
              }
            />
            {/* Default route: redirect root path to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          {/* Global toast notifications container */}
          <Toaster />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
