// src/utils/sendPushNotification.ts
export const sendPushNotification = async (
  expoPushToken: string,
  title: string,
  body: string
) => {
  if (!expoPushToken || !expoPushToken.startsWith('ExponentPushToken')) return;

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: expoPushToken,
      sound: 'default',
      title,
      body,
    }),
  });
};
