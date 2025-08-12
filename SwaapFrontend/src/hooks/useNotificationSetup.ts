import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { AppState } from 'react-native';

async function registerForPushNotificationsAsync() {
  let token;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Permission for notifications not granted!');
      return;
    }

    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('✅ Expo push token:', token);
  } else {
    console.log('❌ Must use physical device for push notifications');
  }

  return token;
}

export const useNotificationSetup = () => {
  useEffect(() => {
    const setup = async () => {
      await registerForPushNotificationsAsync();
    };

    setup();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        (async () => {
          await Notifications.setBadgeCountAsync(0);
        })();
      }
    });

    return () => sub.remove();
  }, []);
};
