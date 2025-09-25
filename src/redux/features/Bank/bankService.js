import axios from "axios";

const RAW = process.env.REACT_APP_BACKEND_URL || "";
const BASE = RAW.endsWith("/") ? RAW : `${RAW}/`;
const API_URL = `${BASE}api/banks`;

// ✅ Create New Bank
const createBank = async formData => {
  const response = await axios.post(`${API_URL}/add`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    withCredentials: true
  });
  return response.data;
};

// ✅ Get All Banks
const getAllBanks = async () => {
  const response = await axios.get(`${API_URL}/all`, {
    withCredentials: true
  });
  return response.data;
};

// ✅ Delete a Bank
const deleteBank = async id => {
  const response = await axios.delete(`${API_URL}/delete/${id}`, {
    withCredentials: true
  });
  return response.data;
};

// ✅ Get a Single Bank
const getBank = async id => {
  const response = await axios.get(`${API_URL}/${id}`, {
    withCredentials: true
  });
  return response.data;
};

// ✅ Update a Bank
const updateBank = async (id, formData) => {
  const response = await axios.put(`${API_URL}/update/${id}`, formData, {
    withCredentials: true
  });
  return response.data;
};

// ✅ Subtract money from Bank (Transaction)
const subtractFromBank = async (bankId, amount, description) => {
  const response = await axios.post(
    `${API_URL}/${bankId}/transactions`,
    {
      type: "subtract", // backend expects "add" or "subtract"
      amount: Number(amount),
      description
    },
    { withCredentials: true }
  );
  return response.data;
};

const bankService = {
  createBank,
  getAllBanks,
  getBank,
  deleteBank,
  updateBank,
  subtractFromBank // 👈 Added here
};

export default bankService;
