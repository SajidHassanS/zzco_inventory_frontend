// redux/features/cash/cashSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL; // e.g. "http://localhost:5000/"

// Get current cash summary + rows
export const getCash = createAsyncThunk("cash/getCash", async (_, thunkAPI) => {
  try {
    // 🚨 use the route your server actually exposes
    const { data } = await axios.get(`${BACKEND_URL}api/cash/all`, {
      withCredentials: true,
    });
    // data shape: { totalBalance, latestEntry, allEntries }
    return data;
  } catch (error) {
    return thunkAPI.rejectWithValue(
      error?.response?.data?.message || "Failed to fetch cash data."
    );
  }
});

const cashSlice = createSlice({
  name: "cash",
  initialState: {
    // Store the object your API returns (NOT an array)
    cash: null,            // { totalBalance, latestEntry, allEntries } | null
    isLoading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getCash.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getCash.fulfilled, (state, action) => {
        state.isLoading = false;
        state.cash = action.payload; // object with totalBalance, allEntries, ...
      })
      .addCase(getCash.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch cash data.";
      });
  },
});

export default cashSlice.reducer;

// Handy selectors (optional but recommended)
export const selectCashObject = (s) => s.cash.cash; // whole object
export const selectCashRows   = (s) => s.cash.cash?.allEntries ?? [];
export const selectCashTotal  = (s) => Number(s.cash.cash?.totalBalance ?? 0);
export const selectCashLoading= (s) => s.cash.isLoading;
export const selectCashError  = (s) => s.cash.error;
