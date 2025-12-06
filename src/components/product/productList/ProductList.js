import React, { useEffect, useMemo, useState } from "react";
import Modal from "react-modal";
import { SpinnerImg } from "../../loader/Loader";
import "./productList.scss";
import { FaEdit, FaTrashAlt } from "react-icons/fa";
import { AiOutlineEye } from "react-icons/ai";
import Search from "../../search/Search";
import { useDispatch, useSelector } from "react-redux";
import { getBanks } from "../../../redux/features/Bank/bankSlice";
import { getCash } from "../../../redux/features/cash/cashSlice";

import {
  FILTER_PRODUCTS,
  selectFilteredPoducts
} from "../../../redux/features/product/filterSlice";
import ReactPaginate from "react-paginate";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import {
  deleteProduct,
  getProducts
} from "../../../redux/features/product/productSlice";
import { selectUserRole } from "../../../redux/features/auth/authSlice";
import { Link } from "react-router-dom";

// ⬅️ NEW: bring in cheques so we can show real-time cheque status
import { getPendingCheques } from "../../../redux/features/cheque/chequeSlice";

Modal.setAppElement("#root");

const ProductList = ({ products, isLoading }) => {
  const [search, setSearch] = useState("");
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);

  const filteredProducts = useSelector(selectFilteredPoducts);
  const userRole = useSelector(selectUserRole);

  // ⬅️ NEW: read cheque rows (pending + cleared)
  const cheques = useSelector(state => state.cheque.cheques);

  const dispatch = useDispatch();

  const shortenText = (text, n) => {
    if (!text) return "";
    if (text.length > n) return text.substring(0, n).concat("...");
    return text;
  };
  // Helper for comma formatting
  const formatNumber = num => {
    const n = Number(num);
    if (!Number.isFinite(n)) return "0";
    return n.toLocaleString("en-PK");
  };

  const formatCurrency = num => {
    const n = Number(num);
    if (!Number.isFinite(n)) return "0.00";
    return n.toLocaleString("en-PK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };
  const delProduct = async id => {
    try {
      await dispatch(deleteProduct(id)).unwrap(); // throws if API fails
      await Promise.all([
        dispatch(getProducts()).unwrap(),
        dispatch(getBanks()).unwrap(),
        dispatch(getCash()).unwrap(), // <- you were missing this
        dispatch(getPendingCheques({ status: "all" })).unwrap()
      ]);
    } catch (err) {
      console.error("Delete/refresh failed:", err);
      // optional: toast.error(err?.message || "Failed to refresh after delete");
    }
  };

  const confirmDelete = id => {
    if (userRole !== "Admin") {
      alert("You do not have permission to delete this product.");
      return;
    }

    confirmAlert({
      customUI: ({ onClose }) => {
        return (
          <div
            style={{
              background: "#fff",
              padding: "2rem",
              borderRadius: "8px",
              width: "300px",
              margin: "100px auto",
              boxShadow: "0 0 10px rgba(0,0,0,0.3)",
              textAlign: "center"
            }}
          >
            <h2 style={{ marginBottom: "1rem" }}>Delete Product</h2>
            <p>Are you sure you want to delete this product?</p>
            <div style={{ marginTop: "1.5rem" }}>
              <button
                style={{
                  backgroundColor: "#e53935",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  marginRight: "10px"
                }}
                onClick={() => {
                  delProduct(id);
                  onClose();
                }}
              >
                Delete
              </button>
              <button
                style={{
                  backgroundColor: "#ccc",
                  color: "#000",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </div>
        );
      }
    });
  };

  const openModal = imagePath => {
    setCurrentImage(imagePath);
    setModalIsOpen(true);
  };
  const closeModal = () => {
    setModalIsOpen(false);
    setCurrentImage(null);
  };

  // Pagination
  const [currentItems, setCurrentItems] = useState([]);
  const [pageCount, setPageCount] = useState(0);
  const [itemOffset, setItemOffset] = useState(0);
  const itemsPerPage = 5;

  // Fetch products + cheques on mount
  useEffect(
    () => {
      dispatch(getProducts()).then(response => {
        console.log("Products fetched:", response.payload);
      });
      // ⬅️ NEW: also fetch all cheques so we can compute cheque status reliably
      dispatch(getPendingCheques({ status: "all" }));
    },
    [dispatch]
  );

  useEffect(
    () => {
      const endOffset = itemOffset + itemsPerPage;
      setCurrentItems(filteredProducts.slice(itemOffset, endOffset));
      setPageCount(Math.ceil(filteredProducts.length / itemsPerPage));
    },
    [itemOffset, itemsPerPage, filteredProducts]
  );

  const handlePageClick = event => {
    const newOffset = event.selected * itemsPerPage % filteredProducts.length;
    setItemOffset(newOffset);
  };

  useEffect(
    () => {
      dispatch(FILTER_PRODUCTS({ products, search }));
    },
    [products, search, dispatch]
  );

  // ⬅️ NEW: Map productId => cleared (true/false) from cheque store
  const productChequeClearedMap = useMemo(
    () => {
      const map = new Map();
      if (Array.isArray(cheques)) {
        cheques.forEach(c => {
          // We only care about Product cheques; controller sends relatedProductId in those rows
          if (c.type === "Product" && c.relatedProductId) {
            map.set(String(c.relatedProductId), !!c.status);
          }
        });
      }
      return map;
    },
    [cheques]
  );

  return (
    <div className="product-list">
      <hr />
      <div className="table">
        <div className="--flex-between --flex-dir-column">
          <span>
            <h3>Inventory Items</h3>
          </span>
          <span>
            <Search value={search} onChange={e => setSearch(e.target.value)} />
          </span>
        </div>

        {isLoading && <SpinnerImg />}

        <div className="table">
          {!isLoading && filteredProducts.length === 0
            ? <p>-- No product found, please add a product...</p>
            : <table>
                <thead>
                  <tr>
                    <th>#S/N</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price (Rs)</th>
                    <th>Quantity</th>
                    <th>Value</th>
                    <th>Payment Method</th>
                    <th>Shipping Type</th>
                    <th>Cheque Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((product, index) => {
                    const {
                      _id,
                      name,
                      category,
                      price,
                      quantity,
                      paymentMethod,
                      shippingType,
                      status
                    } = product;

                    // ✅ Prefer cheque store for truth; fallback to product.status
                    let displayStatus = "---";
                    if (paymentMethod === "cheque") {
                      const clearedFromCheques = productChequeClearedMap.get(
                        String(_id)
                      );
                      const isCleared =
                        typeof clearedFromCheques === "boolean"
                          ? clearedFromCheques
                          : !!status;
                      displayStatus = isCleared ? "Cash Out" : "Pending";
                    }

                    return (
                      <tr key={_id}>
                        <td>
                          {index + 1}
                        </td>
                        <td>
                          {shortenText(name, 16)}
                        </td>
                        <td>
                          {category}
                        </td>
                        <td>
                          {formatCurrency(price)}
                        </td>
                        <td>
                          {formatNumber(quantity)}
                        </td>
                        <td>
                          {formatCurrency(price * quantity)}
                        </td>
                        <td>
                          {paymentMethod}
                        </td>
                        <td>
                          {shippingType}
                        </td>
                        <td>
                          {displayStatus}
                        </td>
                        <td className="icons">
                          <span>
                            <Link to={`/product-detail/${_id}`}>
                              <AiOutlineEye size={25} color={"purple"} />
                            </Link>
                          </span>
                          <span>
                            <Link to={`/edit-product/${_id}`}>
                              <FaEdit size={20} color={"green"} />
                            </Link>
                          </span>
                          <span>
                            {userRole === "Admin"
                              ? <FaTrashAlt
                                  size={20}
                                  color={"red"}
                                  onClick={() => confirmDelete(_id)}
                                />
                              : <FaTrashAlt
                                  size={20}
                                  color={"gray"}
                                  style={{ cursor: "not-allowed" }}
                                  title="Delete disabled for Manager"
                                />}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>}
        </div>

        <ReactPaginate
          breakLabel="..."
          nextLabel="Next"
          onPageChange={handlePageClick}
          pageRangeDisplayed={3}
          pageCount={pageCount}
          previousLabel="Prev"
          renderOnZeroPageCount={null}
          containerClassName="pagination"
          pageLinkClassName="page-num"
          previousLinkClassName="page-num"
          nextLinkClassName="page-num"
          activeLinkClassName="activePage"
        />

        {/* Image modal */}
        <Modal
          isOpen={modalIsOpen}
          onRequestClose={closeModal}
          className="image-modal"
        >
          <div className="modal-content">
            <span className="close-icon" onClick={closeModal}>
              &times;
            </span>
            {currentImage &&
              <img
                src={currentImage}
                alt="Large view"
                className="large-image"
              />}
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default ProductList;
