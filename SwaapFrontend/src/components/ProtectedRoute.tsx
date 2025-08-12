// src/components/ProtectedRoute.tsx
import React, { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import COLORS from '@constants/colors';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  showLoginButton?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback,
  showLoginButton = true,
}) => {
  const { user, loading, isAuthenticated } = useAuth();
  const navigation = useNavigation();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  if (!user) {
    if (fallback) return <>{fallback}</>;

    return (
      <View style={styles.container}>
        <Text style={styles.message}>Please log in to access this feature</Text>
        {showLoginButton && (
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login' as never)}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    fontSize: 16,
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: COLORS.gold,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  loginButtonText: {
    color: COLORS.black,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ProtectedRoute;
