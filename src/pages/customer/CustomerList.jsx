// src/pages/Customer/CustomerList.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Avatar, Box, Grid, IconButton } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { Add, Remove, Delete, History } from "@mui/icons-material";
import { useSelector } from "react-redux";
import { selectCanDelete } from "../../redux/features/auth/authSlice";
import AddBalanceModal from "../../components/Models/AddBalanceModal";
import MinusBalanceModal from "../../components/Models/MinusBalanceModal";
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
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <Grid container spacing={1} wrap="nowrap">
          <Grid item>
            <IconButton color="primary" onClick={() => openAddModal(params.row)}>
              <Add />
            </IconButton>
          </Grid>
          <Grid item>
            <IconButton color="secondary" onClick={() => openMinusModal(params.row)}>
              <Remove />
            </IconButton>
          </Grid>
          <Grid item>
            <IconButton
              color="error"
              onClick={() => openDeleteModal(params.row)}
              disabled={!canDeleteCustomer}
            >
              <Delete />
            </IconButton>
          </Grid>
          <Grid item>
            <IconButton color="info" onClick={() => openHistoryModal(params.row)}>
              <History />
            </IconButton>
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
