// src/redux/features/shipper/shipperSlice.js
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
        error?.response?.data?.message || error.message || "Failed to create shipper";
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
        error?.response?.data?.message || error.message || "Failed to fetch shippers";
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
        error?.response?.data?.message || error.message || "Failed to fetch shipper";
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
        error?.response?.data?.message || error.message || "Failed to update shipper";
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
        error?.response?.data?.message || error.message || "Failed to delete shipper";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Add balance (PAY shipper; reduces payable)
export const addShipperBalance = createAsyncThunk(
  "shipper/addBalance",
  async ({ id, data }, thunkAPI) => {
    try {
      return await shipperService.addBalance(id, data);
    } catch (error) {
      const message =
        error?.response?.data?.message || error.message || "Failed to add balance";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

/**
 * Minus balance (CREDIT ONLY; increases payable).
 * This is an alias around the same /add-balance endpoint but forces paymentMethod=credit.
 * Supports payload shape { id, formData } (FormData) OR { id, data } (plain object).
 */
export const minusShipperBalance = createAsyncThunk(
  "shipper/minusBalance",
  async ({ id, formData, data }, thunkAPI) => {
    try {
      // Prefer provided formData; else fallback to data
      let payload = formData || data;

      // Ensure paymentMethod=credit is enforced
      if (payload instanceof FormData) {
        if (payload.has("paymentMethod")) payload.set("paymentMethod", "credit");
        else payload.append("paymentMethod", "credit");
      } else {
        payload = {
          ...(payload || {}),
          paymentMethod: "credit",
        };
      }

      return await shipperService.addBalance(id, payload);
    } catch (error) {
      const message =
        error?.response?.data?.message || error.message || "Failed to add credit (minus)";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Apply discount (reduces payable)
export const applyShipperDiscount = createAsyncThunk(
  "shipper/discount",
  async ({ id, data }, thunkAPI) => {
    try {
      return await shipperService.applyDiscount(id, data);
    } catch (error) {
      const message =
        error?.response?.data?.message || error.message || "Failed to apply discount";
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
        error?.response?.data?.message || error.message || "Failed to fetch transactions";
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
        // API returns { message, shipper }
        if (action.payload?.shipper) {
          state.shippers.unshift(action.payload.shipper);
        }
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
        state.shippers = action.payload || [];
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
        state.shipper = action.payload || null;
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
        const updated = action.payload?.shipper;
        if (updated?._id) {
          const idx = state.shippers.findIndex((s) => s._id === updated._id);
          if (idx !== -1) state.shippers[idx] = updated;
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

      // Add balance (pay shipper)
      .addCase(addShipperBalance.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(addShipperBalance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        const updated = action.payload?.shipper;
        if (updated?._id) {
          const idx = state.shippers.findIndex((s) => s._id === updated._id);
          if (idx !== -1) state.shippers[idx] = updated;
        }
      })
      .addCase(addShipperBalance.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Minus balance (credit-only, increase payable)
      .addCase(minusShipperBalance.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(minusShipperBalance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        const updated = action.payload?.shipper;
        if (updated?._id) {
          const idx = state.shippers.findIndex((s) => s._id === updated._id);
          if (idx !== -1) state.shippers[idx] = updated;
        }
      })
      .addCase(minusShipperBalance.rejected, (state, action) => {
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
        const updated = action.payload?.shipper;
        if (updated?._id) {
          const idx = state.shippers.findIndex((s) => s._id === updated._id);
          if (idx !== -1) state.shippers[idx] = updated;
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
        state.transactionHistory = action.payload?.transactionHistory || [];
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
