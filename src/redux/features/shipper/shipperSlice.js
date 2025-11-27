// redux/features/shipper/shipperSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import shipperService from "./shipperService";
import { toast } from "react-toastify";

const initialState = {
  shippers: [],
  shipper: null,
  transactionHistory: [],
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: ""
};

// Get all shippers
export const getShippers = createAsyncThunk(
  "shippers/getAll",
  async (_, thunkAPI) => {
    try {
      return await shipperService.getShippers();
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get single shipper
export const getShipper = createAsyncThunk(
  "shippers/getOne",
  async (id, thunkAPI) => {
    try {
      return await shipperService.getShipper(id);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Create shipper
export const createShipper = createAsyncThunk(
  "shippers/create",
  async (shipperData, thunkAPI) => {
    try {
      const response = await shipperService.createShipper(shipperData);
      toast.success("Shipper added successfully");
      return response;
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Update shipper
export const updateShipper = createAsyncThunk(
  "shippers/update",
  async ({ id, shipperData }, thunkAPI) => {
    try {
      const response = await shipperService.updateShipper(id, shipperData);
      toast.success("Shipper updated successfully");
      return response;
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Delete shipper
export const deleteShipper = createAsyncThunk(
  "shippers/delete",
  async (id, thunkAPI) => {
    try {
      await shipperService.deleteShipper(id);
      toast.success("Shipper deleted successfully");
      return id;
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Add balance (pay shipper)
export const addShipperBalance = createAsyncThunk(
  "shippers/addBalance",
  async ({ id, formData }, thunkAPI) => {
    try {
      const response = await shipperService.addBalance(id, formData);
      toast.success(response.message || "Shipping fare recorded");
      return response;
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Minus balance (shipper pays you)
export const minusShipperBalance = createAsyncThunk(
  "shippers/minusBalance",
  async ({ id, formData }, thunkAPI) => {
    try {
      const response = await shipperService.minusBalance(id, formData);
      toast.success(response.message || "Payment received from shipper");
      return response;
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get transaction history
export const getShipperTransactions = createAsyncThunk(
  "shippers/getTransactions",
  async (id, thunkAPI) => {
    try {
      return await shipperService.getTransactionHistory(id);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Apply discount
export const applyShipperDiscount = createAsyncThunk(
  "shippers/applyDiscount",
  async ({ id, discountData }, thunkAPI) => {
    try {
      const response = await shipperService.applyDiscount(id, discountData);
      toast.success(response.message || "Discount applied successfully");
      return response;
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const shipperSlice = createSlice({
  name: "shipper",
  initialState,
  reducers: {
    reset: state => initialState,
    clearShipper: state => {
      state.shipper = null;
      state.transactionHistory = [];
    }
  },
  extraReducers: builder => {
    builder
      // Get all shippers
      .addCase(getShippers.pending, state => {
        state.isLoading = true;
      })
      .addCase(getShippers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.shippers = action.payload;
      })
      .addCase(getShippers.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get single shipper
      .addCase(getShipper.pending, state => {
        state.isLoading = true;
      })
      .addCase(getShipper.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.shipper = action.payload;
      })
      .addCase(getShipper.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Create shipper
      .addCase(createShipper.pending, state => {
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
      // Update shipper
      .addCase(updateShipper.pending, state => {
        state.isLoading = true;
      })
      .addCase(updateShipper.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        const index = state.shippers.findIndex(
          s => s._id === action.payload.shipper._id
        );
        if (index !== -1) {
          state.shippers[index] = action.payload.shipper;
        }
        state.shipper = action.payload.shipper;
      })
      .addCase(updateShipper.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Delete shipper
      .addCase(deleteShipper.pending, state => {
        state.isLoading = true;
      })
      .addCase(deleteShipper.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.shippers = state.shippers.filter(s => s._id !== action.payload);
      })
      .addCase(deleteShipper.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Add balance
      .addCase(addShipperBalance.pending, state => {
        state.isLoading = true;
      })
      .addCase(addShipperBalance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        const index = state.shippers.findIndex(
          s => s._id === action.payload.shipper._id
        );
        if (index !== -1) {
          state.shippers[index] = action.payload.shipper;
        }
        state.shipper = action.payload.shipper;
      })
      .addCase(addShipperBalance.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Minus balance
      .addCase(minusShipperBalance.pending, state => {
        state.isLoading = true;
      })
      .addCase(minusShipperBalance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        const index = state.shippers.findIndex(
          s => s._id === action.payload.shipper._id
        );
        if (index !== -1) {
          state.shippers[index] = action.payload.shipper;
        }
        state.shipper = action.payload.shipper;
      })
      .addCase(minusShipperBalance.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get transactions
      .addCase(getShipperTransactions.pending, state => {
        state.isLoading = true;
      })
      .addCase(getShipperTransactions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.transactionHistory = action.payload.transactionHistory;
      })
      .addCase(getShipperTransactions.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Apply discount
      .addCase(applyShipperDiscount.pending, state => {
        state.isLoading = true;
      })
      .addCase(applyShipperDiscount.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        const index = state.shippers.findIndex(
          s => s._id === action.payload.shipper._id
        );
        if (index !== -1) {
          state.shippers[index] = action.payload.shipper;
        }
        state.shipper = action.payload.shipper;
      })
      .addCase(applyShipperDiscount.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  }
});

export const { reset, clearShipper } = shipperSlice.actions;
export default shipperSlice.reducer;
