// src/pages/SupplierList.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Grid,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Add,
  Delete,
  History,
  Remove,
  Discount as DiscountIcon,
  Search,
} from "@mui/icons-material";
import { useSelector } from "react-redux";
import { selectCanDelete } from "../../redux/features/auth/authSlice";
import AddSupplierBalanceModal from "../../components/Models/AddSupplierBalanceModal";
import MinusSupplierBalanceModal from "../../components/Models/MinusSupplierBalanceModal";
import ApplySupplierDiscountModal from "../../components/Models/ApplySupplierDiscountModal";
import ConfirmDeleteModal from "../../components/Models/ConfirmDeleteModal";
import SupplierTransactionHistoryModal from "../../components/Models/SupplierTransactionHistoryModal";

/* ---------- helpers ---------- */
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const formatNumber = (num) => {
  return toNum(num).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatWholeNumber = (num) => {
  return toNum(num).toLocaleString("en-US");
};

const SupplierList = ({ suppliers = [], refreshSuppliers }) => {
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // modals
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isMinusModalOpen, setMinusModalOpen] = useState(false);
  const [isDiscountModalOpen, setDiscountModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);

  // local copy so we can optimistically update after actions
  const [supplierList, setSupplierList] = useState(suppliers);

  // keep local list in sync when parent passes fresh data
  useEffect(() => {
    setSupplierList(suppliers);
  }, [suppliers]);

  // permissions
  const isAdmin = localStorage.getItem("userRole") === "Admin";
  const canDeleteSupplier = useSelector((state) =>
    selectCanDelete(state, "deleteSupplier")
  );
  const canDelete = isAdmin || !!canDeleteSupplier;

  /* ------------------------------- modal openers ------------------------------ */
  const openAddModal = (supplier) => {
    if (!supplier || !supplier._id) return;
    setSelectedSupplier(supplier);
    setAddModalOpen(true);
  };

  const openMinusModal = (supplier) => {
    if (!supplier || !supplier._id) return;
    setSelectedSupplier(supplier);
    setMinusModalOpen(true);
  };

  const openDiscountModal = (supplier) => {
    if (!supplier || !supplier._id) return;
    if (supplier.balance >= 0) {
      alert(
        "Cannot apply discount. You haven't paid this supplier yet (balance must be negative)."
      );
      return;
    }
    setSelectedSupplier(supplier);
    setDiscountModalOpen(true);
  };

  const openDeleteModal = (supplier) => {
    if (!canDelete) {
      alert("You do not have permission to delete this supplier.");
      return;
    }
    setSelectedSupplier(supplier);
    setDeleteModalOpen(true);
  };

  const openHistoryModal = (supplier) => {
    if (!supplier || !supplier._id) return;
    setSelectedSupplier(supplier);
    setHistoryModalOpen(true);
  };

  const closeModals = () => {
    setAddModalOpen(false);
    setMinusModalOpen(false);
    setDiscountModalOpen(false);
    setDeleteModalOpen(false);
    setHistoryModalOpen(false);
    setSelectedSupplier(null);
  };

  /* ------------------------------- updaters ---------------------------------- */
  const handleBalanceUpdate = (updatedSupplier) => {
    if (!updatedSupplier || !updatedSupplier._id) return;

    setSupplierList((prev) =>
      prev.map((s) =>
        s._id === updatedSupplier._id
          ? {
              ...s,
              ...updatedSupplier,
              balance: Number(updatedSupplier.balance ?? s.balance ?? 0),
              latestTxnDescription:
                updatedSupplier.latestTxnDescription ?? s.latestTxnDescription,
            }
          : s
      )
    );

    if (typeof refreshSuppliers === "function") refreshSuppliers();
    closeModals();
  };

  const handleDeleteSuccess = (deletedSupplierId) => {
    setSupplierList((prev) => prev.filter((s) => s._id !== deletedSupplierId));
    if (typeof refreshSuppliers === "function") refreshSuppliers();
    closeModals();
  };

  /* -------------------------------- rows with serial & search --------------------------------- */
  const rows = useMemo(() => {
    const allRows = (supplierList || []).map((s, index) => ({
      ...s,
      serialNo: index + 1,
    }));

    if (!searchQuery.trim()) return allRows;

    return allRows.filter(
      (row) =>
        row.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.phone?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [supplierList, searchQuery]);

  /* -------------------------------- columns --------------------------------- */
  const columns = useMemo(
    () => [
      {
        field: "serialNo",
        headerName: "#",
        width: 50,
        renderCell: (params) => (
          <Box sx={{ fontWeight: 600 }}>{params.value}</Box>
        ),
      },
      {
        field: "avatar",
        headerName: "Avatar",
        width: 70,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Avatar
            src={params.value || "/default-avatar.png"}
            alt={params.row.username}
            sx={{ width: 36, height: 36 }}
          />
        ),
      },
      {
        field: "username",
        headerName: "Username",
        flex: 1,
        minWidth: 150,
        renderCell: (params) => (
          <Box sx={{ fontSize: "1.1rem", fontWeight: 600 }}>
            {params.value}
          </Box>
        ),
      },
      {
        field: "phone",
        headerName: "Phone",
        width: 120,
      },
      {
        field: "balance",
        headerName: "Balance",
        width: 140,
        type: "number",
        valueGetter: (params) => toNum(params.row.balance),
        renderCell: (params) => (
          <Box
            sx={{
              fontSize: "1.2rem",
              fontWeight: 700,
              color: params.value >= 0 ? "success.main" : "error.main",
            }}
          >
            {formatNumber(params.value)}
          </Box>
        ),
      },
      {
        field: "latestTxnDescription",
        headerName: "Latest Description",
        flex: 1,
        minWidth: 180,
        renderCell: (params) => (
          <Tooltip title={params.value || "—"} arrow>
            <span
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {params.value || "—"}
            </span>
          </Tooltip>
        ),
      },
      {
        field: "totalInStockQty",
        headerName: "In Stock",
        width: 90,
        type: "number",
        valueGetter: (params) => toNum(params.row.totalInStockQty),
        renderCell: (params) => (
          <Box sx={{ fontSize: "1rem", fontWeight: 500 }}>
            {formatWholeNumber(params.value)}
          </Box>
        ),
      },
      {
        field: "action",
        headerName: "Action",
        width: 200,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Grid container spacing={0.5} wrap="nowrap">
            <Grid item>
              <Tooltip title="Pay to Supplier">
                <IconButton
                  color="primary"
                  size="small"
                  onClick={() => openAddModal(params.row)}
                >
                  <Add fontSize="small" />
                </IconButton>
              </Tooltip>
            </Grid>
            <Grid item>
              <Tooltip title="Get from Supplier">
                <IconButton
                  color="secondary"
                  size="small"
                  onClick={() => openMinusModal(params.row)}
                >
                  <Remove fontSize="small" />
                </IconButton>
              </Tooltip>
            </Grid>
            <Grid item>
              <Tooltip
                title={
                  params.row.balance < 0
                    ? "Apply Discount"
                    : "No payment made to discount"
                }
              >
                <span>
                  <IconButton
                    color="success"
                    size="small"
                    onClick={() => openDiscountModal(params.row)}
                    disabled={params.row.balance >= 0}
                  >
                    <DiscountIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Grid>
            <Grid item>
              <Tooltip
                title={canDelete ? "Delete supplier" : "No permission"}
              >
                <span>
                  <IconButton
                    color="error"
                    size="small"
                    onClick={() => openDeleteModal(params.row)}
                    disabled={!canDelete}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Grid>
            <Grid item>
              <Tooltip title="Transaction history">
                <IconButton
                  color="info"
                  size="small"
                  onClick={() => openHistoryModal(params.row)}
                >
                  <History fontSize="small" />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        ),
      },
    ],
    [canDelete]
  );

  /* --------------------------------- render --------------------------------- */
  if (!supplierList?.length && !searchQuery) {
    return (
      <Box
        sx={{
          margin: 3,
          bgcolor: "white",
          borderRadius: 2,
          padding: 3,
          width: "auto",
        }}
      >
        No suppliers available
      </Box>
    );
  }

  return (
    <Box
      sx={{
        margin: 3,
        bgcolor: "white",
        borderRadius: 2,
        padding: 3,
        width: "auto",
      }}
    >
      {/* Search Bar */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{
            maxWidth: 400,
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
            },
          }}
        />
      </Box>

      <DataGrid
        sx={{ borderLeft: 0, borderRight: 0, borderRadius: 0 }}
        rows={rows}
        columns={columns}
        getRowId={(row) => row._id}
        autoHeight
        density="compact"
        rowHeight={44}
        initialState={{
          pagination: { paginationModel: { page: 0, pageSize: 10 } },
          sorting: { sortModel: [{ field: "username", sort: "asc" }] },
        }}
        pageSizeOptions={[10, 15, 20, 30, 50, 100]}
        disableRowSelectionOnClick
      />

      {/* Add Balance Modal */}
      {isAddModalOpen && selectedSupplier && (
        <AddSupplierBalanceModal
          open={isAddModalOpen}
          onClose={closeModals}
          supplier={selectedSupplier}
          onSuccess={handleBalanceUpdate}
        />
      )}

      {/* Minus Balance Modal */}
      {isMinusModalOpen && selectedSupplier && (
        <MinusSupplierBalanceModal
          open={isMinusModalOpen}
          onClose={closeModals}
          supplier={selectedSupplier}
          onSuccess={handleBalanceUpdate}
        />
      )}

      {/* Discount Modal */}
      {isDiscountModalOpen && selectedSupplier && (
        <ApplySupplierDiscountModal
          open={isDiscountModalOpen}
          onClose={closeModals}
          supplier={selectedSupplier}
          onSuccess={handleBalanceUpdate}
        />
      )}

      {/* Confirm Delete Modal */}
      {isDeleteModalOpen && selectedSupplier && (
        <ConfirmDeleteModal
          open={isDeleteModalOpen}
          onClose={closeModals}
          entry={selectedSupplier}
          entryType="supplier"
          onSuccess={() => handleDeleteSuccess(selectedSupplier._id)}
        />
      )}

      {/* Transaction History Modal */}
      {isHistoryModalOpen && selectedSupplier && (
        <SupplierTransactionHistoryModal
          open={isHistoryModalOpen}
          onClose={closeModals}
          supplier={selectedSupplier}
        />
      )}
    </Box>
  );
};

export default SupplierList;