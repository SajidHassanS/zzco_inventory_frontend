import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import warehouseService from "./warehouseService";
import { toast } from "react-toastify";

const initialState = {
  warehouses: [],
  warehouse: null,
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: "",
};

// Create new warehouse
export const createWarehouse = createAsyncThunk(
  "warehouses/create",
  async (warehouseData, thunkAPI) => {
    try {
      return await warehouseService.createWarehouse(warehouseData);
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

// Get all warehouses
export const getWarehouses = createAsyncThunk(
  "warehouses/getAll",
  async (_, thunkAPI) => {
    try {
      return await warehouseService.getWarehouses();
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

// Get warehouse
export const getWarehouse = createAsyncThunk(
  "warehouses/getWarehouse",
  async (id, thunkAPI) => {
    try {
      return await warehouseService.getWarehouse(id);
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

// Update warehouse
export const updateWarehouse = createAsyncThunk(
  "warehouses/updateWarehouse",
  async ({ id, formData }, thunkAPI) => {
    try {
      return await warehouseService.updateWarehouse(id, formData);
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
 
// Delete warehouse
export const deleteWarehouse = createAsyncThunk(
  "warehouses/delete",
  async (id, thunkAPI) => {
    try {
      return await warehouseService.deleteWarehouse(id);
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

const warehouseSlice = createSlice({
  name: "warehouse",
  initialState,
  reducers: {
    CALC_STORE_VALUE(state, action) {
      console.log("Store value");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createWarehouse.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createWarehouse.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        state.warehouses.push(action.payload);
        toast.success("Warehouse added successfully");
      })
      .addCase(createWarehouse.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(getWarehouses.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getWarehouses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        state.warehouses = action.payload;
      })
      .addCase(getWarehouses.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(getWarehouse.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getWarehouse.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        state.warehouse = action.payload;
      })
      .addCase(getWarehouse.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(updateWarehouse.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateWarehouse.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        state.warehouses = state.warehouses.map((warehouse) =>
          warehouse._id === action.payload._id ? action.payload : warehouse
        );
        toast.success("Warehouse updated successfully");
      })
      .addCase(updateWarehouse.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(deleteWarehouse.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteWarehouse.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        state.warehouses = state.warehouses.filter(
          (warehouse) => warehouse._id !== action.payload.id
        );
        toast.success("Warehouse deleted successfully");
      })
      .addCase(deleteWarehouse.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { CALC_STORE_VALUE } = warehouseSlice.actions;

export const selectIsLoading = (state) => state.warehouse.isLoading;
export const selectWarehouse = (state) => state.warehouse.warehouse;
export const selectWarehouses = (state) => state.warehouse.warehouses;


export default warehouseSlice.reducer;