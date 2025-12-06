// src/pages/Customer/CustomerList.jsx
import React, { useMemo, useState, useEffect } from "react";
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
  Remove,
  Delete,
  History,
  Discount as DiscountIcon,
  Search,
} from "@mui/icons-material";
import { useSelector } from "react-redux";
import { selectCanDelete } from "../../redux/features/auth/authSlice";
import AddBalanceModal from "../../components/Models/AddBalanceModal";
import MinusBalanceModal from "../../components/Models/MinusBalanceModal";
import ApplyCustomerDiscountModal from "../../components/Models/ApplyCustomerDiscountModal";
import DeleteCustomerModal from "../../components/Models/DeleteCustomerModal";
import TransactionHistoryModal from "../../components/Models/TransactionHistoryModal";

/* ---------- helpers ---------- */
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toPlain = (c) => {
  if (!c) return c;
  if (typeof c.toObject === "function") return c.toObject();
  try {
    return JSON.parse(JSON.stringify(c));
  } catch {
    return c;
  }
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

const parseQtyFromDesc = (desc) => {
  const m = String(desc || "").match(/(\d+)\s*[x×]\s/i);
  return m ? Number(m[1]) : 0;
};

const getTotalQtySold = (txs) => {
  if (!Array.isArray(txs)) return 0;
  return txs.reduce((sum, t) => {
    const isCredit = String(t?.type || "").toLowerCase() === "credit";
    if (!isCredit) return sum;
    const qty = toNum(t?.quantity) || parseQtyFromDesc(t?.description);
    return sum + (qty > 0 ? qty : 0);
  }, 0);
};

const CustomerList = ({ customers, refreshCustomers }) => {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isMinusModalOpen, setMinusModalOpen] = useState(false);
  const [isDiscountModalOpen, setDiscountModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const userRole = localStorage.getItem("userRole");
  const hasDeletePermission = useSelector((state) =>
    selectCanDelete(state, "deleteCustomer")
  );
  const canDeleteCustomer = userRole === "Admin" || hasDeletePermission;

  const openAddModal = (customer) => {
    setSelectedCustomer(customer);
    setAddModalOpen(true);
  };

  const openMinusModal = (customer) => {
    setSelectedCustomer(customer);
    setMinusModalOpen(true);
  };

  const openDiscountModal = (customer) => {
    if (!customer || !customer._id) return;
    if (customer.balance <= 0) {
      alert(
        "Cannot apply discount. Customer doesn't owe you money (balance must be positive)."
      );
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
    setDiscountModalOpen(false);
    setDeleteModalOpen(false);
    setHistoryModalOpen(false);
    setSelectedCustomer(null);
  };

  useEffect(() => {
    if (customers?.length) {
      const first = toPlain(customers[0]);
    }
  }, [customers]);

  // Add serial number and filter by search
  const rows = useMemo(() => {
    const allRows = (customers || []).map((c, index) => {
      const p = toPlain(c);
      return {
        ...p,
        serialNo: index + 1,
        qtySold: getTotalQtySold(p?.transactionHistory),
      };
    });

    // Filter by search query
    if (!searchQuery.trim()) return allRows;

    return allRows.filter((row) =>
      row.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.phone?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [customers, searchQuery]);

const columns = [
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
    flex: 1, // Takes remaining space
    minWidth: 180,
    renderCell: (params) => (
      <Box sx={{ fontSize: "1.1rem", fontWeight: 600 }}>{params.value}</Box>
    ),
  },
  { 
    field: "phone", 
    headerName: "Phone", 
    width: 120 
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
    field: "qtySold",
    headerName: "Qty Sold",
    width: 90,
    type: "number",
    valueGetter: (params) => toNum(params.row.qtySold),
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
    renderCell: (params) => (
      <Grid container spacing={0.5} wrap="nowrap">
        <Grid item>
          <Tooltip title="Add Balance (customer owes you)">
            <IconButton
              size="small"
              color="primary"
              onClick={() => openAddModal(params.row)}
            >
              <Add fontSize="small" />
            </IconButton>
          </Tooltip>
        </Grid>
        <Grid item>
          <Tooltip title="Customer pays you">
            <IconButton
              size="small"
              color="secondary"
              onClick={() => openMinusModal(params.row)}
            >
              <Remove fontSize="small" />
            </IconButton>
          </Tooltip>
        </Grid>
        <Grid item>
          <Tooltip
            title={
              params.row.balance > 0
                ? "Give Discount"
                : "Customer doesn't owe money"
            }
          >
            <span>
              <IconButton
                size="small"
                color="success"
                onClick={() => openDiscountModal(params.row)}
                disabled={params.row.balance <= 0}
              >
                <DiscountIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Grid>
        <Grid item>
          <Tooltip
            title={canDeleteCustomer ? "Delete customer" : "No permission"}
          >
            <span>
              <IconButton
                size="small"
                color="error"
                onClick={() => openDeleteModal(params.row)}
                disabled={!canDeleteCustomer}
              >
                <Delete fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Grid>
        <Grid item>
          <Tooltip title="Transaction history">
            <IconButton
              size="small"
              color="info"
              onClick={() => openHistoryModal(params.row)}
            >
              <History fontSize="small" />
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
        initialState={{
          pagination: { paginationModel: { page: 0, pageSize: 10 } },
          sorting: { sortModel: [{ field: "qtySold", sort: "desc" }] },
        }}
        pageSizeOptions={[10, 15, 20, 30]}
        rowSelection={false}
        disableRowSelectionOnClick
      />

      <AddBalanceModal
        open={isAddModalOpen}
        onClose={closeModals}
        customer={selectedCustomer}
        onSuccess={refreshCustomers}
      />

      <MinusBalanceModal
        open={isMinusModalOpen}
        onClose={closeModals}
        customer={selectedCustomer}
        onSuccess={refreshCustomers}
      />

      {isDiscountModalOpen && selectedCustomer && (
        <ApplyCustomerDiscountModal
          open={isDiscountModalOpen}
          onClose={closeModals}
          customer={selectedCustomer}
          onSuccess={refreshCustomers}
        />
      )}

      <DeleteCustomerModal
        open={isDeleteModalOpen}
        onClose={closeModals}
        customer={selectedCustomer}
        onSuccess={refreshCustomers}
      />

      <TransactionHistoryModal
        open={isHistoryModalOpen}
        onClose={closeModals}
        customer={selectedCustomer}
      />
    </Box>
  );
};

export default CustomerList;