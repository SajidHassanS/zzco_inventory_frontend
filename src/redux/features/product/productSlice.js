import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import productService from "./productService";
import { toast } from "react-toastify";

const initialState = {
  product: null,
  products: [],
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: "",
  totalStoreValue: 0,
  outOfStock: 0,
  category: []
};

// Create New Product
export const createProduct = createAsyncThunk(
  "products/create",
  async (formData, thunkAPI) => {
    try {
      // Ensure formData is passed correctly as FormData
      const response = await productService.createProduct(formData);
      // toast.success("Product added successfully");
      return response;
    } catch (error) {
      // Handle error
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      console.log(message);
      toast.error(message); // Show error notification
      return thunkAPI.rejectWithValue(message);
    }
  }
);
export const getProductStock = createAsyncThunk(
  "products/getStock",
  async (id, thunkAPI) => {
    try {
      return await productService.getProductStock(id);
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);
// Get all products
export const getProducts = createAsyncThunk(
  "products/getAll",
  async (_, thunkAPI) => {
    try {
      return await productService.getProducts();
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      console.log(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Delete a Product
export const deleteProduct = createAsyncThunk(
  "products/delete",
  async (id, thunkAPI) => {
    try {
      return await productService.deleteProduct(id);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      console.log(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get a product
export const getProduct = createAsyncThunk(
  "products/getProduct",
  async (id, thunkAPI) => {
    try {
      return await productService.getProduct(id);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      console.log(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);
// Update product
export const updateProduct = createAsyncThunk(
  "products/updateProduct",
  async ({ id, formData }, thunkAPI) => {
    try {
      return await productService.updateProduct(id, formData);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      console.log(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const updateReceivedQuantity = createAsyncThunk(
  "products/updateReceivedQuantity",
  async ({ id, receivedQuantity, warehouse }, thunkAPI) => {
    try {
      return await productService.updateReceivedQuantity(
        id,
        receivedQuantity,
        warehouse
      );
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

const productSlice = createSlice({
  name: "product",
  initialState,
  reducers: {
    CALC_STORE_VALUE(state, action) {
      const products = action.payload;
      const array = [];
      products.map(item => {
        const { price, quantity } = item;
        const productValue = price * quantity;
        return array.push(productValue);
      });
      const totalValue = array.reduce((a, b) => {
        return a + b;
      }, 0);
      state.totalStoreValue = totalValue;
    },
    CALC_OUTOFSTOCK(state, action) {
      const products = action.payload;
      const outOfStockDetails = []; // Array to hold details of out-of-stock products
      let count = 0;

      products.forEach(item => {
        const { quantity, ...details } = item; // Destructure to get other details
        if (quantity === 0 || quantity === "0") {
          count += 1;
          outOfStockDetails.push(details); // Add details of out-of-stock product
        }
      });

      state.outOfStock = count;
      state.outOfStockDetails = outOfStockDetails; // Store out-of-stock details in state
    },
    CALC_CATEGORY(state, action) {
      const products = action.payload;
      const array = [];
      products.map(item => {
        const { category } = item;

        return array.push(category);
      });
      const uniqueCategory = [...new Set(array)];
      state.category = uniqueCategory;
    }
  },
  extraReducers: builder => {
    builder
      .addCase(createProduct.pending, state => {
        state.isLoading = true;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        console.log(action.payload);
        state.products.push(action.payload);
        toast.success("Product added successfully");
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload);
      })
      .addCase(getProducts.pending, state => {
        state.isLoading = true;
      })
      .addCase(getProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        console.log(action.payload);
        state.products = action.payload;
      })
      .addCase(getProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload);
      })
      .addCase(deleteProduct.pending, state => {
        state.isLoading = true;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        toast.success("Product deleted successfully");
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload);
      })
      .addCase(getProduct.pending, state => {
        state.isLoading = true;
      })
      .addCase(getProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        state.product = action.payload;
      })
      .addCase(getProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload);
      })
      .addCase(updateProduct.pending, state => {
        state.isLoading = true;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;

        // ✅ Update product in state
        state.product = action.payload;

        // ✅ Optionally update products array too (if you have it loaded)
        const index = state.products.findIndex(
          p => p._id === action.payload._id
        );
        if (index !== -1) {
          state.products[index] = action.payload;
        }

        toast.success("Product updated successfully");
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        console.error("Update product failed:", action.payload, action.error);
        toast.error(action.payload || "Product update failed");
      })
      .addCase(updateReceivedQuantity.pending, state => {
        state.isLoading = true;
      })
      .addCase(updateReceivedQuantity.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.product = action.payload.product; // The updated product with accumulated received quantity
        toast.success("Received quantity updated successfully");
      })
      .addCase(getProductStock.pending, state => {
        state.isLoading = true;
      })
      .addCase(getProductStock.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        state.stockInfo = action.payload;
      })
      .addCase(getProductStock.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload);
      })
      .addCase(updateReceivedQuantity.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload);
      });
  }
});

export const {
  CALC_STORE_VALUE,
  CALC_OUTOFSTOCK,
  CALC_CATEGORY
} = productSlice.actions;

export const selectIsLoading = state => state.product.isLoading;
export const selectProduct = state => state.product.product;
export const selectTotalStoreValue = state => state.product.totalStoreValue;
export const selectOutOfStock = state => state.product.outOfStock;
export const selectOutOfStockdetail = state => state.product.outOfStockDetails;
export const selectCategory = state => state.product.category;

export default productSlice.reducer;
