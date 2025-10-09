// src/pages/Warehouse/WarehouseManager.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import {
  createWarehouse,
  getWarehouses,
  updateWarehouse,
  deleteWarehouse,
  getProductsByWarehouse,
  transferStock,
  selectWarehouses,
  selectIsLoading,
  selectWarehouseProducts,
  selectIsTransferring,
  selectIsProductsLoading,
} from "../../redux/features/WareHouse/warehouseSlice";
import {
  Button,
  Modal,
  Typography,
  CircularProgress,
  Box,
  IconButton,
  TextField,
} from "@mui/material";
import CustomTable from "../../components/CustomTable/CustomTable";
import { toast } from "react-toastify";
import { selectCanDelete } from "../../redux/features/auth/authSlice";

const WarehouseManager = () => {
  const dispatch = useDispatch();
  const warehouses = useSelector(selectWarehouses);
  const isLoading = useSelector(selectIsLoading);
  const isProductsLoading = useSelector(selectIsProductsLoading);
  const canDeleteWarehouse = useSelector(selectCanDelete);

  // products for selected warehouse (from Redux)
  const warehouseProducts = useSelector(selectWarehouseProducts);
  const isTransferring = useSelector(selectIsTransferring);

  const isAdmin = localStorage.getItem("userRole") === "Admin";

  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [open, setOpen] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState({ name: "", location: "" });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // products modal + transfer state
  const [productsModalOpen, setProductsModalOpen] = useState(false);
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [qtyDraft, setQtyDraft] = useState({}); // { productId: number }

  useEffect(() => {
    dispatch(getWarehouses());
  }, [dispatch]);

  const handleClickOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setNewWarehouse({ name: "", location: "" });
    setEditingWarehouse(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewWarehouse((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (warehouse) => {
    setEditingWarehouse(warehouse);
    setNewWarehouse({ name: warehouse.name, location: warehouse.location });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!isAdmin && !canDeleteWarehouse) {
      toast.error("You do not have permission to delete this warehouse.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this warehouse?")) {
      await dispatch(deleteWarehouse(id));
      await dispatch(getWarehouses());
    }
  };

  const handleSubmit = () => {
    if (editingWarehouse) {
      dispatch(updateWarehouse({ id: editingWarehouse._id, formData: newWarehouse }));
    } else {
      dispatch(createWarehouse(newWarehouse));
    }
    handleClose();
  };

  const handleChangePage = (_event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Open products modal for a warehouse & fetch products via Redux
  const handleViewProducts = async (warehouseId) => {
    setFromWarehouseId(warehouseId);
    setProductsModalOpen(true);
    setQtyDraft({});
    await dispatch(getProductsByWarehouse(warehouseId));
  };

  // Warehouses table columns
  const columns = [
    { field: "name", headerName: "Name" },
    {
      field: "location",
      headerName: "Location",
      renderCell: (params) => (params?.location ? params.location : "N/A"),
    },
    {
      field: "createdAt",
      headerName: "Created At",
      renderCell: (params) =>
        params?.createdAt ? new Date(params.createdAt).toLocaleString() : "N/A",
    },
    {
      field: "updatedAt",
      headerName: "Updated At",
      renderCell: (params) =>
        params?.updatedAt ? new Date(params.updatedAt).toLocaleString() : "N/A",
    },
    {
      field: "actions",
      headerName: "Actions",
      renderCell: (row) => (
        <>
          <IconButton onClick={() => handleViewProducts(row._id)}>
            {productsModalOpen ? null : <VisibilityIcon />}
          </IconButton>
          <IconButton onClick={() => handleEdit(row)}>
            {productsModalOpen ? null : <EditIcon />}
          </IconButton>
          {(isAdmin || canDeleteWarehouse) && (
            <IconButton onClick={() => handleDelete(row._id)}>
              {productsModalOpen ? null : <DeleteIcon />}
            </IconButton>
          )}
        </>
      ),
    },
  ];

  // Products modal columns (uses `available` and an editable Transfer Qty)
  const productColumns = useMemo(
    () => [
      { field: "name", headerName: "Name" },
      {
        field: "available",
        headerName: "Available",
        renderCell: (p) => p?.available ?? 0,
      },
      {
        field: "price",
        headerName: "Price",
        renderCell: (p) => p?.price ?? "N/A",
      },
      {
        field: "category",
        headerName: "Category",
        renderCell: (p) => p?.category ?? "N/A",
      },
      {
        field: "shippingType",
        headerName: "Shipping Type",
        renderCell: (p) => p?.shippingType ?? "N/A",
      },
      {
        field: "transferQty",
        headerName: "Transfer Qty",
        renderCell: (p) => {
          const productId = p.productId || p._id;
          const max = p?.available ?? 0;
          const value = qtyDraft[productId] ?? "";
          return (
            <TextField
              size="small"
              type="number"
              value={value}
              inputProps={{ min: 0, max }}
              onChange={(e) => {
                const next = Number(e.target.value);
                setQtyDraft((prev) => ({
                  ...prev,
                  [productId]: Number.isNaN(next) ? "" : next,
                }));
              }}
              sx={{ width: 120 }}
            />
          );
        },
      },
    ],
    [qtyDraft]
  );

  // Items selected to transfer (from qtyDraft)
  const selectedItems = useMemo(() => {
    const items = [];
    for (const p of warehouseProducts || []) {
      const pid = p.productId || p._id;
      const qty = Number(qtyDraft[pid] || 0);
      if (qty > 0) {
        const allowed = Math.min(qty, p.available ?? 0);
        if (allowed > 0) items.push({ productId: pid, quantity: allowed });
      }
    }
    return items;
  }, [qtyDraft, warehouseProducts]);

  const handleDoTransfer = async () => {
    if (!fromWarehouseId) return toast.error("Select a source warehouse");
    if (selectedItems.length === 0) return toast.error("Add at least one item to transfer");

    const action = await dispatch(
      transferStock({
        fromWarehouseId,
        // no toWarehouseId — backend should default to system/dispatch
        items: selectedItems,
      })
    );

    if (transferStock.fulfilled.match(action)) {
      // Refresh source after transfer-out
      dispatch(getWarehouses());
      dispatch(getProductsByWarehouse(fromWarehouseId));
      setQtyDraft({});
    }
  };

  if (isLoading) return <CircularProgress />;

  return (
    <div>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2, mb: 2 }}>
        <Button variant="contained" color="primary" onClick={handleClickOpen}>
          Add Warehouse
        </Button>
      </Box>

      {/* Add/Edit modal */}
      <Modal open={open} onClose={handleClose} aria-labelledby="warehouse-modal-title">
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
          }}
        >
          <Typography id="warehouse-modal-title" variant="h6">
            {editingWarehouse ? "Edit Warehouse" : "Add New Warehouse"}
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Warehouse Name"
            fullWidth
            variant="standard"
            value={newWarehouse.name}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            name="location"
            label="Location"
            fullWidth
            variant="standard"
            value={newWarehouse.location}
            onChange={handleInputChange}
          />
          <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={handleClose} sx={{ mr: 1 }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingWarehouse ? "Update" : "Add"}
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Warehouses table */}
      <CustomTable
        columns={columns}
        data={warehouses}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      {/* Products + Transfer modal */}
      <Modal
        open={productsModalOpen}
        onClose={() => setProductsModalOpen(false)}
        aria-labelledby="warehouse-products-modal"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "90%",
            maxWidth: 1100,
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
          }}
        >
          <Typography id="warehouse-products-modal" variant="h6" component="h2">
            Warehouse Products
          </Typography>

          {/* Transfer controls (no destination) */}
          <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: "1fr auto", gap: 2 }}>
            <TextField
              label="From"
              value={warehouses.find((w) => String(w._id) === String(fromWarehouseId))?.name || ""}
              InputProps={{ readOnly: true }}
            />
            <Button
              variant="contained"
              startIcon={<LocalShippingIcon />}
              onClick={handleDoTransfer}
              disabled={isTransferring || selectedItems.length === 0}
            >
              {isTransferring ? "Transferring..." : "Transfer"}
            </Button>
          </Box>

          <Box sx={{ mt: 2 }}>
            {isProductsLoading ? (
              <CircularProgress />
            ) : (
              <CustomTable columns={productColumns} data={warehouseProducts} page={0} rowsPerPage={5} />
            )}
          </Box>

          {/* Summary */}
          <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="body2">
              Selected lines: <b>{selectedItems.length}</b>{" "}
              {selectedItems.length > 0 && `| Total units: ${selectedItems.reduce((s, i) => s + i.quantity, 0)}`}
            </Typography>
            <Button onClick={() => setProductsModalOpen(false)}>Close</Button>
          </Box>
        </Box>
      </Modal>
    </div>
  );
};

export default WarehouseManager;
