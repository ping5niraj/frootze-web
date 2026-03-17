import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // Still loading from localStorage — don't redirect yet
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-purple-600 text-lg">Loading... 🌳</div>
      </div>
    );
  }

  // Not logged in — send to landing
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Logged in — show the page
  return children;
}
