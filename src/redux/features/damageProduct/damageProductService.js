import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}api`;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true
});

const token = localStorage.getItem("jwt");
if (token) {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

// Get available products for damage reporting
const getAvailableProducts = async () => {
  const response = await api.get("/damage-products/available-products");
  return response.data;
};

// Create damage product record
const createDamageProduct = async data => {
  const response = await api.post("/damage-products", data);
  return response.data;
};

// Get all damage products
const getDamageProducts = async () => {
  const response = await api.get("/damage-products");
  return response.data;
};

// Get single damage product
const getDamageProduct = async id => {
  const response = await api.get(`/damage-products/${id}`);
  return response.data;
};

// Update damage product
const updateDamageProduct = async (id, data) => {
  const response = await api.patch(`/damage-products/${id}`, data);
  return response.data;
};

// Delete damage product (admin only)
const deleteDamageProduct = async id => {
  const response = await api.delete(`/damage-products/${id}`);
  return response.data;
};

// Get damage statistics
const getDamageStats = async () => {
  const response = await api.get("/damage-products/stats/summary");
  return response.data;
};

// ✅ FIX: Create named object first, then export
const damageProductService = {
  getAvailableProducts,
  createDamageProduct,
  getDamageProducts,
  getDamageProduct,
  updateDamageProduct,
  deleteDamageProduct,
  getDamageStats
};

export default damageProductService;
