import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import SupplierList from "./SupplierList";
import { Box, Button, Grid } from "@mui/material";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  getSuppliers,
  createSupplier,
  reset
} from "../../redux/features/supplier/supplierSlice";
import AddSupplierModal from "../../components/Models/addSupplierModel";

const Supplier = () => {
  const dispatch = useDispatch();
  const { suppliers, isLoading, isError, message } = useSelector(
    state => state.supplier
  );

  // Modal (Add Supplier)
  const [openModal, setOpenModal] = useState(false);
  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);

  // Pagination state (parent-managed)
  const [page, setPage] = useState(0); // 0-based page index
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Optional: fields for the add-supplier modal (if your modal needs them via props)
  // const [username, setUsername] = useState("");
  // const [phone, setPhone] = useState("");

  useEffect(
    () => {
      dispatch(getSuppliers());
      return () => {
        dispatch(reset());
      };
    },
    [dispatch]
  );

  useEffect(
    () => {
      if (isError && message) {
        toast.error(message);
      }
    },
    [isError, message]
  );

  // Pagination handlers passed to SupplierList
  const handlePageChange = nextPage => {
    // Guard against negatives just in case
    setPage(Math.max(0, Number(nextPage) || 0));
  };

  const handleRowsPerPageChange = nextRpp => {
    const rpp = Number(nextRpp) || 10;
    setRowsPerPage(rpp);
    setPage(0); // reset to first page whenever page size changes
  };

  // If you want to paginate data at parent level (only if SupplierList expects already-sliced data):
  // const start = page * rowsPerPage;
  // const pagedSuppliers = suppliers?.slice(start, start + rowsPerPage) ?? [];

  if (isLoading) return <div>Loading...</div>;

  return (
    <Box sx={{ m: 0, p: 3, width: "100%" }}>
      <Grid container justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          sx={{ borderColor: "dark", color: "dark" }}
          onClick={handleOpenModal}
        >
          Add Supplier
        </Button>
      </Grid>

      {/* Pass suppliers & pagination props to SupplierList */}
      <SupplierList
        suppliers={suppliers || []} // or pagedSuppliers if you slice here
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={handlePageChange} // ✅ fixes the error
        onRowsPerPageChange={handleRowsPerPageChange}
      />

      {/* Add Supplier Modal (adjust props to match your modal’s API) */}
      <AddSupplierModal open={openModal} handleClose={handleCloseModal} />

      <ToastContainer />
    </Box>
  );
};

export default Supplier;
