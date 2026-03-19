import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load from localStorage on mount
    const storedToken = localStorage.getItem('pmf_token');
    const storedUser = localStorage.getItem('pmf_user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('pmf_token');
        localStorage.removeItem('pmf_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken, newUser) => {
    // Save to localStorage first
    localStorage.setItem('pmf_token', newToken);
    localStorage.setItem('pmf_user', JSON.stringify(newUser));
    // Then update state
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('pmf_token');
    localStorage.removeItem('pmf_user');
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
