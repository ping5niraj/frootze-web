import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On app load, restore user from localStorage
    try {
      const token = localStorage.getItem('pmf_token');
      const savedUser = localStorage.getItem('pmf_user');
      if (token && savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      localStorage.removeItem('pmf_token');
      localStorage.removeItem('pmf_user');
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('pmf_token', token);
    localStorage.setItem('pmf_user', JSON.stringify(userData));
    setUser(userData); // update state immediately
  };

  const logout = () => {
    localStorage.removeItem('pmf_token');
    localStorage.removeItem('pmf_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
