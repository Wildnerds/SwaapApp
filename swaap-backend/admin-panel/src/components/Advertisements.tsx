import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../api';

interface Advertisement {
  _id: string;
  title: string;
  subtitle?: string;
  image: string;
  type: 'admin' | 'user_product' | 'external';
  status: 'active' | 'inactive' | 'pending';
  priority: number;
  impressions: number;
  clicks: number;
  externalUrl?: string;
  startDate: string;
  endDate: string;
}

interface AdvertisementStats {
  totals: {
    totalAds: number;
    activeAds: number;
    userAds: number;
    adminAds: number;
  };
  performance: {
    totalImpressions: number;
    totalClicks: number;
    averageCTR: string;
  };
  revenue: {
    totalRevenue: number;
  };
  topPerforming: Array<{
    _id: string;
    title: string;
    type: string;
    clicks: number;
    impressions: number;
  }>;
}

const Advertisements = () => {
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [stats, setStats] = useState<AdvertisementStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'manage' | 'create'>('overview');
  const [filter, setFilter] = useState({ status: 'all', type: 'all' });
  const [createLoading, setCreateLoading] = useState(false);

  // Form state for creating advertisements
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    type: 'admin',
    externalUrl: '',
    priority: 5,
    startDate: '',
    endDate: '',
    images: [] as File[]
  });

  // Fetch advertisement statistics
  const fetchStats = async () => {
    try {
      const data = await adminApi.getAdvertisements();
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching advertisement stats:', err);
      setError('Failed to fetch advertisement statistics');
    }
  };

  // Fetch advertisements
  const fetchAdvertisements = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await adminApi.getAdvertisements();
      setAdvertisements(data.advertisements);
    } catch (err) {
      console.error('Error fetching advertisements:', err);
      setError('Failed to fetch advertisements');
    } finally {
      setLoading(false);
    }
  };

  // Create advertisement
  const createAdvertisement = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('subtitle', formData.subtitle);
      formDataToSend.append('type', formData.type);
      formDataToSend.append('priority', formData.priority.toString());
      
      if (formData.externalUrl) {
        formDataToSend.append('externalUrl', formData.externalUrl);
      }
      
      if (formData.startDate) {
        formDataToSend.append('startDate', formData.startDate);
      }
      
      if (formData.endDate) {
        formDataToSend.append('endDate', formData.endDate);
      }
      
      // Append all selected images
      formData.images.forEach((image, index) => {
        formDataToSend.append(`images`, image);
      });

      const result = await adminApi.createAdvertisement(formDataToSend);

      if (result) {
        // Reset form
        setFormData({
          title: '',
          subtitle: '',
          type: 'admin',
          externalUrl: '',
          priority: 5,
          startDate: '',
          endDate: '',
          images: []
        });
        
        // Refresh data and switch to manage tab
        fetchAdvertisements();
        fetchStats();
        setSelectedTab('manage');
        alert('Advertisement created successfully!');
      }
    } catch (err: any) {
      console.error('Error creating advertisement:', err);
      alert('Failed to create advertisement: ' + err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  // Delete advertisement
  const deleteAdvertisement = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this advertisement?')) return;
    
    try {
      await adminApi.deleteAdvertisement(id);
      fetchAdvertisements();
      fetchStats();
    } catch (err) {
      console.error('Error deleting advertisement:', err);
      alert('Failed to delete advertisement');
    }
  };

  useEffect(() => {
    fetchStats();
    fetchAdvertisements();
  }, [filter]);

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

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.8rem', color: 'white' }}>📺 Advertisement Management</h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '1rem' }}>Manage carousel advertisements and track performance</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setSelectedTab('overview')}
            style={tabButtonStyle(selectedTab === 'overview', '#667eea')}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setSelectedTab('manage')}
            style={tabButtonStyle(selectedTab === 'manage', '#11998e')}
          >
            📺 Manage Ads
          </button>
          <button
            onClick={() => setSelectedTab('create')}
            style={tabButtonStyle(selectedTab === 'create', '#28a745')}
          >
            ➕ Create Ad
          </button>
        </div>
      </div>

      {error && (
        <div style={errorStyle}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '10px' }}>⚠️</span>
            {error}
          </div>
        </div>
      )}

      {selectedTab === 'overview' && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>📊 Advertisement Statistics</h3>
          
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
              <p>Loading statistics...</p>
            </div>
          ) : stats ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '25px',
                borderRadius: '12px',
                textAlign: 'center',
                boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📺</div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', opacity: 0.9 }}>Total Ads</h4>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{stats.totals.totalAds}</p>
              </div>
              
              <div style={{
                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                color: 'white',
                padding: '25px',
                borderRadius: '12px',
                textAlign: 'center',
                boxShadow: '0 8px 25px rgba(17, 153, 142, 0.3)'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>✅</div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', opacity: 0.9 }}>Active Ads</h4>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{stats.totals.activeAds}</p>
              </div>
              
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '25px',
                borderRadius: '12px',
                textAlign: 'center',
                boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>👀</div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', opacity: 0.9 }}>Total Impressions</h4>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{stats.performance.totalImpressions.toLocaleString()}</p>
              </div>
              
              <div style={{
                background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                color: '#333',
                padding: '25px',
                borderRadius: '12px',
                textAlign: 'center',
                boxShadow: '0 8px 25px rgba(168, 237, 234, 0.3)'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🖱️</div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', opacity: 0.8 }}>Total Clicks</h4>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{stats.performance.totalClicks.toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '50px', color: '#6c757d' }}>
              <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📊</div>
              <p>No statistics available</p>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'create' && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 25px 0', fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>➕ Create New Advertisement</h3>
          
          <form onSubmit={createAdvertisement} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#333', marginBottom: '8px' }}>
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '14px',
                    transition: 'border-color 0.3s ease',
                    outline: 'none'
                  }}
                  placeholder="Enter advertisement title"
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#333', marginBottom: '8px' }}>
                  Subtitle
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '14px',
                    transition: 'border-color 0.3s ease',
                    outline: 'none'
                  }}
                  placeholder="Enter subtitle (optional)"
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#333', marginBottom: '8px' }}>
                  Type *
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    outline: 'none'
                  }}
                >
                  <option value="admin">Admin Advertisement</option>
                  <option value="external">External Link</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#333', marginBottom: '8px' }}>
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    outline: 'none'
                  }}
                >
                  <option value={1}>🔻 Low (1)</option>
                  <option value={5}>🔶 Medium (5)</option>
                  <option value={10}>🔺 High (10)</option>
                </select>
              </div>

              {formData.type === 'external' && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#333', marginBottom: '8px' }}>
                    External URL *
                  </label>
                  <input
                    type="url"
                    value={formData.externalUrl}
                    onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      border: '2px solid #e9ecef',
                      borderRadius: '8px',
                      fontSize: '14px',
                      transition: 'border-color 0.3s ease',
                      outline: 'none'
                    }}
                    placeholder="https://example.com"
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#333', marginBottom: '8px' }}>
                  📅 Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#333', marginBottom: '8px' }}>
                  📅 End Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#333', marginBottom: '8px' }}>
                📸 Advertisement Image *
              </label>
              <div style={{
                border: '3px dashed #667eea',
                borderRadius: '12px',
                padding: '30px',
                textAlign: 'center',
                backgroundColor: '#f8f9ff',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📷</div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  required
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setFormData({ ...formData, images: files });
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    backgroundColor: 'white'
                  }}
                />
                <p style={{ margin: '15px 0 0 0', fontSize: '14px', color: '#6c757d' }}>
                  Upload images for your advertisement (JPG, PNG, GIF) - Multiple files supported
                </p>
                {formData.images.length > 0 && (
                  <div style={{
                    marginTop: '15px',
                    padding: '10px',
                    backgroundColor: '#d4edda',
                    borderRadius: '8px',
                    color: '#155724'
                  }}>
                    ✅ Selected {formData.images.length} image{formData.images.length > 1 ? 's' : ''}: 
                    <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px' }}>
                      {formData.images.map((file, index) => (
                        <li key={index} style={{ fontSize: '12px' }}>{file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', paddingTop: '20px', borderTop: '1px solid #e9ecef' }}>
              <button
                type="submit"
                disabled={createLoading}
                style={{
                  background: createLoading ? '#6c757d' : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                  color: 'white',
                  padding: '15px 25px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: createLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 8px rgba(40, 167, 69, 0.3)',
                  transition: 'all 0.3s ease'
                }}
              >
                {createLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: '18px',
                      height: '18px',
                      border: '2px solid transparent',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginRight: '10px'
                    }}></div>
                    Creating...
                  </div>
                ) : (
                  '📺 Create Advertisement'
                )}
              </button>
              
              <button
                type="button"
                onClick={() => setSelectedTab('manage')}
                style={{
                  background: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)',
                  color: 'white',
                  padding: '15px 25px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 8px rgba(108, 117, 125, 0.3)',
                  transition: 'all 0.3s ease'
                }}
              >
                ❌ Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedTab === 'manage' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Manage Advertisements</h3>
            <div className="flex gap-4">
              <select
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                className="border rounded px-3 py-1"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
              
              <select
                value={filter.type}
                onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                className="border rounded px-3 py-1"
              >
                <option value="all">All Types</option>
                <option value="admin">Admin Ads</option>
                <option value="user_product">User Product Ads</option>
                <option value="external">External Ads</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading advertisements...</div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="grid grid-cols-1 gap-4 p-6">
                {advertisements.map((ad) => (
                  <div key={ad._id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4">
                        <img
                          src={ad.image}
                          alt={ad.title}
                          className="w-24 h-24 object-cover rounded"
                        />
                        <div>
                          <h4 className="font-semibold text-lg">{ad.title}</h4>
                          {ad.subtitle && (
                            <p className="text-gray-600">{ad.subtitle}</p>
                          )}
                          <div className="flex gap-4 mt-2 text-sm text-gray-500">
                            <span>Type: {ad.type}</span>
                            <span>Status: <span className={`capitalize ${
                              ad.status === 'active' ? 'text-green-600' :
                              ad.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                            }`}>{ad.status}</span></span>
                            <span>Priority: {ad.priority}</span>
                          </div>
                          <div className="flex gap-4 mt-1 text-sm text-gray-500">
                            <span>Impressions: {ad.impressions}</span>
                            <span>Clicks: {ad.clicks}</span>
                            <span>CTR: {ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : 0}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => deleteAdvertisement(ad._id)}
                          className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors duration-200"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Advertisements;