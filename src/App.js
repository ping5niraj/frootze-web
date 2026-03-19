import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import VerifyOTP from './pages/VerifyOTP';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AddRelative from './pages/AddRelative';
import EditProfile from './pages/EditProfile';
import Directory from './pages/Directory';
import Messages from './pages/Messages';
import LocationPage from './pages/LocationPage';
import Birthdays from './pages/Birthdays';
import Quiz from './pages/Quiz';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/verify" element={<VerifyOTP />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/add-relative" element={<ProtectedRoute><AddRelative /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
          <Route path="/directory" element={<ProtectedRoute><Directory /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/locations" element={<ProtectedRoute><LocationPage /></ProtectedRoute>} />
          <Route path="/birthdays" element={<ProtectedRoute><Birthdays /></ProtectedRoute>} />
          <Route path="/quiz" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
