// src/redux/features/product/productService.js

import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL; // e.g. https://xyz.execute-api.eu-north-1.amazonaws.com/
const API_BASE = `${BACKEND_URL}api`; // ← include your stage name

// Create a single axios instance for all product calls
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true // send cookies if you’re still using them
});

// Automatically attach your JWT (which you must save to localStorage on login)
const token = localStorage.getItem("jwt");
if (token) {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

// Create New Product (multipart form)
const createProduct = async formData => {
  const response = await api.post("/products", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return response.data;
};

// Get all products
const getProducts = async () => {
  const response = await api.get("/products");
  return response.data;
};

const deleteProduct = async id => {
  const response = await api.delete(`/products/${id}`, {
    withCredentials: true // ✅ crucial for sending cookies/session
  });
  return response.data;
};

// Get a single Product
const getProduct = async id => {
  const response = await api.get(`/products/${id}`);
  return response.data;
};

// Update Product (partial update)
const updateProduct = async (id, formData) => {
  console.log("Sending update to backend:", [...formData.entries()]);

  const response = await api.patch(`/products/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    withCredentials: true
  });

  return response.data;
};

// Update Received Quantity
const updateReceivedQuantity = async (id, receivedQuantity, warehouse) => {
  const response = await api.patch(`/products/receive/${id}`, {
    receivedQuantity,
    warehouse
  });
  return response.data;
};

// Get Product Stock
const getProductStock = async id => {
  const response = await api.get(`/products/${id}/stock`);
  return response.data;
};

export default {
  createProduct,
  getProducts,
  getProduct,
  deleteProduct,
  updateProduct,
  updateReceivedQuantity,
  getProductStock
};
