import React, { useState, useEffect } from 'react';
import { adminApi } from '../api';

const Dashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dashboardStyle = {
    padding: '30px',
    backgroundColor: '#f8f9fa'
  };

  const cardStyle = {
    background: 'white',
    borderRadius: '12px',
    padding: '30px',
    marginBottom: '20px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e9ecef'
  };

  const statCardStyle = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    borderRadius: '12px',
    padding: '25px',
    textAlign: 'center' as const,
    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  };

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await adminApi.getMetrics();
      setStats(data);
    } catch (error: any) {
      console.error('Failed to fetch dashboard stats:', error);
      setError(error.message || 'Failed to fetch dashboard stats');
      // Fallback to basic stats
      setStats({
        totalUsers: 0,
        totalProducts: 0,
        totalSwaps: 0,
        verification: { pending: { identity: 0, address: 0 } }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div style={{ 
          width: '50px', 
          height: '50px', 
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #667eea',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }}></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div style={dashboardStyle}>
      {/* Header */}
      <div className="App-header" style={{ marginBottom: '30px' }}>
        <h1>📊 Admin Dashboard</h1>
        <p>Welcome to the Swaap Admin Panel</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{
          ...cardStyle,
          backgroundColor: '#f8d7da',
          borderColor: '#f5c6cb',
          color: '#721c24',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '10px' }}>⚠️</span>
            {error}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div style={gridStyle}>
        <div style={statCardStyle}>
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>👥</div>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '2rem' }}>{(stats?.totalUsers || 0).toLocaleString()}</h3>
          <p style={{ margin: '0', opacity: 0.9 }}>Total Users</p>
        </div>

        <div style={{ ...statCardStyle, background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📦</div>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '2rem' }}>{(stats?.totalProducts || 0).toLocaleString()}</h3>
          <p style={{ margin: '0', opacity: 0.9 }}>Products</p>
        </div>

        <div style={{ ...statCardStyle, background: 'linear-gradient(135deg, #ffd89b 0%, #19547b 100%)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🆔</div>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '2rem' }}>
            {((stats?.verification?.pending?.identity || 0) + (stats?.verification?.pending?.address || 0))}
          </h3>
          <p style={{ margin: '0', opacity: 0.9 }}>Pending Verifications</p>
        </div>

        <div style={{ ...statCardStyle, background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', color: '#333' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🔄</div>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '2rem' }}>{(stats?.totalSwaps || 0).toLocaleString()}</h3>
          <p style={{ margin: '0', opacity: 0.8 }}>Total Swaps</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: '0', marginBottom: '20px', color: '#333' }}>📋 Recent Activity</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {stats?.latestUsers && stats.latestUsers.length > 0 ? (
            stats.latestUsers.map((user: any, index: number) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#667eea',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '15px',
                  color: 'white'
                }}>
                  👤
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', color: '#333' }}>New user registered</div>
                  <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                    {user.fullName} ({user.email}) • {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                  {user.verificationLevel > 0 && (
                    <div style={{ fontSize: '0.8rem', color: '#28a745', marginTop: '2px' }}>
                      ✅ Level {user.verificationLevel} verified • Trust: {user.trustScore || 0}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
              No recent activity available
            </div>
          )}
          
          {/* Show recent verifications if available */}
          {stats?.recentVerifications && stats.recentVerifications.length > 0 && (
            stats.recentVerifications.slice(0, 2).map((verification: any, index: number) => (
              <div key={`verification-${index}`} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '15px',
                backgroundColor: '#fff3cd',
                borderRadius: '8px',
                border: '1px solid #ffeaa7'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#f0ad4e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '15px',
                  color: 'white'
                }}>
                  🆔
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', color: '#333' }}>Identity verification submitted</div>
                  <div style={{ color: '#856404', fontSize: '0.9rem' }}>
                    {verification.userId?.fullName || 'User'} • {verification.documentType} • {new Date(verification.submittedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: '0', marginBottom: '20px', color: '#333' }}>⚡ Quick Actions</h3>
        <div style={gridStyle}>
          {[
            { icon: "👥", title: "Manage Users", color: "#667eea" },
            { icon: "🆔", title: "Review Verifications", color: "#11998e" },
            { icon: "📺", title: "Create Advertisement", color: "#ff6b6b" },
            { icon: "📊", title: "View Analytics", color: "#f093fb" }
          ].map((action, index) => (
            <button key={index} style={{
              backgroundColor: action.color,
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center' as const,
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>{action.icon}</div>
              {action.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;