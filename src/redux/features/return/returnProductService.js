import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_URL = `${BACKEND_URL}api/return-products/`;

// Get all return products
const getReturnProducts = async () => {
  const response = await axios.get(API_URL, { withCredentials: true });
  return response.data;
};

// Get available products for return
const getAvailableProducts = async () => {
  const response = await axios.get(`${API_URL}available`, {
    withCredentials: true
  });
  return response.data;
};

// Create return product
const createReturnProduct = async returnData => {
  const response = await axios.post(API_URL, returnData, {
    withCredentials: true
  });
  return response.data;
};

// Delete return product
const deleteReturnProduct = async id => {
  const response = await axios.delete(`${API_URL}${id}`, {
    withCredentials: true
  });
  return response.data;
};

// Mark refund as received
const markRefundReceived = async id => {
  const response = await axios.patch(
    `${API_URL}${id}/refund-received`,
    {},
    { withCredentials: true }
  );
  return response.data;
};

const returnProductService = {
  getReturnProducts,
  getAvailableProducts,
  createReturnProduct,
  deleteReturnProduct,
  markRefundReceived
};

export default returnProductService;
