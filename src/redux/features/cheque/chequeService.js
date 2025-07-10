import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
// const BACKEND_URL = "https://zzcoinventorymanagmentbackend.up.railway.app";
const API_URL = `${BACKEND_URL}api/products/`;

const getCheques = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

const updateChequeStatus = async (chequeId, status) => {
  const response = await axios.patch(`${API_URL}${chequeId}`, { status });
  return response.data;
};

const chequeService = {
  getCheques,
  updateChequeStatus,
};

export default chequeService;