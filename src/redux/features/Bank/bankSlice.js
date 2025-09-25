import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import bankService from "./bankService"; // Ensure this service is aligned with the backend API
import { toast } from "react-toastify";

// Initial state for the bank slice
const initialState = {
  banks: [],
  bank: null,
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: ""
};

// Create a new bank
export const createBank = createAsyncThunk(
  "bank/create",
  async (formData, thunkAPI) => {
    try {
      const response = await bankService.createBank(formData); // Make sure your service function aligns with the API
      toast.success("Bank added successfully");
      return response.data; // Return the data from the API response
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

/// Get all banks
export const getBanks = createAsyncThunk("bank/getAll", async (_, thunkAPI) => {
  try {
    const response = await bankService.getAllBanks(); // Changed from getbanks to getAllBanks
    return response; // Return the response directly, not response.data
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    toast.error(message);
    return thunkAPI.rejectWithValue(message);
  }
});

// Delete a bank
export const deleteBank = createAsyncThunk(
  "bank/delete",
  async (id, thunkAPI) => {
    try {
      const response = await bankService.deleteBank(id);
      toast.success("Bank deleted successfully");
      return id; // Return the ID of the deleted bank
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

// Get a single bank by ID
export const getBank = createAsyncThunk(
  "bank/getBank",
  async (id, thunkAPI) => {
    try {
      const response = await bankService.getBank(id);
      return response.data; // Return the bank data
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

// Update a bank
export const updateBank = createAsyncThunk(
  "bank/updateBank",
  async ({ id, formData }, thunkAPI) => {
    try {
      const response = await bankService.updateBank(id, formData);
      toast.success("Bank updated successfully");
      return response.data; // Return the updated bank data
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

// Subtract from a bank (transaction)
export const subtractFromBank = createAsyncThunk(
  "bank/subtract",
  async ({ bankId, amount, description }, thunkAPI) => {
    try {
      const response = await bankService.subtractFromBank(
        bankId,
        amount,
        description
      );
      toast.success("Amount subtracted successfully");
      return response; // backend returns updated bank object
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

// Slice
const bankSlice = createSlice({
  name: "bank",
  initialState,
  reducers: {
    resetState: state => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = "";
    }
  },
  extraReducers: builder => {
    builder
      .addCase(createBank.pending, state => {
        state.isLoading = true;
      })
      .addCase(createBank.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.banks.push(action.payload); // Add the new bank to the state
      })
      .addCase(createBank.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(getBanks.pending, state => {
        state.isLoading = true;
      })
      .addCase(getBanks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.banks = action.payload; // Set the banks data in the state
      })
      .addCase(getBanks.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(deleteBank.pending, state => {
        state.isLoading = true;
      })
      .addCase(deleteBank.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.banks = state.banks.filter(bank => bank._id !== action.payload); // Remove the deleted bank from the state
      })
      .addCase(deleteBank.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(getBank.pending, state => {
        state.isLoading = true;
      })
      .addCase(getBank.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.bank = action.payload; // Set the fetched bank data in the state
      })
      .addCase(getBank.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(updateBank.pending, state => {
        state.isLoading = true;
      })
      .addCase(updateBank.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.banks = state.banks.map(
          bank => (bank._id === action.payload._id ? action.payload : bank)
        ); // Update the bank in the state
      })
      .addCase(updateBank.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(subtractFromBank.pending, state => {
        state.isLoading = true;
      })
      .addCase(subtractFromBank.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Update the correct bank in state with new balance
        state.banks = state.banks.map(
          bank =>
            bank._id === action.payload.bank._id ? action.payload.bank : bank
        );
      })
      .addCase(subtractFromBank.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  }
});

export const { resetState } = bankSlice.actions;

export const selectIsLoading = state => state.bank.isLoading;
export const selectBanks = state => state.bank.banks;
export const selectBank = state => state.bank.bank;

export default bankSlice.reducer;
