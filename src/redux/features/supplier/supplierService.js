import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
// const BACKEND_URL = "https://zzcoinventorymanagmentbackend.up.railway.app";
const API_URL = `${BACKEND_URL}api/suppliers/`;

// ✅ Get all suppliers (with credentials)
const getSuppliers = async () => {
  const response = await axios.get(API_URL, {
    withCredentials: true, // ✅ Send session cookie for auth
  });
  return response.data;
};

// ✅ Create a new supplier
const createSupplier = async (supplierData) => {
  const response = await axios.post(`${API_URL}add`, supplierData, {
    withCredentials: true,
  });
  return response.data;
};

// ✅ Add a transaction for a supplier
const addTransaction = async (supplierId, transactionData) => {
  const response = await axios.post(
    `${API_URL}${supplierId}/transaction`,
    transactionData,
    {
      withCredentials: true,
    }
  );
  console.log("response ========", response.data);
  return response.data;
};

const supplierService = {
  getSuppliers,
  createSupplier,
  addTransaction,
};

export default supplierService;
