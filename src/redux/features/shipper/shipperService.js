// redux/features/shipper/shipperService.js
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_URL = `${BACKEND_URL}api/shippers/`;

// Get all shippers
const getShippers = async () => {
  const response = await axios.get(API_URL, {
    withCredentials: true
  });
  return response.data;
};

// Get single shipper
const getShipper = async id => {
  const response = await axios.get(API_URL + id, {
    withCredentials: true
  });
  return response.data;
};

// Create new shipper
const createShipper = async shipperData => {
  const response = await axios.post(API_URL, shipperData, {
    withCredentials: true
  });
  return response.data;
};

// Update shipper
const updateShipper = async (id, shipperData) => {
  const response = await axios.patch(API_URL + id, shipperData, {
    withCredentials: true
  });
  return response.data;
};

// Delete shipper
const deleteShipper = async id => {
  const response = await axios.delete(API_URL + id, {
    withCredentials: true
  });
  return response.data;
};

// Add balance (pay shipper - shipping fare)
const addBalance = async (id, formData) => {
  const response = await axios.post(API_URL + id + "/add-balance", formData, {
    withCredentials: true,
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return response.data;
};

// Minus balance (shipper pays you back)
const minusBalance = async (id, formData) => {
  const response = await axios.post(API_URL + id + "/minus-balance", formData, {
    withCredentials: true,
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return response.data;
};

// Get transaction history
const getTransactionHistory = async id => {
  const response = await axios.get(API_URL + id + "/transactions", {
    withCredentials: true
  });
  return response.data;
};

// Apply discount
const applyDiscount = async (id, discountData) => {
  const response = await axios.post(API_URL + id + "/discount", discountData, {
    withCredentials: true
  });
  return response.data;
};

const shipperService = {
  getShippers,
  getShipper,
  createShipper,
  updateShipper,
  deleteShipper,
  addBalance,
  minusBalance,
  getTransactionHistory,
  applyDiscount
};

export default shipperService;
