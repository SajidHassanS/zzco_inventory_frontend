// src/redux/features/WareHouse/warehouseService.js
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Keep your existing base; note the trailing slash.
const API_WAREHOUSES = `${BACKEND_URL}api/warehouses/`;
const API_TRANSFERS = `${BACKEND_URL}api/transfers`;

/* ----------------------------- Warehouses CRUD ---------------------------- */

// ✅ Create New Warehouse
const createWarehouse = async formData => {
  const { data } = await axios.post(API_WAREHOUSES, formData, {
    withCredentials: true
  });
  return data;
};

// ✅ Get all warehouses
const getWarehouses = async () => {
  const { data } = await axios.get(API_WAREHOUSES, { withCredentials: true });
  return data;
};

// ✅ Get a single warehouse
const getWarehouse = async id => {
  const { data } = await axios.get(`${API_WAREHOUSES}${id}`, {
    withCredentials: true
  });
  return data;
};

// ✅ Update warehouse
const updateWarehouse = async (id, formData) => {
  const { data } = await axios.patch(`${API_WAREHOUSES}${id}`, formData, {
    withCredentials: true
  });
  return data;
};

// ✅ Delete a warehouse
const deleteWarehouse = async id => {
  await axios.delete(`${API_WAREHOUSES}${id}`, { withCredentials: true });
  // Normalize return for slice
  return { id };
};

/* ----------------------- Products for a specific warehouse ---------------------- */

// ✅ Get products that belong to (have stock in) a warehouse
//    Uses the controller we updated to read from warehouseStock[]
const getProductsByWarehouse = async warehouseId => {
  const {
    data
  } = await axios.get(`${API_WAREHOUSES}allproducts/${warehouseId}`, {
    withCredentials: true
  });
  // Can be an array OR { message: "No products..." }
  return data;
};

/* -------------------------------- Transfers -------------------------------- */

// ✅ Create/commit a stock transfer
// payload = { fromWarehouseId, toWarehouseId, items: [{ productId, quantity }] }
const transferStock = async payload => {
  const { data } = await axios.post(`${API_TRANSFERS}/`, payload, {
    withCredentials: true
  });
  // { transferId, message, ... } per controller
  return data;
};

// ✅ List transfers (optional filters: from, to, status, limit)
const listTransfers = async (query = {}) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.append(k, v);
  });
  const url = params.toString()
    ? `${API_TRANSFERS}/?${params.toString()}`
    : `${API_TRANSFERS}/`;
  const { data } = await axios.get(url, { withCredentials: true });
  return data;
};

// ✅ Rollback a specific transfer
const rollbackTransfer = async transferId => {
  const { data } = await axios.post(
    `${API_TRANSFERS}/${transferId}/rollback`,
    {},
    { withCredentials: true }
  );
  return data;
};

const warehouseService = {
  // Warehouses CRUD
  createWarehouse,
  getWarehouses,
  getWarehouse,
  updateWarehouse,
  deleteWarehouse,

  // Products for modal
  getProductsByWarehouse,

  // Transfers
  transferStock,
  listTransfers,
  rollbackTransfer
};

export default warehouseService;
