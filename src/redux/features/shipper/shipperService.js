// src/redux/features/shipper/shipperService.js
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_URL = `${BACKEND_URL}api/shippers/`;

// Helper: pick axios config based on payload type
function buildConfig(payload) {
  const cfg = { withCredentials: true };
  if (!(typeof FormData !== "undefined" && payload instanceof FormData)) {
    cfg.headers = { "Content-Type": "application/json" };
  }
  return cfg;
}

// Create shipper
const createShipper = async shipperData => {
  const response = await axios.post(API_URL, shipperData, {
    withCredentials: true
  });
  return response.data;
};

// Get all shippers
const getAllShippers = async () => {
  const response = await axios.get(API_URL, { withCredentials: true });
  return response.data;
};

// Get single shipper
const getShipper = async id => {
  const response = await axios.get(`${API_URL}${id}`, {
    withCredentials: true
  });
  return response.data;
};

// Update shipper
const updateShipper = async (id, shipperData) => {
  const response = await axios.patch(`${API_URL}${id}`, shipperData, {
    withCredentials: true
  });
  return response.data;
};

// Delete shipper
const deleteShipper = async id => {
  const response = await axios.delete(`${API_URL}${id}`, {
    withCredentials: true
  });
  return response.data;
};

// Add balance (PAY shipper; reduces payable / affects cash/bank depending on method)
const addBalance = async (id, data) => {
  const response = await axios.post(
    `${API_URL}${id}/add-balance`,
    data,
    buildConfig(data)
  );
  return response.data;
};

// Minus balance (CREDIT ONLY; increases payable; no cash/bank movement)
const minusBalance = async (id, payload) => {
  let data = payload;

  if (typeof FormData !== "undefined" && payload instanceof FormData) {
    if (payload.has("paymentMethod")) payload.set("paymentMethod", "credit");
    else payload.append("paymentMethod", "credit");
  } else {
    data = { ...(payload || {}), paymentMethod: "credit" };
  }

  const response = await axios.post(
    `${API_URL}${id}/add-balance`,
    data,
    buildConfig(data)
  );
  return response.data;
};

// Apply discount (reduces payable; no cash/bank movement)
const applyDiscount = async (id, data) => {
  const response = await axios.post(
    `${API_URL}${id}/discount`,
    data,
    buildConfig(data)
  );
  return response.data;
};

// Get transaction history
const getTransactionHistory = async id => {
  const response = await axios.get(`${API_URL}${id}/transactions`, {
    withCredentials: true
  });
  return response.data;
};

// ✅ NEW: Delete a specific transaction
const deleteTransaction = async (shipperId, transactionId) => {
  const response = await axios.delete(
    `${API_URL}${shipperId}/transaction/${transactionId}`,
    { withCredentials: true }
  );
  return response.data;
};

const shipperService = {
  createShipper,
  getAllShippers,
  getShipper,
  updateShipper,
  deleteShipper,
  addBalance,
  minusBalance,
  applyDiscount,
  getTransactionHistory,
  deleteTransaction // ✅ NEW
};

export default shipperService;
