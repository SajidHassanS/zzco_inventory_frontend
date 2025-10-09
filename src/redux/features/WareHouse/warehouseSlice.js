import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import warehouseService from "./warehouseService";
import { toast } from "react-toastify";

const initialState = {
  warehouses: [],
  warehouse: null,

  // per-warehouse products for the modal
  warehouseProducts: [],
  productsMessage: "",
  isProductsLoading: false,        // ← NEW

  // transfer state
  isTransferring: false,
  lastTransfer: null,
  transfers: [],
  transferMessage: "",

  // generic flags (for CRUD on warehouses, lists, etc.)
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: "",
};

/* ----------------------------- Warehouses CRUD ---------------------------- */

export const createWarehouse = createAsyncThunk(
  "warehouses/create",
  async (warehouseData, thunkAPI) => {
    try {
      return await warehouseService.createWarehouse(warehouseData);
    } catch (error) {
      const message = (error.response?.data?.message) || error.message || error.toString();
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const getWarehouses = createAsyncThunk(
  "warehouses/getAll",
  async (_, thunkAPI) => {
    try {
      return await warehouseService.getWarehouses();
    } catch (error) {
      const message = (error.response?.data?.message) || error.message || error.toString();
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const getWarehouse = createAsyncThunk(
  "warehouses/getWarehouse",
  async (id, thunkAPI) => {
    try {
      return await warehouseService.getWarehouse(id);
    } catch (error) {
      const message = (error.response?.data?.message) || error.message || error.toString();
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const updateWarehouse = createAsyncThunk(
  "warehouses/updateWarehouse",
  async ({ id, formData }, thunkAPI) => {
    try {
      return await warehouseService.updateWarehouse(id, formData);
    } catch (error) {
      const message = (error.response?.data?.message) || error.message || error.toString();
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const deleteWarehouse = createAsyncThunk(
  "warehouses/delete",
  async (id, thunkAPI) => {
    try {
      return await warehouseService.deleteWarehouse(id);
    } catch (error) {
      const message = (error.response?.data?.message) || error.message || error.toString();
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

/* ---------------------- Products for a specific warehouse ---------------------- */

export const getProductsByWarehouse = createAsyncThunk(
  "warehouses/getProductsByWarehouse",
  async (warehouseId, thunkAPI) => {
    try {
      return await warehouseService.getProductsByWarehouse(warehouseId);
    } catch (error) {
      const message = (error.response?.data?.message) || error.message || error.toString();
      if (message === "No products found for this warehouse") {
        toast.info(message);
      } else {
        toast.error(message);
      }
      return thunkAPI.rejectWithValue(message);
    }
  }
);

/* -------------------------------- Transfers -------------------------------- */

export const transferStock = createAsyncThunk(
  "transfers/create",
  async (payload, thunkAPI) => {
    try {
      return await warehouseService.transferStock(payload);
    } catch (error) {
      const message = (error.response?.data?.message) || error.message || error.toString();
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const listTransfers = createAsyncThunk(
  "transfers/list",
  async (query, thunkAPI) => {
    try {
      return await warehouseService.listTransfers(query);
    } catch (error) {
      const message = (error.response?.data?.message) || error.message || error.toString();
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const rollbackTransfer = createAsyncThunk(
  "transfers/rollback",
  async (transferId, thunkAPI) => {
    try {
      return await warehouseService.rollbackTransfer(transferId);
    } catch (error) {
      const message = (error.response?.data?.message) || error.message || error.toString();
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

/* --------------------------------- Slice --------------------------------- */

const warehouseSlice = createSlice({
  name: "warehouse",
  initialState,
  reducers: {
    RESET_FLAGS(state) {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = "";
      state.productsMessage = "";
      state.transferMessage = "";
      state.isProductsLoading = false;
      state.isTransferring = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create
      .addCase(createWarehouse.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createWarehouse.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.warehouses.push(action.payload);
        toast.success("Warehouse added successfully");
      })
      .addCase(createWarehouse.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Get all
      .addCase(getWarehouses.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getWarehouses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.warehouses = action.payload;
      })
      .addCase(getWarehouses.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Get one
      .addCase(getWarehouse.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getWarehouse.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.warehouse = action.payload;
      })
      .addCase(getWarehouse.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Update
      .addCase(updateWarehouse.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateWarehouse.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.warehouses = state.warehouses.map((w) =>
          w._id === action.payload._id ? action.payload : w
        );
        toast.success("Warehouse updated successfully");
      })
      .addCase(updateWarehouse.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Delete
      .addCase(deleteWarehouse.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteWarehouse.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.warehouses = state.warehouses.filter(
          (w) => w._id !== action.payload.id
        );
        toast.success("Warehouse deleted successfully");
      })
      .addCase(deleteWarehouse.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Products by warehouse (modal)
      .addCase(getProductsByWarehouse.pending, (state) => {
        state.isProductsLoading = true;              // ← use modal-specific loading
        state.productsMessage = "";
      })
      .addCase(getProductsByWarehouse.fulfilled, (state, action) => {
        state.isProductsLoading = false;
        state.isSuccess = true;

        if (Array.isArray(action.payload)) {
          state.warehouseProducts = action.payload;
        } else {
          state.warehouseProducts = [];
          state.productsMessage = action.payload?.message || "";
        }
      })
      .addCase(getProductsByWarehouse.rejected, (state, action) => {
        state.isProductsLoading = false;
        state.isError = true;
        state.warehouseProducts = [];
        state.productsMessage = action.payload;
      })

      // Transfer
      .addCase(transferStock.pending, (state) => {
        state.isTransferring = true;
        state.transferMessage = "";
      })
      .addCase(transferStock.fulfilled, (state, action) => {
        state.isTransferring = false;
        state.isSuccess = true;
        state.lastTransfer = action.payload;
        toast.success("Stock transferred successfully");
      })
      .addCase(transferStock.rejected, (state, action) => {
        state.isTransferring = false;
        state.isError = true;
        state.transferMessage = action.payload;
      })

      // List transfers
      .addCase(listTransfers.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(listTransfers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.transfers = action.payload;
      })
      .addCase(listTransfers.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.transferMessage = action.payload;
      })

      // Rollback transfer
      .addCase(rollbackTransfer.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(rollbackTransfer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        const id = action.meta.arg;
        state.transfers = state.transfers.map((t) =>
          String(t._id) === String(id) ? { ...t, status: "rolled_back" } : t
        );
        toast.success("Transfer rolled back");
      })
      .addCase(rollbackTransfer.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.transferMessage = action.payload;
      });
  },
});

export const { RESET_FLAGS } = warehouseSlice.actions;

/* -------------------------------- Selectors ------------------------------- */
export const selectIsLoading = (state) => state.warehouse.isLoading;
export const selectWarehouse = (state) => state.warehouse.warehouse;
export const selectWarehouses = (state) => state.warehouse.warehouses;

export const selectWarehouseProducts = (state) => state.warehouse.warehouseProducts;
export const selectProductsMessage = (state) => state.warehouse.productsMessage;
export const selectIsProductsLoading = (state) => state.warehouse.isProductsLoading;  // ← NEW

export const selectIsTransferring = (state) => state.warehouse.isTransferring;
export const selectLastTransfer = (state) => state.warehouse.lastTransfer;
export const selectTransfers = (state) => state.warehouse.transfers;
export const selectTransferMessage = (state) => state.warehouse.transferMessage;

export default warehouseSlice.reducer;
