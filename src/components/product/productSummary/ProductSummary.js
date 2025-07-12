import React, { useEffect, useMemo, useState } from "react";
import "./ProductSummary.scss";
import OutOfStockModal from '../../Models/OutOfStockModal'; // Add this import

import { AiFillDollarCircle } from "react-icons/ai";
import { BsCart4, BsCartX, BsBank2 } from "react-icons/bs";
import { BiCategory } from "react-icons/bi";
import { FaMoneyBillWave } from "react-icons/fa";
import { useNavigate } from "react-router-dom"; // Add this import

import InfoBox from "../../infoBox/InfoBox";
import { useDispatch, useSelector } from "react-redux";
import {
  CALC_CATEGORY,
  CALC_OUTOFSTOCK,
  CALC_STORE_VALUE,
  selectCategory,
  selectOutOfStock,
  selectOutOfStockdetail,
  selectTotalStoreValue,
} from "../../../redux/features/product/productSlice";
import axios from "axios";

// Icons
const earningIcon = <AiFillDollarCircle size={40} color="#fff" />;
const productIcon = <BsCart4 size={40} color="#fff" />;
const categoryIcon = <BiCategory size={40} color="#fff" />;
const outOfStockIcon = <BsCartX size={40} color="#fff" />;
const bankIcon = <BsBank2 size={40} color="#fff" />;
const cashIcon = <FaMoneyBillWave size={40} color="#fff" />;

const API_URL = process.env.REACT_APP_BACKEND_URL;

const BACKEND_URL = `${API_URL}api/customers`;
// Format Amount
export const formatNumbers = (x) => {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const ProductSummary = ({ products, bank, cashs }) => {
  const dispatch = useDispatch();
  const totalStoreValue = useSelector(selectTotalStoreValue);
  const outOfStock = useSelector(selectOutOfStock);
  const selectOutOfStockdetails = useSelector(selectOutOfStockdetail);
  const category = useSelector(selectCategory);
  const navigate = useNavigate(); // Initialize useHistory
  console.log("outOfStock", outOfStock);
  console.log("selectOutOfStockdetail", selectOutOfStockdetails);
  const isManager = useMemo(() => localStorage.getItem("userRole") === "Manager", []);

  useEffect(() => {
    dispatch(CALC_STORE_VALUE(products));
    dispatch(CALC_OUTOFSTOCK(products));
    dispatch(CALC_CATEGORY(products));
  }, [dispatch, products]);

  const [banks, setBanks] = useState([]);
  const [cash, setCash] = useState([]);

  const totalCashAmount = useMemo(() => {
    return cashs.totalBalance || 0;
  }, [cashs]);

  const totalBankAmount = useMemo(() => {
    return Array.isArray(bank) ? bank.reduce((total, bank) => total + (bank.balance || 0), 0) : 0;
  }, [bank]);

  const fetchCashAndBanks = async () => {
    try {
      const [cashResponse, bankResponse] = await Promise.all([
        axios.get(`${BACKEND_URL}`, { withCredentials: true }), // ✅ Send cookies
        axios.get(`${BACKEND_URL}`, { withCredentials: true })  // ✅ Send cookies
      ]);

      setCash(Array.isArray(cashResponse.data) ? cashResponse.data : []);
      setBanks(Array.isArray(bankResponse.data) ? bankResponse.data : []);

      console.log("Fetched cash:", cashResponse.data);
      console.log("Fetched banks:", bankResponse.data);
    } catch (error) {
      console.error("There was an error fetching the cash or bank data!", error);
    }
  };



  useEffect(() => {
    fetchCashAndBanks();
  }, []);


  const [isModalOpen, setIsModalOpen] = useState(false); // State for modal visibility
  const [selectedProductDetails, setSelectedProductDetails] = useState([]); // State for selected product details

  const openModal = () => {
    setSelectedProductDetails(selectOutOfStockdetails); // Set the details of out of stock products
    setIsModalOpen(true); // Open the modal
  };

  const closeModal = () => {
    setIsModalOpen(false); // Close the modal
  };
  return (
    <div className="product-summary">
      <h3 className="--mt">Inventory Stats</h3>
      <div className="info-summary">
        <InfoBox
          icon={productIcon}
          title={"Total Products"}
          count={products.length}
          bgColor="card1"
        />
        <div onClick={openModal}>
          <InfoBox
            icon={outOfStockIcon}
            title={"Out of Stock"}
            count={outOfStock}
            bgColor="card3"
          />
        </div>
        <InfoBox
          icon={categoryIcon}
          title={"All Categories"}
          count={category.length}
          bgColor="card4"
        />
        {!isManager && (
          <>
            <InfoBox
              icon={earningIcon}
              title={"Store Value"}
              count={`${formatNumbers(totalStoreValue.toFixed(2))}`}
              bgColor="card2"
            />
            <div onClick={() => navigate("/bank-accounts")} className="info-summary">
              <InfoBox
                icon={bankIcon}
                title={"Bank Amount"}
                count={`${formatNumbers(totalBankAmount.toFixed(2))}`}
                bgColor="card4"
              />
            </div>
            <div onClick={() => navigate("/bank-accounts")} className="info-summary">
              <InfoBox
                icon={cashIcon}
                title={"Cash"}
                count={`${formatNumbers(totalCashAmount.toFixed(2))}`}
                bgColor="card1"
              />
            </div>
          </>
        )}
      </div>
      <OutOfStockModal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        selectedProductDetails={selectedProductDetails}
      />
    </div>
  );
};

export default ProductSummary;
