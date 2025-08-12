import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../api';

interface Verification {
  uploadId: string;
  userId: {
    _id: string;
    fullName: string;
    email: string;
  };
  documentType: string;
  status: 'pending_review' | 'verified' | 'rejected';
  submittedAt: string;
  frontImagePath: string;
  backImagePath?: string;
  reviewComments?: string;
  reviewedAt?: string;
}

interface AddressVerification {
  userId: string;
  fullName: string;
  email: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    verificationStatus: string;
  };
  submittedAt: string;
}

const Verifications = () => {
  const [identityVerifications, setIdentityVerifications] = useState<Verification[]>([]);
  const [addressVerifications, setAddressVerifications] = useState<AddressVerification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'identity' | 'address'>('identity');
  const [reviewLoading, setReviewLoading] = useState<string | null>(null);
  const [hoveredItems, setHoveredItems] = useState<Set<string>>(new Set());

  // Fetch identity verifications
  const fetchIdentityVerifications = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getVerifications();
      setIdentityVerifications(data.verifications || []);
    } catch (err: any) {
      console.error('Error fetching identity verifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch address verifications
  const fetchAddressVerifications = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getVerifications();
      setAddressVerifications(data.addresses || []);
    } catch (err: any) {
      console.error('Error fetching address verifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Review identity verification
  const reviewIdentityVerification = async (uploadId: string, action: 'approve' | 'reject', comments = '') => {
    if (!window.confirm(`Are you sure you want to ${action} this verification?`)) return;

    setReviewLoading(uploadId);
    try {
      const status = action === 'approve' ? 'verified' : 'rejected';
      await adminApi.updateVerificationStatus(uploadId, status, comments);
      
      await fetchIdentityVerifications(); // Refresh the list
      alert(`Verification ${action}d successfully!`);
    } catch (err: any) {
      console.error(`Error ${action}ing verification:`, err);
      alert(`Failed to ${action} verification: ${err.message}`);
    } finally {
      setReviewLoading(null);
    }
  };

  // Review address verification
  const reviewAddressVerification = async (userId: string, action: 'approve' | 'reject', comments = '') => {
    if (!window.confirm(`Are you sure you want to ${action} this address verification?`)) return;

    setReviewLoading(userId);
    try {
      const status = action === 'approve' ? 'verified' : 'rejected';
      await adminApi.updateVerificationStatus(userId, status, comments);
      
      await fetchAddressVerifications(); // Refresh the list
      alert(`Address ${action}d successfully!`);
    } catch (err: any) {
      console.error(`Error ${action}ing address:`, err);
      alert(`Failed to ${action} address: ${err.message}`);
    } finally {
      setReviewLoading(null);
    }
  };

  useEffect(() => {
    if (selectedTab === 'identity') {
      fetchIdentityVerifications();
    } else {
      fetchAddressVerifications();
    }
  }, [selectedTab]);

  // Styling objects
  const containerStyle = {
    padding: '30px',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh'
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    padding: '25px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '12px',
    color: 'white'
  };

  const tabButtonStyle = (isActive: boolean, color: string = '#667eea') => ({
    padding: '12px 20px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: isActive ? color : '#ffffff',
    color: isActive ? 'white' : '#333',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    marginRight: '10px',
    boxShadow: isActive ? '0 4px 8px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'all 0.3s ease'
  });

  const cardStyle = {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '20px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e9ecef'
  };

  const errorStyle = {
    ...cardStyle,
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    color: '#721c24'
  };

  const loadingContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px'
  };

  const loadingSpinnerStyle = {
    width: '48px',
    height: '48px',
    border: '3px solid #f3f4f6',
    borderTop: '3px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '12px'
  };

  const verificationCardStyle = {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e5e7eb',
    overflow: 'hidden'
  };

  const verificationHeaderStyle = (isAddress: boolean = false) => ({
    padding: '20px 24px 16px',
    background: isAddress 
      ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' 
      : 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    borderBottom: '1px solid #e5e7eb'
  });

  const emptyStateStyle = {
    textAlign: 'center' as const,
    padding: '48px'
  };

  const verificationItemStyle = {
    padding: '24px',
    borderBottom: '1px solid #e5e7eb',
    transition: 'background-color 0.2s ease',
    cursor: 'default'
  };

  const verificationItemHoverStyle = {
    backgroundColor: '#f9fafb'
  };

  const userAvatarStyle = {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '12px',
    fontWeight: '600' as const
  };

  const statusBadgeStyle = (status: string) => {
    const styles = {
      pending_review: {
        backgroundColor: '#fef3c7',
        color: '#92400e',
        border: '1px solid #fbbf24'
      },
      verified: {
        backgroundColor: '#dcfce7',
        color: '#166534',
        border: '1px solid #16a34a'
      },
      rejected: {
        backgroundColor: '#fecaca',
        color: '#991b1b',
        border: '1px solid #dc2626'
      }
    };
    
    return {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 12px',
      fontSize: '12px',
      fontWeight: '600' as const,
      borderRadius: '9999px',
      ...styles[status as keyof typeof styles]
    };
  };

  const actionButtonStyle = (type: 'approve' | 'reject', disabled = false) => {
    const baseStyle = {
      display: 'flex',
      alignItems: 'center',
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: '500' as const,
      borderRadius: '8px',
      border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'all 0.2s ease',
      outline: 'none'
    };

    if (type === 'approve') {
      return {
        ...baseStyle,
        backgroundColor: '#16a34a',
        color: 'white',
        boxShadow: '0 2px 4px rgba(22, 163, 74, 0.3)',
        ...(disabled ? {} : {
          ':hover': {
            backgroundColor: '#15803d',
            boxShadow: '0 4px 8px rgba(22, 163, 74, 0.4)'
          }
        })
      };
    } else {
      return {
        ...baseStyle,
        backgroundColor: '#dc2626',
        color: 'white',
        boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)',
        ...(disabled ? {} : {
          ':hover': {
            backgroundColor: '#b91c1c',
            boxShadow: '0 4px 8px rgba(220, 38, 38, 0.4)'
          }
        })
      };
    }
  };

  const documentImageContainerStyle = {
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    padding: '12px',
    flex: 1,
    minWidth: '200px'
  };

  const addressInfoContainerStyle = {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '12px'
  };

  const gridLayoutStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    fontSize: '14px'
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '1.8rem', color: 'white' }}>🆔 User Verifications</h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '1rem' }}>Review and approve user identity and address verifications</p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setSelectedTab('identity')}
            style={tabButtonStyle(selectedTab === 'identity', '#667eea')}
          >
            📄 Identity Documents
          </button>
          <button
            onClick={() => setSelectedTab('address')}
            style={tabButtonStyle(selectedTab === 'address', '#28a745')}
          >
            📍 Address Verifications
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={errorStyle}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '10px' }}>⚠️</span>
            {error}
          </div>
        </div>
      )}

        {/* Content */}
        {loading ? (
          <div style={loadingContainerStyle}>
            <div style={loadingSpinnerStyle}></div>
            <span style={{ color: '#6b7280', fontSize: '16px' }}>Loading verifications...</span>
          </div>
        ) : (
          <>
            {/* Identity Verifications Tab */}
            {selectedTab === 'identity' && (
              <div>
                <div style={verificationCardStyle}>
                  <div style={verificationHeaderStyle(false)}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
                      📄 Identity Document Verifications ({identityVerifications.length})
                    </h3>
                  </div>

                  {identityVerifications.length === 0 ? (
                    <div style={emptyStateStyle}>
                      <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📄</div>
                      <p style={{ color: '#6b7280', fontSize: '18px', margin: 0 }}>No pending identity verifications</p>
                    </div>
                  ) : (
                    <div>
                      {identityVerifications.map((verification) => {
                        const isHovered = hoveredItems.has(verification.uploadId);
                        return (
                        <div 
                          key={verification.uploadId} 
                          style={{
                            ...verificationItemStyle,
                            ...(isHovered ? verificationItemHoverStyle : {})
                          }}
                          onMouseEnter={() => setHoveredItems(prev => new Set(prev).add(verification.uploadId))}
                          onMouseLeave={() => setHoveredItems(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(verification.uploadId);
                            return newSet;
                          })}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                                <div style={{
                                  ...userAvatarStyle,
                                  backgroundColor: '#dbeafe',
                                  color: '#2563eb'
                                }}>
                                  <span>
                                    {verification.userId?.fullName?.charAt(0).toUpperCase() || 'U'}
                                  </span>
                                </div>
                                <div>
                                  <h4 style={{ fontWeight: '600', color: '#111827', margin: '0 0 4px 0', fontSize: '16px' }}>{verification.userId?.fullName || 'Unknown User'}</h4>
                                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{verification.userId?.email || 'No email'}</p>
                                </div>
                              </div>

                              <div style={gridLayoutStyle}>
                                <div>
                                  <span style={{ fontWeight: '500', color: '#374151' }}>Document Type:</span>
                                  <p style={{ marginTop: '4px', textTransform: 'capitalize', margin: '4px 0 0 0' }}>{verification.documentType}</p>
                                </div>
                                <div>
                                  <span style={{ fontWeight: '500', color: '#374151' }}>Status:</span>
                                  <p style={{ marginTop: '4px', margin: '4px 0 0 0' }}>
                                    <span style={statusBadgeStyle(verification.status)}>
                                      {verification.status.replace('_', ' ')}
                                    </span>
                                  </p>
                                </div>
                                <div>
                                  <span style={{ fontWeight: '500', color: '#374151' }}>Submitted:</span>
                                  <p style={{ marginTop: '4px', margin: '4px 0 0 0' }}>{new Date(verification.submittedAt).toLocaleDateString()}</p>
                                </div>
                              </div>

                              {/* Document Images */}
                              <div style={{ marginTop: '16px', display: 'flex', gap: '16px' }}>
                                <div style={documentImageContainerStyle}>
                                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', margin: '0 0 8px 0' }}>Front Image</p>
                                  <div style={{
                                    backgroundColor: '#e5e7eb',
                                    borderRadius: '6px',
                                    height: '80px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    <span style={{ color: '#6b7280', fontSize: '14px' }}>📄 Document Front</span>
                                  </div>
                                </div>
                                {verification.backImagePath && (
                                  <div style={documentImageContainerStyle}>
                                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', margin: '0 0 8px 0' }}>Back Image</p>
                                    <div style={{
                                      backgroundColor: '#e5e7eb',
                                      borderRadius: '6px',
                                      height: '80px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}>
                                      <span style={{ color: '#6b7280', fontSize: '14px' }}>📄 Document Back</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            {verification.status === 'pending_review' && (
                              <div style={{ display: 'flex', gap: '8px', marginLeft: '24px' }}>
                                <button
                                  onClick={() => reviewIdentityVerification(verification.uploadId, 'approve')}
                                  disabled={reviewLoading === verification.uploadId}
                                  style={actionButtonStyle('approve', reviewLoading === verification.uploadId)}
                                >
                                  {reviewLoading === verification.uploadId ? (
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                      <div style={{
                                        width: '16px',
                                        height: '16px',
                                        border: '2px solid transparent',
                                        borderTop: '2px solid white',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite',
                                        marginRight: '8px'
                                      }}></div>
                                      Processing...
                                    </div>
                                  ) : (
                                    '✅ Approve'
                                  )}
                                </button>
                                <button
                                  onClick={() => reviewIdentityVerification(verification.uploadId, 'reject')}
                                  disabled={reviewLoading === verification.uploadId}
                                  style={actionButtonStyle('reject', reviewLoading === verification.uploadId)}
                                >
                                  ❌ Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Address Verifications Tab */}
            {selectedTab === 'address' && (
              <div>
                <div style={verificationCardStyle}>
                  <div style={verificationHeaderStyle(true)}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
                      📍 Address Verifications ({addressVerifications.length})
                    </h3>
                  </div>

                  {addressVerifications.length === 0 ? (
                    <div style={emptyStateStyle}>
                      <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📍</div>
                      <p style={{ color: '#6b7280', fontSize: '18px', margin: 0 }}>No pending address verifications</p>
                    </div>
                  ) : (
                    <div>
                      {addressVerifications.map((verification) => {
                        const isHovered = hoveredItems.has(verification.userId);
                        return (
                        <div 
                          key={verification.userId} 
                          style={{
                            ...verificationItemStyle,
                            ...(isHovered ? verificationItemHoverStyle : {})
                          }}
                          onMouseEnter={() => setHoveredItems(prev => new Set(prev).add(verification.userId))}
                          onMouseLeave={() => setHoveredItems(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(verification.userId);
                            return newSet;
                          })}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                                <div style={{
                                  ...userAvatarStyle,
                                  backgroundColor: '#dcfce7',
                                  color: '#16a34a'
                                }}>
                                  <span>
                                    {verification.fullName?.charAt(0).toUpperCase() || 'U'}
                                  </span>
                                </div>
                                <div>
                                  <h4 style={{ fontWeight: '600', color: '#111827', margin: '0 0 4px 0', fontSize: '16px' }}>{verification.fullName || 'Unknown User'}</h4>
                                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{verification.email || 'No email'}</p>
                                </div>
                              </div>

                              <div style={addressInfoContainerStyle}>
                                <h5 style={{ fontWeight: '500', color: '#374151', marginBottom: '8px', margin: '0 0 8px 0', fontSize: '15px' }}>Address Details:</h5>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                  <p style={{ margin: '0 0 4px 0' }}>{verification.address.street}</p>
                                  <p style={{ margin: '0 0 4px 0' }}>{verification.address.city}, {verification.address.state}</p>
                                  <p style={{ margin: 0 }}>{verification.address.country}</p>
                                </div>
                              </div>

                              <div style={{ marginTop: '12px', fontSize: '14px' }}>
                                <span style={{ fontWeight: '500', color: '#374151' }}>Submitted:</span>
                                <span style={{ marginLeft: '8px', color: '#6b7280' }}>{new Date(verification.submittedAt).toLocaleDateString()}</span>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '8px', marginLeft: '24px' }}>
                              <button
                                onClick={() => reviewAddressVerification(verification.userId, 'approve')}
                                disabled={reviewLoading === verification.userId}
                                style={actionButtonStyle('approve', reviewLoading === verification.userId)}
                              >
                                {reviewLoading === verification.userId ? (
                                  <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <div style={{
                                      width: '16px',
                                      height: '16px',
                                      border: '2px solid transparent',
                                      borderTop: '2px solid white',
                                      borderRadius: '50%',
                                      animation: 'spin 1s linear infinite',
                                      marginRight: '8px'
                                    }}></div>
                                    Processing...
                                  </div>
                                ) : (
                                  '✅ Approve'
                                )}
                              </button>
                              <button
                                onClick={() => reviewAddressVerification(verification.userId, 'reject')}
                                disabled={reviewLoading === verification.userId}
                                style={actionButtonStyle('reject', reviewLoading === verification.userId)}
                              >
                                ❌ Reject
                              </button>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
    </div>
  );
};

export default Verifications;