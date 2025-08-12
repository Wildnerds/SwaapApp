// src/utils/ScreenDebugUtils.tsx
import React from 'react';
import { View, Text, StyleSheet, Button, ScrollView } from 'react-native';

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error; resetError: () => void }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('🚨 Error caught by boundary:', error);
    console.error('📍 Error info:', errorInfo);
    console.error('📚 Component stack:', errorInfo.componentStack);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent 
            error={this.state.error!} 
            resetError={this.resetError} 
          />
        );
      }

      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>🚨 Screen Crashed!</Text>
          <Text style={styles.errorSubtitle}>
            {this.state.error?.name || 'Unknown Error'}
          </Text>
          <ScrollView style={styles.errorScrollView}>
            <Text style={styles.errorMessage}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </Text>
            <Text style={styles.errorStack}>
              {this.state.error?.stack || 'No stack trace available'}
            </Text>
          </ScrollView>
          <Button 
            title="Reload Screen" 
            onPress={this.resetError}
            color="#FFC107"
          />
        </View>
      );
    }

    return this.props.children;
  }
}

// Screen-level Error Boundary
const ScreenErrorBoundary: React.FC<{ 
  screenName: string; 
  children: React.ReactNode 
}> = ({ screenName, children }) => {
  return (
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <View style={styles.screenErrorContainer}>
          <Text style={styles.screenErrorTitle}>
            ❌ {screenName} Screen Crashed
          </Text>
          <Text style={styles.screenErrorMessage}>
            {error.message}
          </Text>
          <View style={styles.buttonContainer}>
            <Button 
              title="Try Again" 
              onPress={resetError}
              color="#FFC107"
            />
          </View>
        </View>
      )}
    >
      {children}
    </ErrorBoundary>
  );
};

// Debug wrapper for screens
export const withScreenDebug = (
  ScreenComponent: React.ComponentType<any>, 
  screenName: string
) => {
  return (props: any) => {
    console.log(`🎬 Rendering ${screenName} with props:`, props);
    
    return (
      <ScreenErrorBoundary screenName={screenName}>
        <ScreenComponent {...props} />
      </ScreenErrorBoundary>
    );
  };
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF5252',
    marginBottom: 10,
  },
  errorSubtitle: {
    fontSize: 18,
    color: '#FFC107',
    marginBottom: 20,
  },
  errorMessage: {
    fontSize: 14,
    color: 'white',
    marginBottom: 10,
  },
  errorScrollView: {
    maxHeight: 200,
    width: '100%',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
  },
  errorStack: {
    fontSize: 10,
    color: '#888',
    fontFamily: 'monospace',
  },
  screenErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 20,
  },
  screenErrorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF5252',
    marginBottom: 10,
    textAlign: 'center',
  },
  screenErrorMessage: {
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    marginTop: 10,
  },
});