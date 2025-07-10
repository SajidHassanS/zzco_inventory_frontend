import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import supplierService from './supplierService';
import { toast } from 'react-toastify';

const initialState = {
  suppliers: [],
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: '',
};

// Fetch all suppliers
export const getSuppliers = createAsyncThunk(
  'suppliers/getAll',
  async (_, thunkAPI) => {
    try {
      // Call to supplierService to fetch suppliers
      return await supplierService.getSuppliers();
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString();
      // Reject with message in case of error
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Create a new supplier
export const createSupplier = createAsyncThunk(
  'suppliers/create',
  async (supplierData, thunkAPI) => {
    try {
      // Call to supplierService to create a new supplier
      const response = await supplierService.createSupplier(supplierData);
      toast.success('Supplier added successfully');
      return response;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString();
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Add a transaction to a supplier
export const addTransaction = createAsyncThunk(
  'suppliers/addTransaction',
  async ({ supplierId, transactionData }, thunkAPI) => {
    try {
      // Call to supplierService to add transaction to a supplier
      const response = await supplierService.addTransaction(supplierId, transactionData);
      toast.success('Transaction added successfully');
      return response;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString();
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const supplierSlice = createSlice({
  name: 'supplier',
  initialState,
  reducers: {
    // Reset state to initial values
    reset: (state) => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Handle getSuppliers
      .addCase(getSuppliers.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getSuppliers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.suppliers = action.payload;
      })
      .addCase(getSuppliers.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Handle createSupplier
      .addCase(createSupplier.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createSupplier.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Add newly created supplier to the list
        state.suppliers.push(action.payload);
      })
      .addCase(createSupplier.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Handle addTransaction
      .addCase(addTransaction.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(addTransaction.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Update the supplier with the new transaction
        const index = state.suppliers.findIndex(
          (supplier) => supplier._id === action.payload._id
        );
        if (index !== -1) {
          state.suppliers[index] = action.payload;
        }
      })
      .addCase(addTransaction.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

// Export the reset action
export const { reset } = supplierSlice.actions;
// Export the reducer
export default supplierSlice.reducer;
