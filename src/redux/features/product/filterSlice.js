import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  filteredProducts: [],
};

const filterSlice = createSlice({
  name: "filter",
  initialState,
  reducers: {
    FILTER_PRODUCTS(state, action) {
      const { products, search } = action.payload;
      const tempProducts = products.filter(
        (product) =>
          product.name?.toLowerCase().includes(search.toLowerCase()) ||
          product.category?.toLowerCase().includes(search.toLowerCase())
          // const name = product.name?.toLowerCase() || "";
          // const category = product.category?.toLowerCase() || "";
          // const searchTerm = search.toLowerCase();
          // return name.includes(searchTerm) || category.includes(searchTerm);
      );

      state.filteredProducts = tempProducts;
    },
  }, 
});

export const { FILTER_PRODUCTS } = filterSlice.actions;

export const selectFilteredPoducts = (state) => state.filter.filteredProducts;

export default filterSlice.reducer;
