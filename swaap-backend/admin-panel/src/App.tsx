import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import './styles/dark-theme.css';
import Dashboard from './components/Dashboard';
import Users from './components/Users';
import Advertisements from './components/Advertisements';
import Verifications from './components/Verifications';

// Main App Component
function AppContent() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { user, logout } = useAuth();
  
  const navItems = [
    { id: 'dashboard', name: '📊 Dashboard', icon: '📊' },
    { id: 'advertisements', name: '📺 Advertisements', icon: '📺' },
    { id: 'users', name: '👥 Users', icon: '👥' },
    { id: 'verifications', name: '🆔 Verifications', icon: '🆔' },
    { id: 'insights', name: '📈 Insights', icon: '📈' },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'advertisements':
        return <Advertisements />;
      case 'users':
        return <Users />;
      case 'verifications':
        return <Verifications />;
      case 'insights':
        return <InsightsPlaceholder />;
      default:
        return <Dashboard />;
    }
  };

  const appStyle = {
    display: 'flex',
    minHeight: '100vh'
  };

  const sidebarStyle = {
    width: '250px',
    backgroundColor: 'white',
    boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
    borderRight: '1px solid #e9ecef'
  };

  const navStyle = {
    padding: '20px'
  };

  const navItemStyle = (isActive: boolean) => ({
    display: 'block',
    width: '100%',
    padding: '12px 15px',
    margin: '5px 0',
    backgroundColor: isActive ? '#667eea' : 'transparent',
    color: isActive ? 'white' : '#333',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: isActive ? 'bold' : 'normal',
    textAlign: 'left' as const,
    transition: 'all 0.2s ease'
  });

  const mainContentStyle = {
    flex: 1,
    backgroundColor: '#f8f9fa',
    overflow: 'auto'
  };

  const headerStyle = {
    backgroundColor: 'white',
    padding: '15px 20px',
    borderBottom: '1px solid #e9ecef',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  return (
    <div style={appStyle}>
      {/* Sidebar */}
      <div style={sidebarStyle}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e9ecef' }}>
          <h2 style={{ margin: 0, color: '#667eea', fontSize: '1.5rem' }}>Swaap Admin</h2>
        </div>
        <nav style={navStyle}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              style={navItemStyle(currentPage === item.id)}
              onMouseEnter={(e) => {
                if (currentPage !== item.id) {
                  (e.target as HTMLElement).style.backgroundColor = '#f8f9fa';
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== item.id) {
                  (e.target as HTMLElement).style.backgroundColor = 'transparent';
                }
              }}
            >
              <span style={{ marginRight: '10px' }}>{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div style={mainContentStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <h1 style={{ margin: 0, color: '#333' }}>Admin Panel</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ color: '#6c757d' }}>Welcome, {user?.email}</span>
            <button
              onClick={logout}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Page Content */}
        <main>
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

// Placeholder components for pages not yet implemented
const VerificationsPlaceholder = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold mb-6">🆔 Identity Verifications</h2>
    <div className="bg-white p-8 rounded-lg shadow text-center">
      <p className="text-gray-500">Identity verification management coming soon...</p>
    </div>
  </div>
);

const InsightsPlaceholder = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold mb-6">📈 Analytics & Insights</h2>
    <div className="bg-white p-8 rounded-lg shadow text-center">
      <p className="text-gray-500">Advanced analytics and insights coming soon...</p>
    </div>
  </div>
);

// Login Component
const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-md w-full space-y-8 p-8">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-yellow-500 rounded-full flex items-center justify-center mb-6">
            <span className="text-2xl font-bold text-black">S</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-2">
            Swaap Admin
          </h2>
          <p className="text-gray-400 text-sm">
            Manage your marketplace with ease
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg backdrop-blur-sm">
                <div className="flex items-center">
                  <span className="text-red-400 mr-2">⚠️</span>
                  {error}
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your admin email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold py-3 px-6 rounded-lg hover:from-yellow-600 hover:to-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2"></div>
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <span className="mr-2">🔐</span>
                  Sign in to Admin Panel
                </div>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-gray-500 text-xs">
            Secure admin access • Swaap Marketplace © 2024
          </p>
        </div>
      </div>
    </div>
  );
};

// Main App with Auth Provider
function App() {
  return (
    <AuthProvider>
      <AppWrapper />
    </AuthProvider>
  );
}

// Separate wrapper component that uses the useAuth hook
function AppWrapper() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <AppContent /> : <LoginForm />;
}

export default App;