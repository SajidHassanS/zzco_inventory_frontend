import axios from "axios";
// const BACKEND_URL = "https://zzcoinventorymanagmentbackend.up.railway.app";
// const BACKEND_URL = "https://zzcoinventorymanagmentbackend.up.railway.app";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_URL = `${BACKEND_URL}api/products/`;
 
// Create New Product
const createProduct = async (formData) => {
  const response = await axios.post(API_URL, formData, {
    headers: {
      "Content-Type": "multipart/form-data", // Set the content type to handle file uploads
    },
  });
  return response.data; // Return the response data
};

// Get all products
const getProducts = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

// Delete a Product
const deleteProduct = async (id) => {
  const response = await axios.delete(API_URL + id);
  return response.data;
};
// Get a Product
const getProduct = async (id) => {
  const response = await axios.get(API_URL + id);
  return response.data;
};
// Update Product
const updateProduct = async (id, formData) => {
  const response = await axios.patch(`${API_URL}${id}`, formData);
  return response.data;
};
const updateReceivedQuantity = async (id, receivedQuantity,warehouse) => {
  const response = await axios.patch(`${API_URL}receive/${id}`, { receivedQuantity,warehouse });
  return response.data;
};
const getProductStock = async (id) => {
  const response = await axios.get(`${API_URL}${id}/stock`);
  return response.data;
};
const productService = {
  createProduct,
  getProducts,
  getProduct,
  deleteProduct,
  updateProduct,
  updateReceivedQuantity,
  getProductStock
};

export default productService;
