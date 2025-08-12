import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const PostSuccessScreen = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <Text style={styles.successIcon}>🎉</Text>
      </View>

      <Text style={styles.title}>Item Posted Successfully</Text>
      <Text style={styles.message}>
        Your item is now live and visible to other Swaapers.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
        })}
        
      >
        <Text style={styles.buttonText}>Go Back Home</Text>
      </TouchableOpacity>
    </View>
  );
};

export default PostSuccessScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconWrapper: {
    backgroundColor: '#1a1a1a',
    padding: 30,
    borderRadius: 100,
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 48,
    color: '#FFD700',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: {
    color: '#0d0d0d',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
