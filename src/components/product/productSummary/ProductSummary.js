import React, { useEffect, useMemo, useState } from "react";
import "./ProductSummary.scss";
import OutOfStockModal from "../../Models/OutOfStockModal";
import { AiFillDollarCircle } from "react-icons/ai";
import { BsCart4, BsCartX, BsBank2 } from "react-icons/bs";
import { BiCategory } from "react-icons/bi";
import { FaMoneyBillWave } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
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

// Icons
const earningIcon = <AiFillDollarCircle size={40} color="#fff" />;
const productIcon = <BsCart4 size={40} color="#fff" />;
const categoryIcon = <BiCategory size={40} color="#fff" />;
const outOfStockIcon = <BsCartX size={40} color="#fff" />;
const bankIcon = <BsBank2 size={40} color="#fff" />;
const cashIcon = <FaMoneyBillWave size={40} color="#fff" />;

// helpers
export const formatNumbers = (x) =>
  x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// normalize to compare case-insensitively
const norm = (s) => (s ?? "").toString().trim().toLowerCase();

const ProductSummary = ({ products, bank, cashs }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const totalStoreValue = useSelector(selectTotalStoreValue);
  const outOfStock = useSelector(selectOutOfStock);
  const outOfStockDetails = useSelector(selectOutOfStockdetail);
  const category = useSelector(selectCategory);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductDetails, setSelectedProductDetails] = useState([]);

  const isManager = useMemo(
    () => localStorage.getItem("userRole") === "Manager",
    []
  );

  // ✅ unique count by (name, category)
  const uniqueProductCount = useMemo(() => {
    const keys = new Set();
    (products || []).forEach((p) => {
      const name = norm(p?.name);
      // handle both string category and object category { name: '...' }
      const cat =
        typeof p?.category === "object" ? norm(p?.category?.name) : norm(p?.category);
      keys.add(`${name}::${cat}`);
    });
    return keys.size;
  }, [products]);

  useEffect(() => {
    dispatch(CALC_STORE_VALUE(products));
    dispatch(CALC_OUTOFSTOCK(products));
    dispatch(CALC_CATEGORY(products));
  }, [dispatch, products]);

  // BANK total (prefer availableBalance, then balance/totalBalance)
  const totalBankAmount = useMemo(() => {
    return Array.isArray(bank)
      ? bank.reduce(
          (total, b) =>
            total +
            Number(b?.availableBalance ?? b?.balance ?? b?.totalBalance ?? 0),
          0
        )
      : Number(bank?.availableBalance ?? bank?.balance ?? bank?.totalBalance ?? 0);
  }, [bank]);

  // CASH total — compute from entries if provided
  const totalCashAmount = useMemo(() => {
    const avail = Number(cashs?.availableBalance);
    if (Number.isFinite(avail)) return avail;

    const entries = Array.isArray(cashs?.allEntries) ? [...cashs.allEntries] : [];
    if (entries.length) {
      entries.sort(
        (a, b) =>
          new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date)
      );
      return entries.reduce((sum, row) => sum + (Number(row.balance) || 0), 0);
    }

    return Number(cashs?.totalBalance ?? 0);
  }, [cashs]);

  const openModal = () => {
    setSelectedProductDetails(outOfStockDetails);
    setIsModalOpen(true);
  };
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="product-summary">
      <h3 className="--mt">Inventory Stats</h3>

      <div className="info-summary">
        {/* ✅ Show unique count (name + category) */}
        <InfoBox
          icon={productIcon}
          title="Total Products"
          count={uniqueProductCount}
          bgColor="card1"
        />

        <div onClick={openModal}>
          <InfoBox
            icon={outOfStockIcon}
            title="Out of Stock"
            count={outOfStock}
            bgColor="card3"
          />
        </div>

        <InfoBox
          icon={categoryIcon}
          title="All Categories"
          count={category.length}
          bgColor="card4"
        />

        {!isManager && (
          <>
            <InfoBox
              icon={earningIcon}
              title="Store Value"
              count={formatNumbers(totalStoreValue.toFixed(2))}
              bgColor="card2"
            />

            <div onClick={() => navigate("/bank-accounts")}>
              <InfoBox
                icon={bankIcon}
                title="Bank Amount"
                count={formatNumbers(totalBankAmount.toFixed(2))}
                bgColor="card4"
              />
            </div>

            <div onClick={() => navigate("/bank-accounts")}>
              <InfoBox
                icon={cashIcon}
                title="Cash"
                count={formatNumbers(totalCashAmount.toFixed(2))}
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
