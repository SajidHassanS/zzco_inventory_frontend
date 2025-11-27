import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { toast } from "react-toastify";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}api/return-products`;

// Get all return products
export const getReturnProducts = createAsyncThunk(
  "returnProduct/getAll",
  async (returnType, thunkAPI) => {
    try {
      const url = returnType ? `${API_URL}?returnType=${returnType}` : API_URL;
      const response = await axios.get(url, { withCredentials: true });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get return summary
export const getReturnSummary = createAsyncThunk(
  "returnProduct/getSummary",
  async (_, thunkAPI) => {
    try {
      const response = await axios.get(`${API_URL}/summary`, { withCredentials: true });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get available products (for supplier returns)
export const getAvailableProducts = createAsyncThunk(
  "returnProduct/getAvailableProducts",
  async (_, thunkAPI) => {
    try {
      const response = await axios.get(`${API_URL}/available-products`, { withCredentials: true });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get customers with sales (for customer returns)
export const getCustomersWithSales = createAsyncThunk(
  "returnProduct/getCustomersWithSales",
  async (_, thunkAPI) => {
    try {
      const response = await axios.get(`${API_URL}/customers-with-sales`, { withCredentials: true });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get customer sales
export const getCustomerSales = createAsyncThunk(
  "returnProduct/getCustomerSales",
  async (customerId, thunkAPI) => {
    try {
      const response = await axios.get(`${API_URL}/customer-sales/${customerId}`, { withCredentials: true });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Create return TO supplier
export const createReturnToSupplier = createAsyncThunk(
  "returnProduct/createToSupplier",
  async (returnData, thunkAPI) => {
    try {
      const response = await axios.post(`${API_URL}/to-supplier`, returnData, { withCredentials: true });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Create return FROM customer
export const createReturnFromCustomer = createAsyncThunk(
  "returnProduct/createFromCustomer",
  async (returnData, thunkAPI) => {
    try {
      const response = await axios.post(`${API_URL}/from-customer`, returnData, { withCredentials: true });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Process refund
export const processRefund = createAsyncThunk(
  "returnProduct/processRefund",
  async ({ id, paymentMethod, bankId }, thunkAPI) => {
    try {
      const response = await axios.patch(
        `${API_URL}/${id}/process-refund`,
        { paymentMethod, bankId },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Delete return product
export const deleteReturnProduct = createAsyncThunk(
  "returnProduct/delete",
  async (id, thunkAPI) => {
    try {
      const response = await axios.delete(`${API_URL}/${id}`, { withCredentials: true });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const initialState = {
  returnProducts: [],
  availableProducts: [],
  customersWithSales: [],
  customerSales: [],
  summary: null,
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: ""
};

const returnProductSlice = createSlice({
  name: "returnProduct",
  initialState,
  reducers: {
    RESET_RETURN_STATE: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = "";
    },
    CLEAR_CUSTOMER_SALES: (state) => {
      state.customerSales = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // Get all return products
      .addCase(getReturnProducts.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getReturnProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.returnProducts = action.payload;
      })
      .addCase(getReturnProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Get summary
      .addCase(getReturnSummary.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getReturnSummary.fulfilled, (state, action) => {
        state.isLoading = false;
        state.summary = action.payload;
      })
      .addCase(getReturnSummary.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Get available products
      .addCase(getAvailableProducts.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getAvailableProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.availableProducts = action.payload;
      })
      .addCase(getAvailableProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Get customers with sales
      .addCase(getCustomersWithSales.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCustomersWithSales.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customersWithSales = action.payload;
      })
      .addCase(getCustomersWithSales.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Get customer sales
      .addCase(getCustomerSales.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCustomerSales.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customerSales = action.payload;
      })
      .addCase(getCustomerSales.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Create return to supplier
      .addCase(createReturnToSupplier.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createReturnToSupplier.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.returnProducts.unshift(action.payload.returnProduct);
        toast.success("Return to supplier created successfully");
      })
      .addCase(createReturnToSupplier.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload);
      })

      // Create return from customer
      .addCase(createReturnFromCustomer.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createReturnFromCustomer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.returnProducts.unshift(action.payload.returnProduct);
        toast.success("Return from customer created successfully");
      })
      .addCase(createReturnFromCustomer.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload);
      })

      // Process refund
      .addCase(processRefund.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(processRefund.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        const index = state.returnProducts.findIndex(
          (r) => r._id === action.payload.returnProduct._id
        );
        if (index !== -1) {
          state.returnProducts[index] = action.payload.returnProduct;
        }
        toast.success("Refund processed successfully");
      })
      .addCase(processRefund.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload);
      })

      // Delete return product
      .addCase(deleteReturnProduct.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteReturnProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.returnProducts = state.returnProducts.filter(
          (r) => r._id !== action.payload._id
        );
        toast.success("Return deleted successfully");
      })
      .addCase(deleteReturnProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload);
      });
  }
});

export const { RESET_RETURN_STATE, CLEAR_CUSTOMER_SALES } = returnProductSlice.actions;

export default returnProductSlice.reducer;