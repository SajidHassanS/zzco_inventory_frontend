// src/pages/SupplierList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Avatar, Box, Grid, IconButton, Tooltip } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { Add, Delete, History, Remove } from "@mui/icons-material";
import { useSelector } from "react-redux";
import { selectCanDelete } from "../../redux/features/auth/authSlice";
import AddSupplierBalanceModal from "../../components/Models/AddSupplierBalanceModal";
import MinusSupplierBalanceModal from "../../components/Models/MinusSupplierBalanceModal";
import ConfirmDeleteModal from "../../components/Models/ConfirmDeleteModal";
import SupplierTransactionHistoryModal from "../../components/Models/SupplierTransactionHistoryModal";

const currency = (v) =>
  typeof v === "number" && !Number.isNaN(v) ? v.toFixed(2) : "0.00";

const SupplierList = ({ suppliers = [], refreshSuppliers }) => {
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  // modals
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isMinusModalOpen, setMinusModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);

  // local copy so we can optimistically update after actions
  const [supplierList, setSupplierList] = useState(suppliers);

  // keep local list in sync when parent passes fresh data (e.g., after reload)
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
    setDeleteModalOpen(false);
    setHistoryModalOpen(false);
    setSelectedSupplier(null);
  };

  /* ------------------------------- updaters ---------------------------------- */
  // called by Add / Minus modals; pass the UPDATED supplier returned by API
  const handleBalanceUpdate = (updatedSupplier) => {
    if (!updatedSupplier || !updatedSupplier._id) return;

    setSupplierList((prev) =>
      prev.map((s) =>
        s._id === updatedSupplier._id
          ? {
              ...s,
              // keep everything the API just sent (balance, last desc, etc.)
              ...updatedSupplier,
              // fallback safety:
              balance: Number(
           updatedSupplier.balance ?? s.balance ?? 0
        ),
              latestTxnDescription:
                updatedSupplier.latestTxnDescription ?? s.latestTxnDescription,
            }
          : s
      )
    );

    // if parent wants a hard refresh, allow it
    if (typeof refreshSuppliers === "function") refreshSuppliers();
    closeModals();
  };

  const handleDeleteSuccess = (deletedSupplierId) => {
    setSupplierList((prev) => prev.filter((s) => s._id !== deletedSupplierId));
    if (typeof refreshSuppliers === "function") refreshSuppliers();
    closeModals();
  };

  /* -------------------------------- columns --------------------------------- */
  // We assume your backend now returns:
  // latestTxnDescription, totalPurchasedQty, totalInStockQty
  const columns = useMemo(
    () => [
      {
        field: "avatar",
        headerName: "Avatar",
        width: 80,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Avatar
            src={params.value || "/default-avatar.png"}
            alt={params.row.username}
            sx={{ width: 34, height: 34 }}
          />
        ),
      },
      { field: "_id", headerName: "ID", width: 210 },
      { field: "username", headerName: "Username", width: 160 },
      { field: "phone", headerName: "Phone", width: 130 },
      {
        field: "balance",
        headerName: "Balance",
       minWidth: 90,
  flex: 0.5,   
     
       valueGetter: (p) => Number(p.row?.balance ?? 0),
 renderCell: (p) => <strong>{currency(Number(p.value))}</strong>,
      },
      {
        field: "latestTxnDescription",
        headerName: "Latest Description",
       flex: 1.6,                 // give it the most, but not all
   minWidth: 260,
        renderCell: (params) => (
          <Tooltip title={params.value || "—"} arrow>
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {params.value || "—"}
            </span>
          </Tooltip>
        ),
      },
     
      {
        field: "totalInStockQty",
        headerName: "In Stock",
      minWidth: 110,
   flex: 0.6, 
        valueGetter: (p) => Number(p.row?.totalInStockQty || 0),
      },
      {
        field: "action",
        headerName: "Action",
     minWidth: 160,
  flex: 0.7,   
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Grid container spacing={1} wrap="nowrap">
            <Grid item>
              <Tooltip title="Add (credit)">
                <IconButton color="primary" size="small" onClick={() => openAddModal(params.row)}>
                  <Add fontSize="small" />
                </IconButton>
              </Tooltip>
            </Grid>
            <Grid item>
              <Tooltip title="Minus (debit)">
                <IconButton color="secondary" size="small" onClick={() => openMinusModal(params.row)}>
                  <Remove fontSize="small" />
                </IconButton>
              </Tooltip>
            </Grid>
            <Grid item>
              <Tooltip title={canDelete ? "Delete supplier" : "No permission"}>
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
                <IconButton color="info" size="small" onClick={() => openHistoryModal(params.row)}>
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
  if (!supplierList?.length) {
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
   <DataGrid
  sx={{ borderLeft: 0, borderRight: 0, borderRadius: 0 }}
  rows={supplierList}
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
          // IMPORTANT: Have the modal call onSuccess(updatedSupplierFromAPI)
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
