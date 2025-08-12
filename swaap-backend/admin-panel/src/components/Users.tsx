import React, { useState, useEffect } from 'react';
import { adminApi } from '../api';

const Users = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getUsers();
      setUsers(data);
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      setError(error.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  const getVerificationLevelDisplay = (level: number) => {
    switch (level) {
      case 4:
        return { text: 'FULLY_VERIFIED', color: 'text-green-600', bg: 'bg-green-100' };
      case 3:
        return { text: 'ADVANCED', color: 'text-blue-600', bg: 'bg-blue-100' };
      case 2:
        return { text: 'INTERMEDIATE', color: 'text-yellow-600', bg: 'bg-yellow-100' };
      case 1:
        return { text: 'BASIC', color: 'text-orange-600', bg: 'bg-orange-100' };
      default:
        return { text: 'UNVERIFIED', color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 100) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    if (score >= 25) return 'text-orange-600';
    return 'text-red-600';
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.mobile?.includes(searchTerm);
    
    if (filter === 'all') return matchesSearch;
    return matchesSearch && user.role === filter;
  });

  const containerStyle = {
    padding: '30px',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh'
  };

  const cardStyle = {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '20px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e9ecef'
  };

  const searchBarStyle = {
    display: 'flex',
    gap: '15px',
    marginBottom: '20px',
    alignItems: 'center'
  };

  const inputStyle = {
    flex: 1,
    padding: '12px 15px',
    border: '1px solid #ced4da',
    borderRadius: '8px',
    fontSize: '14px'
  };

  const selectStyle = {
    padding: '12px 15px',
    border: '1px solid #ced4da',
    borderRadius: '8px',
    fontSize: '14px',
    minWidth: '200px'
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse' as const,
    marginTop: '10px'
  };

  const thStyle = {
    backgroundColor: '#f8f9fa',
    padding: '12px 15px',
    textAlign: 'left' as const,
    borderBottom: '2px solid #dee2e6',
    fontWeight: 'bold',
    color: '#495057',
    fontSize: '14px'
  };

  const tdStyle = {
    padding: '12px 15px',
    borderBottom: '1px solid #dee2e6',
    fontSize: '14px'
  };

  const badgeStyle = (color: string) => ({
    backgroundColor: color,
    color: 'white',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'inline-block'
  });

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div className="App-header" style={{ marginBottom: '30px' }}>
        <h1>👥 User Management</h1>
        <p>Manage and monitor all platform users</p>
      </div>

      {/* Search and Filter */}
      <div style={cardStyle}>
        <div style={searchBarStyle}>
          <input
            type="text"
            placeholder="Search users by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={inputStyle}
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="all">All Users ({users.length})</option>
            <option value="user">Regular Users ({users.filter(u => u.role === 'user').length})</option>
            <option value="admin">Admins ({users.filter(u => u.role === 'admin').length})</option>
          </select>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{
          ...cardStyle,
          backgroundColor: '#f8d7da',
          borderColor: '#f5c6cb',
          color: '#721c24'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '10px' }}>⚠️</span>
            {error}
          </div>
        </div>
      )}

      {/* Users List */}
      <div style={cardStyle}>
        {loading ? (
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
            <p>Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>👥</div>
            <p style={{ color: '#6c757d', fontSize: '1.2rem' }}>
              {searchTerm ? `No users found for "${searchTerm}"` : 'No users found'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>User Details</th>
                  <th style={thStyle}>Contact</th>
                  <th style={thStyle}>Verification</th>
                  <th style={thStyle}>Trust Score</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const verificationDisplay = getVerificationLevelDisplay(user.verificationLevel || 0);
                  return (
                    <tr key={user._id} style={{ backgroundColor: '#fff' }}>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: '#667eea',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold',
                            marginRight: '15px'
                          }}>
                            {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#333' }}>
                              {user.fullName || 'Unnamed User'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6c757d' }}>
                              ID: {user._id.slice(-8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td style={tdStyle}>
                        <div>
                          <div style={{ fontWeight: '500' }}>{user.email}</div>
                          {user.mobile && (
                            <div style={{ fontSize: '13px', color: '#6c757d' }}>📱 {user.mobile}</div>
                          )}
                          {user.address?.city && (
                            <div style={{ fontSize: '12px', color: '#6c757d' }}>📍 {user.address.city}</div>
                          )}
                        </div>
                      </td>
                      
                      <td style={tdStyle}>
                        <div>
                          <span style={badgeStyle(
                            user.verificationLevel === 4 ? '#28a745' :
                            user.verificationLevel === 3 ? '#007bff' :
                            user.verificationLevel === 2 ? '#ffc107' :
                            user.verificationLevel === 1 ? '#fd7e14' : '#6c757d'
                          )}>
                            {verificationDisplay.text}
                          </span>
                          <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '5px' }}>
                            Level {user.verificationLevel || 0}/4
                          </div>
                        </div>
                      </td>
                      
                      <td style={tdStyle}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                            {user.trustScore || 0}/100
                          </div>
                          <div style={{ fontSize: '12px', color: '#6c757d' }}>
                            {user.successfulSwaps || 0} swaps
                          </div>
                        </div>
                      </td>
                      
                      <td style={tdStyle}>
                        <div>
                          <span style={badgeStyle(user.role === 'admin' ? '#6f42c1' : '#007bff')}>
                            {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                          </span>
                          <div style={{ 
                            fontSize: '12px', 
                            color: user.isActive !== false ? '#28a745' : '#dc3545',
                            marginTop: '5px' 
                          }}>
                            {user.isActive !== false ? '🟢 Active' : '🔴 Inactive'}
                          </div>
                        </div>
                      </td>
                      
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => setSelectedUser(user)}
                            style={{
                              backgroundColor: '#007bff',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '6px 12px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            👁️ View
                          </button>
                          {user.role !== 'admin' && (
                            <button
                              style={{
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to suspend ${user.fullName}?`)) {
                                  alert('Suspend functionality would be implemented here');
                                }
                              }}
                            >
                              ⛔ Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>User Details</h3>
              <button
                onClick={() => setSelectedUser(null)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '2rem',
                  cursor: 'pointer',
                  color: '#6c757d'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <div>
                <h4 style={{ marginBottom: '15px', color: '#333' }}>Basic Information</h4>
                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                  <p><strong>Name:</strong> {selectedUser.fullName}</p>
                  <p><strong>Email:</strong> {selectedUser.email}</p>
                  <p><strong>Phone:</strong> {selectedUser.mobile || 'Not provided'}</p>
                  <p><strong>Role:</strong> {selectedUser.role}</p>
                  <p><strong>User ID:</strong> {selectedUser._id}</p>
                </div>
              </div>
              
              <div>
                <h4 style={{ marginBottom: '15px', color: '#333' }}>Account Status</h4>
                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                  <p><strong>Trust Score:</strong> {selectedUser.trustScore || 0}/100</p>
                  <p><strong>Verification Level:</strong> {selectedUser.verificationLevel || 0}/4</p>
                  <p><strong>Successful Swaps:</strong> {selectedUser.successfulSwaps || 0}</p>
                  <p><strong>Wallet Balance:</strong> ₦{Number(selectedUser.walletBalance || 0).toLocaleString()}</p>
                  <p><strong>Joined:</strong> {new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              
              {selectedUser.address && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <h4 style={{ marginBottom: '15px', color: '#333' }}>Address Information</h4>
                  <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                    <p>{selectedUser.address.street}</p>
                    <p>{selectedUser.address.city}, {selectedUser.address.state}</p>
                    <p>{selectedUser.address.country}</p>
                    <p><strong>Verified:</strong> {selectedUser.addressVerified ? '✅ Yes' : '❌ No'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;