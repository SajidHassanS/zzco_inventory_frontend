// src/pages/Customer/CustomerList.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Avatar, Box, Grid, IconButton, Tooltip } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { Add, Remove, Delete, History, Discount as DiscountIcon } from "@mui/icons-material"; // ✅ Add DiscountIcon
import { useSelector } from "react-redux";
import { selectCanDelete } from "../../redux/features/auth/authSlice";
import AddBalanceModal from "../../components/Models/AddBalanceModal";
import MinusBalanceModal from "../../components/Models/MinusBalanceModal";
import ApplyCustomerDiscountModal from "../../components/Models/ApplyCustomerDiscountModal"; // ✅ NEW
import DeleteCustomerModal from "../../components/Models/DeleteCustomerModal";
import TransactionHistoryModal from "../../components/Models/TransactionHistoryModal";

/* ---------- helpers ---------- */
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Convert possible Mongoose document into a plain JSON object */
const toPlain = (c) => {
  if (!c) return c;
  if (typeof c.toObject === "function") return c.toObject();
  try {
    return JSON.parse(JSON.stringify(c));
  } catch {
    return c;
  }
};

/** Fallback parser for descriptions like: "Sale: 10 x house @ 200 = 2000" */
const parseQtyFromDesc = (desc) => {
  const m = String(desc || "").match(/(\d+)\s*[x×]\s/i);
  return m ? Number(m[1]) : 0;
};

/** Sum quantities from a customer's transactionHistory (credit rows only) */
const getTotalQtySold = (txs) => {
  if (!Array.isArray(txs)) return 0;
  return txs.reduce((sum, t) => {
    const isCredit = String(t?.type || "").toLowerCase() === "credit";
    if (!isCredit) return sum;

    // prefer explicit field; fallback to parsing description (for legacy rows)
    const qty = toNum(t?.quantity) || parseQtyFromDesc(t?.description);
    return sum + (qty > 0 ? qty : 0);
  }, 0);
};

