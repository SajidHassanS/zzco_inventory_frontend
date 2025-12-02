// redux/features/shipper/shipperService.js
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_URL = `${BACKEND_URL}api/shippers/`;

// Create shipper
const createShipper = async shipperData => {
  const response = await axios.post(API_URL, shipperData, {
    withCredentials: true
  });
  return response.data;
};

// Get all shippers
const getAllShippers = async () => {
  const response = await axios.get(API_URL, {
    withCredentials: true
  });
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

// Add balance (pay shipper)
const addBalance = async (id, data) => {
  const response = await axios.post(`${API_URL}${id}/add-balance`, data, {
    withCredentials: true
  });
  return response.data;
};

// Apply discount
const applyDiscount = async (id, data) => {
  const response = await axios.post(`${API_URL}${id}/discount`, data, {
    withCredentials: true
  });
  return response.data;
};

// Get transaction history
const getTransactionHistory = async id => {
  const response = await axios.get(`${API_URL}${id}/transactions`, {
    withCredentials: true
  });
  return response.data;
};

const shipperService = {
  createShipper,
  getAllShippers,
  getShipper,
  updateShipper,
  deleteShipper,
  addBalance,
  applyDiscount,
  getTransactionHistory
};

export default shipperService;
