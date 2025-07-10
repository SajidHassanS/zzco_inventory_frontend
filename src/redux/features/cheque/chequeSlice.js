import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
// const BACKEND_URL = "https://zzcoinventorymanagmentbackend.up.railway.app";
const API_URL = `${BACKEND_URL}api/cheques`;

export const getPendingCheques = createAsyncThunk(
  'cheque/getPendingCheques',
  async (_, thunkAPI) => {
    try {
      const response = await axios.get(`${API_URL}/pending`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

export const updateChequeStatus = createAsyncThunk(
  'cheque/updateStatus',
  async ({ id, status, type ,amount,bank}, thunkAPI) => {
    try {
      const response = await axios.patch(`${API_URL}/update-status/${id}`, { status, type,amount ,bank});
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

const chequeSlice = createSlice({
  name: 'cheque',
  initialState: {
    cheques: [],
    isLoading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getPendingCheques.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getPendingCheques.fulfilled, (state, action) => {
        state.isLoading = false;
        state.cheques = action.payload;
      })
      .addCase(getPendingCheques.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(updateChequeStatus.fulfilled, (state, action) => {
        const updatedCheque = action.payload.updatedDoc;
        const index = state.cheques.findIndex(cheque => cheque._id === updatedCheque._id);
        if (index !== -1) {
          state.cheques[index] = updatedCheque;
        }
      });
  },
});

export default chequeSlice.reducer;