const CustomerList = ({ customers, refreshCustomers }) => {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isMinusModalOpen, setMinusModalOpen] = useState(false);
  const [isDiscountModalOpen, setDiscountModalOpen] = useState(false); // ✅ NEW
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);

  // Retrieve the user role from localStorage
  const userRole = localStorage.getItem("userRole");

  // Unconditionally retrieve delete permission
  const hasDeletePermission = useSelector((state) =>
    selectCanDelete(state, "deleteCustomer")
  );

  // Determine if the delete action should be enabled
  const canDeleteCustomer = userRole === "Admin" || hasDeletePermission;

  const openAddModal = (customer) => {
    setSelectedCustomer(customer);
    setAddModalOpen(true);
  };
  
  const openMinusModal = (customer) => {
    setSelectedCustomer(customer);
    setMinusModalOpen(true);
  };
  
  // ✅ NEW: Open discount modal
  const openDiscountModal = (customer) => {
    if (!customer || !customer._id) return;
    if (customer.balance <= 0) {
      alert("Cannot apply discount. Customer doesn't owe you money (balance must be positive).");
      return;
    }
    setSelectedCustomer(customer);
    setDiscountModalOpen(true);
  };
  
  const openDeleteModal = (customer) => {
    if (!canDeleteCustomer) {
      alert("You do not have permission to delete this customer.");
      return;
    }
    setSelectedCustomer(customer);
    setDeleteModalOpen(true);
  };
  
  const openHistoryModal = (customer) => {
    setSelectedCustomer(customer);
    setHistoryModalOpen(true);
  };
  
  const closeModals = () => {
    setAddModalOpen(false);
    setMinusModalOpen(false);
    setDiscountModalOpen(false); // ✅ NEW
    setDeleteModalOpen(false);
    setHistoryModalOpen(false);
    setSelectedCustomer(null);
  };

  // Optional: quick sanity log to verify data shape
  useEffect(() => {
    if (customers?.length) {
      const first = toPlain(customers[0]);
      // console.log("First customer (plain):", first);
      // console.log("Tx history:", first?.transactionHistory);
    }
  }, [customers]);

  // augment rows with a derived qtySold field (normalize to plain objects first)
  const rows = useMemo(
    () =>
      (customers || []).map((c) => {
        const p = toPlain(c);
        return {
          ...p,
          qtySold: getTotalQtySold(p?.transactionHistory),
        };
      }),
    [customers]
  );

  const columns = [
    {
      field: "avatar",
      headerName: "Avatar",
      width: 90,
      sortable: false,
      renderCell: (params) => (
        <Avatar
          src={params.value || "/default-avatar.png"}
          alt={params.row.username}
        />
      ),
    },
    { field: "_id", headerName: "ID", width: 220 },
    { field: "username", headerName: "Username", width: 160 },
    { field: "phone", headerName: "Phone", width: 140 },
    {
      field: "balance",
      headerName: "Balance",
      width: 120,
      valueGetter: (params) => toNum(params.row.balance),
      valueFormatter: (params) => toNum(params.value).toFixed(2),
      type: "number",
    },
    // Qty Sold (sum of credit rows' quantity; parses legacy descriptions)
    {
      field: "qtySold",
      headerName: "Qty Sold",
      width: 110,
      type: "number",
      valueGetter: (params) => toNum(params.row.qtySold),
    },
    {
      field: "action",
      headerName: "Action",
      width: 240, // ✅ Increased width for 5 buttons
      sortable: false,
      renderCell: (params) => (
        <Grid container spacing={1} wrap="nowrap">
          <Grid item>
            <Tooltip title="Add Balance (customer owes you)">
              <IconButton color="primary" onClick={() => openAddModal(params.row)}>
                <Add />
              </IconButton>
            </Tooltip>
          </Grid>
          <Grid item>
            <Tooltip title="Customer pays you">
              <IconButton color="secondary" onClick={() => openMinusModal(params.row)}>
                <Remove />
              </IconButton>
            </Tooltip>
          </Grid>
          {/* ✅ NEW: Discount Button */}
          <Grid item>
            <Tooltip title={params.row.balance > 0 ? "Give Discount" : "Customer doesn't owe money"}>
              <span>
                <IconButton
                  color="success"
                  onClick={() => openDiscountModal(params.row)}
                  disabled={params.row.balance <= 0}
                >
                  <DiscountIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Grid>
          <Grid item>
            <Tooltip title={canDeleteCustomer ? "Delete customer" : "No permission"}>
              <span>
                <IconButton
                  color="error"
                  onClick={() => openDeleteModal(params.row)}
                  disabled={!canDeleteCustomer}
                >
                  <Delete />
                </IconButton>
              </span>
            </Tooltip>
          </Grid>
          <Grid item>
            <Tooltip title="Transaction history">
              <IconButton color="info" onClick={() => openHistoryModal(params.row)}>
                <History />
              </IconButton>
            </Tooltip>
          </Grid>
        </Grid>
      ),
    },
  ];

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
        rows={rows}
        columns={columns}
        getRowId={(row) => row._id}
        initialState={{
          pagination: { paginationModel: { page: 0, pageSize: 10 } },
          sorting: { sortModel: [{ field: "qtySold", sort: "desc" }] },
        }}
        pageSizeOptions={[10, 15, 20, 30]}
        rowSelection={false}
        disableRowSelectionOnClick
      />

      {/* Add Balance Modal */}
      <AddBalanceModal
        open={isAddModalOpen}
        onClose={closeModals}
        customer={selectedCustomer}
        onSuccess={refreshCustomers}
      />

      {/* Minus Balance Modal */}
      <MinusBalanceModal
        open={isMinusModalOpen}
        onClose={closeModals}
        customer={selectedCustomer}
        onSuccess={refreshCustomers}
      />

      {/* ✅ NEW: Discount Modal */}
      {isDiscountModalOpen && selectedCustomer && (
        <ApplyCustomerDiscountModal
          open={isDiscountModalOpen}
          onClose={closeModals}
          customer={selectedCustomer}
          onSuccess={refreshCustomers}
        />
      )}

      {/* Delete Customer Modal */}
      <DeleteCustomerModal
        open={isDeleteModalOpen}
        onClose={closeModals}
        customer={selectedCustomer}
        onSuccess={refreshCustomers}
      />

      {/* Transaction History Modal */}
      <TransactionHistoryModal
        open={isHistoryModalOpen}
        onClose={closeModals}
        customer={selectedCustomer}
      />
    </Box>
  );
};

export default CustomerList;