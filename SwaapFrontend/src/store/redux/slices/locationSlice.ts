// src/store/redux/slices/locationSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface NearbyUser {
  _id: string;
  fullName: string;
  email: string;
  location: {
    latitude: number;
    longitude: number;
  };
  distance: number;
  isOnline: boolean;
  profileImage?: string;
  trustScore: number;
}

interface LocationState {
  nearbyUsers: NearbyUser[];
  loading: boolean;
  error: string | null;
  userLocation: {
    latitude: number;
    longitude: number;
  } | null;
}

const initialState: LocationState = {
  nearbyUsers: [],
  loading: false,
  error: null,
  userLocation: null,
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setNearbyUsers: (state, action: PayloadAction<NearbyUser[]>) => {
      state.nearbyUsers = action.payload;
      state.loading = false;
      state.error = null;
    },
    setUserLocation: (state, action: PayloadAction<{ latitude: number; longitude: number }>) => {
      state.userLocation = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearNearbyUsers: (state) => {
      state.nearbyUsers = [];
    },
  },
});

export const { 
  setLoading, 
  setNearbyUsers, 
  setUserLocation, 
  setError, 
  clearNearbyUsers 
} = locationSlice.actions;

export default locationSlice.reducer;