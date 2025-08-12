// components/IdentityVerification/VerificationStatusChecker.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { apiClient } from '@/config';
import COLORS from '@/constants/colors';

interface VerificationStatus {
  verificationId: string;
  status: 'pending_review' | 'under_review' | 'approved' | 'rejected' | 'requires_resubmission';
  documentType: string;
  submittedAt: string;
  estimatedCompletion?: string;
  reviewNotes?: string;
  reviewProgress?: number; // 0-100 percentage
}

interface VerificationStatusCheckerProps {
  onClose: () => void;
  userId?: string;
}

export const VerificationStatusChecker: React.FC<VerificationStatusCheckerProps> = ({
  onClose,
  userId
}) => {
  const [verifications, setVerifications] = useState<VerificationStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVerificationStatus();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchVerificationStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchVerificationStatus = async () => {
    try {
      console.log('🔍 Fetching verification status...');
      const response = await apiClient.get('/api/verification/user-verifications');
      console.log('📥 Status response:', response);
      
      setVerifications(response.data?.verifications || []);
      setError(null);
      
      // Log debug info if available
      if (response.data?.debug) {
        console.log('🐛 Debug info:', response.data.debug);
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch verification status:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.status,
        response: error.response
      });
      setError('Failed to load verification status');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending_review':
        return {
          icon: '⏳',
          title: 'We are reviewing your ID',
          subtitle: 'Your documents have been received and are in our review queue',
          color: '#FFA500'
        };
      case 'under_review':
        return {
          icon: '🔍',
          title: 'ID Review in Progress',
          subtitle: 'Our verification team is currently reviewing your documents',
          color: '#4A90E2'
        };
      case 'approved':
        return {
          icon: '✅',
          title: 'ID Verification Approved',
          subtitle: 'Your identity has been successfully verified',
          color: '#4CAF50'
        };
      case 'rejected':
        return {
          icon: '❌',
          title: 'ID Verification Rejected',
          subtitle: 'There was an issue with your documents. Please resubmit.',
          color: '#F44336'
        };
      case 'requires_resubmission':
        return {
          icon: '📄',
          title: 'Resubmission Required',
          subtitle: 'Please upload clearer images of your documents',
          color: '#FF9800'
        };
      default:
        return {
          icon: '❓',
          title: 'Unknown Status',
          subtitle: 'Please contact support for assistance',
          color: '#666'
        };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDocumentTypeDisplay = (docType: string) => {
    const types: { [key: string]: string } = {
      'nin': 'National Identity Number (NIN)',
      'drivers_license': 'Driver\'s License',
      'passport': 'International Passport',
      'voters_card': 'Voter\'s Card (PVC)'
    };
    return types[docType] || docType;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Verification Status</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.gold} />
          <Text style={styles.loadingText}>Loading verification status...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Verification Status</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchVerificationStatus} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (verifications.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Verification Status</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📄</Text>
          <Text style={styles.emptyTitle}>No Verifications Found</Text>
          <Text style={styles.emptySubtitle}>You haven't submitted any ID verification requests yet.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Verification Status</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {verifications.map((verification, index) => {
          const statusDisplay = getStatusDisplay(verification.status);
          
          return (
            <View key={verification.verificationId || index} style={styles.verificationCard}>
              <View style={styles.statusHeader}>
                <View style={styles.statusIconContainer}>
                  <Text style={styles.statusIcon}>{statusDisplay.icon}</Text>
                </View>
                <View style={styles.statusInfo}>
                  <Text style={[styles.statusTitle, { color: statusDisplay.color }]}>
                    {statusDisplay.title}
                  </Text>
                  <Text style={styles.statusSubtitle}>
                    {statusDisplay.subtitle}
                  </Text>
                </View>
              </View>

              <View style={styles.verificationDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Document Type:</Text>
                  <Text style={styles.detailValue}>
                    {getDocumentTypeDisplay(verification.documentType)}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Submitted:</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(verification.submittedAt)}
                  </Text>
                </View>

                {verification.estimatedCompletion && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Expected completion:</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(verification.estimatedCompletion)}
                    </Text>
                  </View>
                )}

                {verification.reviewNotes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Review Notes:</Text>
                    <Text style={styles.notesText}>{verification.reviewNotes}</Text>
                  </View>
                )}
              </View>

              {/* Progress bar for pending/under review status */}
              {(verification.status === 'pending_review' || verification.status === 'under_review') && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${verification.reviewProgress || (verification.status === 'under_review' ? 60 : 30)}%`,
                          backgroundColor: statusDisplay.color 
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {verification.status === 'under_review' ? 'Review in progress...' : 'Waiting for review...'}
                  </Text>
                </View>
              )}

              {verification.status === 'requires_resubmission' && (
                <TouchableOpacity style={styles.resubmitButton}>
                  <Text style={styles.resubmitButtonText}>Upload New Documents</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Status updates automatically every 30 seconds
        </Text>
        <TouchableOpacity onPress={fetchVerificationStatus} style={styles.refreshButton}>
          <Text style={styles.refreshButtonText}>🔄 Refresh Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#CCCCCC',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    color: '#CCCCCC',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#CCCCCC',
    fontSize: 16,
    textAlign: 'center',
  },
  verificationCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  statusIcon: {
    fontSize: 24,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
  },
  verificationDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#AAAAAA',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 2,
    textAlign: 'right',
  },
  notesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 18,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#AAAAAA',
    textAlign: 'center',
  },
  resubmitButton: {
    backgroundColor: COLORS.gold,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  resubmitButtonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#AAAAAA',
    marginBottom: 8,
  },
  refreshButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#333',
    borderRadius: 6,
  },
  refreshButtonText: {
    color: '#CCCCCC',
    fontSize: 14,
  },
});