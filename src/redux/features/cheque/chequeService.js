import axios from "axios";

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "")
  .replace(/\/+$/, "");
const API_BASE = `${BACKEND_URL}/api/cheques`;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true
});

const token = localStorage.getItem("jwt");
if (token) {
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

// GET /api/cheques?status=pending|cleared|all
export const getCheques = async ({ status = "pending" } = {}) => {
  const res = await api.get("", { params: { status } });
  return res.data; // array of rows
};

// PATCH /api/cheques/update-status/:id   body: { status }
export const patchChequeStatus = async ({ id, status }) => {
  const res = await api.patch(`/update-status/${id}`, { status });
  return res.data; // { message, updatedDoc }
};

export default { getCheques, patchChequeStatus };
