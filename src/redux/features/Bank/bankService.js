import axios from "axios";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
// const BACKEND_URL = "https://zzcoinventorymanagmentbackend.up.railway.app";

const API_URL = `${BACKEND_URL}api/banks`;

// Create New Product
const createBank = async (formData) => {
  const response = await axios.post(`${API_URL}/add`, formData, {
    headers: {
      "Content-Type": "multipart/form-data", // Set the content type to handle file uploads
    },
  });
  return response.data; // Return the response data
};

// Get all bank
const getAllBanks = async () => {
  const response = await axios.get(`${API_URL}/all`);  
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

const bankService = {
  createBank,
  getAllBanks,
  // getProduct,
  // deleteProduct,
  // updateProduct,
};

export default bankService;
