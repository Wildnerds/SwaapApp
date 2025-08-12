// ErrorBoundary.tsx
import React from 'react';
import { View, Text } from 'react-native';

export class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null as any };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.log('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
          <Text style={{ fontSize: 18, color: 'red' }}>Something went wrong:</Text>
          <Text selectable>{this.state.error?.message}</Text>
        </View>
      );
    }

    return this.props.children;
  }
}
