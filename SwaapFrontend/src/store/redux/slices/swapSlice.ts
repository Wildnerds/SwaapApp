// src/store/redux/slices/swapSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Swap {
  _id: string;
  fromUser: string;
  toUser: string;
  offeredProduct: string;
  requestedProduct: string;
  message?: string;
  status: string;
  createdAt?: string;
}

interface SwapState {
  swaps: Swap[];
}

const initialState: SwapState = {
  swaps: [],
};

export const swapSlice = createSlice({
  name: 'swap',
  initialState,
  reducers: {
    addSwap: (state, action: PayloadAction<Swap>) => {
      state.swaps.unshift(action.payload); // add latest to top
    },
    clearSwaps: (state) => {
      state.swaps = [];
    },
  },
});

export const { addSwap, clearSwaps } = swapSlice.actions;
export default swapSlice.reducer;
