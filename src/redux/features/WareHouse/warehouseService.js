import axios from "axios";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const API_URL = `${BACKEND_URL}api/warehouses/`;

// ✅ Create New Warehouse
const createWarehouse = async formData => {
  const response = await axios.post(API_URL, formData, {
    withCredentials: true
  });
  return response.data;
};

// ✅ Get all warehouses
const getWarehouses = async () => {
  const response = await axios.get(API_URL, {
    withCredentials: true
  });
  return response.data;
};

// ✅ Get a single warehouse
const getWarehouse = async id => {
  const response = await axios.get(API_URL + id, {
    withCredentials: true
  });
  return response.data;
};

// ✅ Update warehouse
const updateWarehouse = async (id, formData) => {
  const response = await axios.patch(`${API_URL}${id}`, formData, {
    withCredentials: true
  });
  return response.data;
};

// ✅ Delete a warehouse
const deleteWarehouse = async id => {
  await axios.delete(API_URL + id, {
    withCredentials: true
  });
  return { id }; // ✅ Return the deleted warehouse ID manually
};

const warehouseService = {
  createWarehouse,
  getWarehouses,
  getWarehouse,
  updateWarehouse,
  deleteWarehouse
};

export default warehouseService;
