import axios from "axios";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const API_URL = `${BACKEND_URL}api/suppliers/`;

// Get all customers
const getCustomers = async () => {
  const response = await axios.get(API_URL, {
    withCredentials: true // ✅ Sends session/auth cookies with the request
  });

  return response.data;
};

// Create new customer
const createCustomer = async customerData => {
  const response = await axios.post(API_URL, customerData);
  return response.data;
};

// Add transaction to customer
const addTransaction = async (customerId, transactionData) => {
  const response = await axios.post(
    API_URL + customerId + "/transactions",
    transactionData
  );
  return response.data;
};

const customerService = {
  getCustomers,
  createCustomer,
  addTransaction
};

export default customerService;
