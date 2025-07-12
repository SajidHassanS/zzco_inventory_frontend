// src/redux/features/cheque/chequeService.js

import axios from "axios";

// 1) Build your API base URL (include your stage name)
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
// e.g. "https://3ctz072n3k.execute-api.eu-north-1.amazonaws.com/"
const API_BASE = `${BACKEND_URL}inventory/api/cheques/`;

// 2) Create a single axios instance for all cheque calls
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,    // send cookies if you’re still using them
});

// 3) Automatically attach your JWT (which you must save to localStorage on login)
const token = localStorage.getItem("jwt");
if (token) {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

// 4) Export your service functions

// GET   /cheques/      → returns list of all cheques
const getCheques = async () => {
  const response = await api.get(""); // GET API_BASE
  return response.data;
};

// PATCH /cheques/:id   → updates status of a single cheque
const updateChequeStatus = async (chequeId, status) => {
  const response = await api.patch(
    `${chequeId}`,       // PATCH API_BASE + chequeId
    { status }           // send { status: "newStatus" }
  );
  return response.data;
};

export default {
  getCheques,
  updateChequeStatus,
};
