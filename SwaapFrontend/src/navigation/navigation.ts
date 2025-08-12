// navigation/navigation.ts
import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types'; // update path if needed

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
