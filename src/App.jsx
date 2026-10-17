import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';

import { Login } from './pages/Login';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { FacultyDashboard } from './pages/faculty/FacultyDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { SecurityDashboard } from './pages/security/SecurityDashboard';

// Root redirector based on authentication state
const RootRedirect = () => {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={`/${role || 'student'}`} replace />;
};

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RootRedirect />} />

            {/* Authenticated Dashboard Shell */}
            <Route element={<DashboardLayout />}>
              {/* Student Route */}
              <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                <Route path="/student" element={<StudentDashboard />} />
              </Route>

              {/* Faculty Route */}
              <Route element={<ProtectedRoute allowedRoles={['faculty']} />}>
                <Route path="/faculty" element={<FacultyDashboard />} />
              </Route>

              {/* HOD / Admin Route */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>

              {/* Security Route */}
              <Route element={<ProtectedRoute allowedRoles={['security']} />}>
                <Route path="/security" element={<SecurityDashboard />} />
              </Route>
            </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
