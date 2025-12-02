// redux/features/shipper/shipperSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import shipperService from "./shipperService";

const initialState = {
  shippers: [],
  shipper: null,
  transactionHistory: [],
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: "",
};

// Create shipper
export const createShipper = createAsyncThunk(
  "shipper/create",
  async (shipperData, thunkAPI) => {
    try {
      return await shipperService.createShipper(shipperData);
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Failed to create shipper";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get all shippers
export const getShippers = createAsyncThunk(
  "shipper/getAll",
  async (_, thunkAPI) => {
    try {
      return await shipperService.getAllShippers();
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Failed to fetch shippers";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get single shipper
export const getShipper = createAsyncThunk(
  "shipper/get",
  async (id, thunkAPI) => {
    try {
      return await shipperService.getShipper(id);
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Failed to fetch shipper";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Update shipper
export const updateShipper = createAsyncThunk(
  "shipper/update",
  async ({ id, data }, thunkAPI) => {
    try {
      return await shipperService.updateShipper(id, data);
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Failed to update shipper";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Delete shipper
export const deleteShipper = createAsyncThunk(
  "shipper/delete",
  async (id, thunkAPI) => {
    try {
      await shipperService.deleteShipper(id);
      return id;
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Failed to delete shipper";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Add balance (pay shipper)
export const addShipperBalance = createAsyncThunk(
  "shipper/addBalance",
  async ({ id, data }, thunkAPI) => {
    try {
      return await shipperService.addBalance(id, data);
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Failed to add balance";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Apply discount
export const applyShipperDiscount = createAsyncThunk(
  "shipper/discount",
  async ({ id, data }, thunkAPI) => {
    try {
      return await shipperService.applyDiscount(id, data);
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Failed to apply discount";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get transaction history
export const getShipperTransactions = createAsyncThunk(
  "shipper/getTransactions",
  async (id, thunkAPI) => {
    try {
      return await shipperService.getTransactionHistory(id);
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Failed to fetch transactions";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const shipperSlice = createSlice({
  name: "shipper",
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = "";
    },
    clearShipper: (state) => {
      state.shipper = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create
      .addCase(createShipper.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createShipper.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.shippers.unshift(action.payload.shipper);
      })
      .addCase(createShipper.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get all
      .addCase(getShippers.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getShippers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.shippers = action.payload;
      })
      .addCase(getShippers.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get single
      .addCase(getShipper.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getShipper.fulfilled, (state, action) => {
        state.isLoading = false;
        state.shipper = action.payload;
      })
      .addCase(getShipper.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Update
      .addCase(updateShipper.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateShipper.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        const index = state.shippers.findIndex(
          (s) => s._id === action.payload.shipper._id
        );
        if (index !== -1) {
          state.shippers[index] = action.payload.shipper;
        }
      })
      .addCase(updateShipper.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Delete
      .addCase(deleteShipper.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteShipper.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.shippers = state.shippers.filter((s) => s._id !== action.payload);
      })
      .addCase(deleteShipper.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Add balance
      .addCase(addShipperBalance.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(addShipperBalance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        const index = state.shippers.findIndex(
          (s) => s._id === action.payload.shipper._id
        );
        if (index !== -1) {
          state.shippers[index] = action.payload.shipper;
        }
      })
      .addCase(addShipperBalance.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Apply discount
      .addCase(applyShipperDiscount.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(applyShipperDiscount.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        const index = state.shippers.findIndex(
          (s) => s._id === action.payload.shipper._id
        );
        if (index !== -1) {
          state.shippers[index] = action.payload.shipper;
        }
      })
      .addCase(applyShipperDiscount.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get transactions
      .addCase(getShipperTransactions.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getShipperTransactions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.transactionHistory = action.payload.transactionHistory;
      })
      .addCase(getShipperTransactions.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { reset, clearShipper } = shipperSlice.actions;
export default shipperSlice.reducer;