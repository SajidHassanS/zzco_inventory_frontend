// redux/features/cash/cashSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Async thunk to get cash
export const getCash = createAsyncThunk("cash/getCash", async (_, thunkAPI) => {
  try {
    const response = await axios.get(`${BACKEND_URL}api/cash`, {
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to fetch cash data.");
  }
});

const cashSlice = createSlice({
  name: "cash",
  initialState: {
    cash: [],
    isLoading: false,
    error: null
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(getCash.pending, state => {
        state.isLoading = true;
      })
      .addCase(getCash.fulfilled, (state, action) => {
        state.isLoading = false;
        state.cash = action.payload;
      })
      .addCase(getCash.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  }
});

export default cashSlice.reducer;
