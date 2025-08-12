// components/IdentityVerification/DocumentTypeSelector.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import COLORS from '@/constants/colors';

interface DocumentType {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  description: string;
  requiresBack: boolean;
  autoVerifiable: boolean;
}

interface DocumentTypeSelectorProps {
  documentTypes: DocumentType[];
  selectedDocType: string;
  onSelectDocType: (id: string) => void;
  onContinue: () => void;
}

export const DocumentTypeSelector: React.FC<DocumentTypeSelectorProps> = ({
  documentTypes,
  selectedDocType,
  onSelectDocType,
  onContinue,
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Select Document Type</Text>
      <Text style={styles.sectionSubtitle}>
        Choose the type of ID you want to upload
      </Text>

      {documentTypes.map((docType) => (
        <TouchableOpacity
          key={docType.id}
          style={[
            styles.docTypeCard,
            selectedDocType === docType.id && styles.selectedDocTypeCard,
          ]}
          onPress={() => onSelectDocType(docType.id)}
        >
          <View style={styles.docTypeIcon}>
            <Text style={styles.docTypeIconText}>{docType.icon}</Text>
            {!docType.autoVerifiable && (
              <View style={styles.manualReviewBadge}>
                <Text style={styles.manualReviewText}>👤</Text>
              </View>
            )}
          </View>
          
          <View style={styles.docTypeInfo}>
            <Text style={[
              styles.docTypeTitle,
              selectedDocType === docType.id && styles.selectedDocTypeTitle,
            ]}>
              {docType.title}
            </Text>
            <Text style={styles.docTypeSubtitle}>{docType.subtitle}</Text>
            <Text style={styles.docTypeDescription}>{docType.description}</Text>
            {!docType.autoVerifiable && (
              <Text style={styles.manualReviewLabel}>👤 Manual review</Text>
            )}
          </View>
          
          <View style={styles.docTypeSelector}>
            <View style={[
              styles.radioButton,
              selectedDocType === docType.id && styles.radioButtonSelected,
            ]}>
              {selectedDocType === docType.id && (
                <View style={styles.radioButtonInner} />
              )}
            </View>
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[
          styles.continueButton,
          !selectedDocType && styles.disabledButton,
        ]}
        onPress={onContinue}
        disabled={!selectedDocType}
      >
        <Text style={[
          styles.continueButtonText,
          !selectedDocType && styles.disabledButtonText,
        ]}>
          Continue →
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 20,
  },
  docTypeCard: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
  },
  selectedDocTypeCard: {
    borderColor: COLORS.gold,
    backgroundColor: '#1A1A0F',
  },
  docTypeIcon: {
    position: 'relative',
    marginRight: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTypeIconText: {
    fontSize: 24,
  },
  manualReviewBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#666',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualReviewText: {
    fontSize: 10,
  },
  docTypeInfo: {
    flex: 1,
  },
  docTypeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  selectedDocTypeTitle: {
    color: COLORS.gold,
  },
  docTypeSubtitle: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 4,
  },
  docTypeDescription: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  manualReviewLabel: {
    fontSize: 11,
    color: '#AAAAAA',
    fontWeight: '600',
    marginTop: 4,
  },
  docTypeSelector: {
    marginLeft: 16,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: COLORS.gold,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.gold,
  },
  continueButton: {
    backgroundColor: COLORS.gold,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#333',
  },
  continueButtonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButtonText: {
    color: '#666',
  },
});