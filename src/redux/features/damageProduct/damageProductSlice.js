import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import damageProductService from "./damageProductService";
import { toast } from "react-toastify";

const initialState = {
  damageProduct: null,
  damageProducts: [],
  availableProducts: [],
  damageStats: null,
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: ""
};

// Get available products for damage
export const getAvailableProducts = createAsyncThunk(
  "damageProducts/getAvailable",
  async (_, thunkAPI) => {
    try {
      return await damageProductService.getAvailableProducts();
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Create damage product
export const createDamageProduct = createAsyncThunk(
  "damageProducts/create",
  async (data, thunkAPI) => {
    try {
      const response = await damageProductService.createDamageProduct(data);
      toast.success("Damage product recorded successfully");
      return response;
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || error.toString();
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get all damage products
export const getDamageProducts = createAsyncThunk(
  "damageProducts/getAll",
  async (_, thunkAPI) => {
    try {
      return await damageProductService.getDamageProducts();
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get single damage product
export const getDamageProduct = createAsyncThunk(
  "damageProducts/getOne",
  async (id, thunkAPI) => {
    try {
      return await damageProductService.getDamageProduct(id);
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Update damage product
export const updateDamageProduct = createAsyncThunk(
  "damageProducts/update",
  async ({ id, data }, thunkAPI) => {
    try {
      const response = await damageProductService.updateDamageProduct(id, data);
      toast.success("Damage record updated successfully");
      return response;
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || error.toString();
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Delete damage product
export const deleteDamageProduct = createAsyncThunk(
  "damageProducts/delete",
  async (id, thunkAPI) => {
    try {
      const response = await damageProductService.deleteDamageProduct(id);
      toast.success("Damage record deleted successfully");
      return response;
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || error.toString();
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get damage statistics
export const getDamageStats = createAsyncThunk(
  "damageProducts/getStats",
  async (_, thunkAPI) => {
    try {
      return await damageProductService.getDamageStats();
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const damageProductSlice = createSlice({
  name: "damageProduct",
  initialState,
  reducers: {
    RESET_DAMAGE_STATE(state) {
      state.isError = false;
      state.isSuccess = false;
      state.isLoading = false;
      state.message = "";
    }
  },
  extraReducers: (builder) => {
    builder
      // Get available products
      .addCase(getAvailableProducts.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getAvailableProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.availableProducts = action.payload;
      })
      .addCase(getAvailableProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Create damage product
      .addCase(createDamageProduct.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createDamageProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.damageProducts.unshift(action.payload.damageProduct);
      })
      .addCase(createDamageProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get all damage products
      .addCase(getDamageProducts.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getDamageProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.damageProducts = action.payload;
      })
      .addCase(getDamageProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get single damage product
      .addCase(getDamageProduct.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getDamageProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.damageProduct = action.payload;
      })
      .addCase(getDamageProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Delete damage product
      .addCase(deleteDamageProduct.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteDamageProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
      })
      .addCase(deleteDamageProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get damage stats
      .addCase(getDamageStats.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getDamageStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.damageStats = action.payload;
      })
      .addCase(getDamageStats.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  }
});

export const { RESET_DAMAGE_STATE } = damageProductSlice.actions;

export const selectDamageProducts = (state) => state.damageProduct.damageProducts;
export const selectAvailableProducts = (state) =>
  state.damageProduct.availableProducts;
export const selectDamageStats = (state) => state.damageProduct.damageStats;

export default damageProductSlice.reducer;