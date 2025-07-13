import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
 

const API_URL = `${BACKEND_URL}api/banks`;

// Create New Bank
const createBank = async (formData) => {
  const response = await axios.post(`${API_URL}/add`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    withCredentials: true, // ✅ Send auth cookies
  });
  return response.data;
};

// Get All Banks
const getAllBanks = async () => {
  const response = await axios.get(`${API_URL}/all`, {
    withCredentials: true, // ✅ Send auth cookies
  });
  return response.data;
};

// Delete a Bank
const deleteProduct = async (id) => {
  const response = await axios.delete(`${API_URL}${id}`, {
    withCredentials: true, // ✅ Send auth cookies
  });
  return response.data;
};

// Get a Single Bank
const getProduct = async (id) => {
  const response = await axios.get(`${API_URL}${id}`, {
    withCredentials: true, // ✅ Send auth cookies
  });
  return response.data;
};

// Update a Bank
const updateProduct = async (id, formData) => {
  const response = await axios.patch(`${API_URL}${id}`, formData, {
    withCredentials: true, // ✅ Send auth cookies
  });
  return response.data;
};

const bankService = {
  createBank,
  getAllBanks,
  getProduct,
  deleteProduct,
  updateProduct,
};

export default bankService;
