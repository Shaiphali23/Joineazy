import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import Spinner from './components/Spinner.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import StudentAssignments from './pages/StudentAssignments.jsx';
import StudentGroup from './pages/StudentGroup.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminAssignments from './pages/AdminAssignments.jsx';
import AdminAssignmentDetail from './pages/AdminAssignmentDetail.jsx';
import AdminGroups from './pages/AdminGroups.jsx';

/** Sends an already-authenticated visitor to the right home for their role. */
function Home() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/assignments'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/assignments" element={<ProtectedRoute role="STUDENT"><StudentAssignments /></ProtectedRoute>} />
            <Route path="/group" element={<ProtectedRoute role="STUDENT"><StudentGroup /></ProtectedRoute>} />

            <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/assignments" element={<ProtectedRoute role="ADMIN"><AdminAssignments /></ProtectedRoute>} />
            <Route path="/admin/assignments/:id" element={<ProtectedRoute role="ADMIN"><AdminAssignmentDetail /></ProtectedRoute>} />
            <Route path="/admin/groups" element={<ProtectedRoute role="ADMIN"><AdminGroups /></ProtectedRoute>} />
          </Route>

          <Route path="/" element={<Home />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
