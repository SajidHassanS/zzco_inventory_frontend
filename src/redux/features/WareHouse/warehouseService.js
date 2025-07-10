import axios from "axios";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
// const BACKEND_URL = "https://zzcoinventorymanagmentbackend.up.railway.app";

const API_URL = `${BACKEND_URL}api/warehouses/`;

// Create New Warehouse
const createWarehouse = async (formData) => {
  const response = await axios.post(API_URL, formData);
  return response.data;
};

// Get all warehouses
const getWarehouses = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

// Get a warehouse
const getWarehouse = async (id) => {
  const response = await axios.get(API_URL + id);
  return response.data;
};

// Update warehouse
const updateWarehouse = async (id, formData) => {
  const response = await axios.patch(`${API_URL}${id}`, formData);
  return response.data;
};

// Delete a Warehouse
const deleteWarehouse = async (id) => {
  const response = await axios.delete(API_URL + id);
  return response.data;
};

const warehouseService = {
  createWarehouse,
  getWarehouses,
  getWarehouse,
  updateWarehouse,
  deleteWarehouse,
};

export default warehouseService;