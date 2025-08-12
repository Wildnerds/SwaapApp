import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import COLORS from '@constants/colors';

// Dispute Screens
import CreateDisputeScreen from '@screens/CreateDisputeScreen';
import DisputesListScreen from '@screens/DisputesListScreen';
import DisputeDetailsScreen from '@screens/DisputeDetailsScreen';

// Admin Screens (if user has admin role)
import AdminDisputeDashboard from '@screens/admin/AdminDisputeDashboard';

const DisputeStack = createNativeStackNavigator();

export type DisputeStackParamList = {
  DisputesList: undefined;
  CreateDispute: {
    orderId: string;
    orderNumber: string;
    respondentId: string;
    respondentName: string;
  };
  DisputeDetails: {
    disputeId: string;
  };
  // Admin routes
  AdminDisputeDashboard: undefined;
  AdminDisputeDetails: {
    disputeId: string;
  };
  AssignArbitrator: {
    disputeId: string;
  };
  BulkUpdateDisputes: undefined;
  DisputeAnalytics: undefined;
  ArbitratorManagement: undefined;
  CreateArbitrator: undefined;
};

const commonScreenOptions = {
  headerStyle: {
    backgroundColor: '#121212',
  },
  headerTintColor: COLORS.gold,
  headerTitleStyle: {
    fontWeight: 'bold' as 'bold',
  },
  headerBackTitleVisible: false,
};

export default function DisputeStackNavigator() {
  return (
    <DisputeStack.Navigator
      screenOptions={commonScreenOptions}
    >
      <DisputeStack.Screen
        name="DisputesList"
        component={DisputesListScreen}
        options={{
          title: 'Disputes',
          headerShown: false, // DisputesListScreen handles its own header
        }}
      />
      
      <DisputeStack.Screen
        name="CreateDispute"
        component={CreateDisputeScreen}
        options={{
          title: 'Create Dispute',
          headerShown: false, // CreateDisputeScreen handles its own header
          presentation: 'modal',
        }}
      />
      
      <DisputeStack.Screen
        name="DisputeDetails"
        component={DisputeDetailsScreen}
        options={{
          title: 'Dispute Details',
          headerShown: false, // DisputeDetailsScreen handles its own header
        }}
      />
      
      {/* Admin Screens */}
      <DisputeStack.Screen
        name="AdminDisputeDashboard"
        component={AdminDisputeDashboard}
        options={{
          title: 'Dispute Management',
          headerShown: false, // AdminDisputeDashboard handles its own header
        }}
      />
    </DisputeStack.Navigator>
  );
}

// Helper function to add dispute navigation to main navigator
export const addDisputeRoutesToMainStack = (MainStack: any) => {
  return (
    <>
      {/* Add individual dispute screens to main stack */}
      <MainStack.Screen
        name="DisputesList"
        component={DisputesListScreen}
        options={{
          title: 'My Disputes',
          ...commonScreenOptions,
          headerShown: false,
        }}
      />
      
      <MainStack.Screen
        name="CreateDispute"
        component={CreateDisputeScreen}
        options={{
          title: 'Create Dispute',
          ...commonScreenOptions,
          headerShown: false,
          presentation: 'modal',
        }}
      />
      
      <MainStack.Screen
        name="DisputeDetails"
        component={DisputeDetailsScreen}
        options={{
          title: 'Dispute',
          ...commonScreenOptions,
          headerShown: false,
        }}
      />
      
      <MainStack.Screen
        name="AdminDisputeDashboard"
        component={AdminDisputeDashboard}
        options={{
          title: 'Dispute Management',
          ...commonScreenOptions,
          headerShown: false,
        }}
      />
    </>
  );
};