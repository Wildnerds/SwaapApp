import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const SupportChatButton = () => {
  const navigation = useNavigation();

  const handlePress = () => {
    navigation.navigate('SupportChat'); // Ensure 'SupportChat' screen is registered in your navigator
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Ionicons name="chatbubble-ellipses-outline" size={20} color="white" />
      <Text style={styles.text}>Support</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    padding: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default SupportChatButton;
