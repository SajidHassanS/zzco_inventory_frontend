import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import service from "./chequeService";

// Fetch pending/cleared/all — keep the name if you want
export const getPendingCheques = createAsyncThunk(
  "cheque/getCheques",
  async ({ status = "pending" } = {}, thunkAPI) => {
    try {
      return await service.getCheques({ status });
    } catch (e) {
      return thunkAPI.rejectWithValue(e?.response?.data || { message: "Fetch failed" });
    }
  }
);

// Update a single cheque by CHEQUE _id
export const updateChequeStatus = createAsyncThunk(
  "cheque/updateStatus",
  async ({ id, status, skipBankProcessing }, thunkAPI) => { // ✅ ADD skipBankProcessing HERE
    try {
      return await service.patchChequeStatus({ id, status, skipBankProcessing }); // ✅ AND HERE
    } catch (e) {
      return thunkAPI.rejectWithValue(e?.response?.data || { message: "Update failed" });
    }
  }
);

const chequeSlice = createSlice({
  name: "cheque",
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
        state.error = null;
      })
      .addCase(getPendingCheques.fulfilled, (state, action) => {
        state.isLoading = false;
        state.cheques = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(getPendingCheques.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.cheques = [];
      })
      .addCase(updateChequeStatus.fulfilled, (state, action) => {
        const updated = action.payload?.updatedDoc;
        if (!updated?._id) return;
        // Our table rows use the CHEQUE _id for _id
        const idx = state.cheques.findIndex((c) => c._id === updated._id);
        if (idx !== -1) {
          // only status/date might change; keep row shape
          state.cheques[idx] = { ...state.cheques[idx], status: !!updated.status };
        }
      });
  },
});

export default chequeSlice.reducer;