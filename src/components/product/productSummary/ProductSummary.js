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

export const formatNumbers = (x) =>
  x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

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

  // CASH total — match BankList/ledger math
  const totalCashAmount = useMemo(() => {
    // 1) If the server already sent the computed available figure, use it
    const avail = Number(cashs?.availableBalance);
    if (Number.isFinite(avail)) return avail;

    // 2) Otherwise compute from the ledger by summing signed deltas
    const entries = Array.isArray(cashs?.allEntries) ? [...cashs.allEntries] : [];
    if (entries.length) {
      entries.sort(
        (a, b) =>
          new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date)
      );
      // DO NOT trust last.totalBalance; derive from deltas so sales and
      // other cash movements are reflected even if a row has a wrong totalBalance.
      return entries.reduce((sum, row) => sum + (Number(row.balance) || 0), 0);
    }

    // 3) Fallback if no entries provided
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
        <InfoBox icon={productIcon} title="Total Products" count={products.length} bgColor="card1" />

        <div onClick={openModal}>
          <InfoBox icon={outOfStockIcon} title="Out of Stock" count={outOfStock} bgColor="card3" />
        </div>

        <InfoBox icon={categoryIcon} title="All Categories" count={category.length} bgColor="card4" />

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
