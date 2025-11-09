import React, { useEffect, useState } from "react";
import { Modal, Box, Typography, Button, IconButton } from "@mui/material";
import { Visibility } from "@mui/icons-material";
import axios from "axios";
import CustomTable from "../CustomTable/CustomTable";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// Fallback: parse "Sale: 10 x house @ 200 = 2000"
function parseQtyUnitFromDesc(desc) {
  const s = String(desc || "");
  // capture: <qty> x ... @ <unit>
  const m = s.match(/(\d+)\s*[x×]\s.*?@\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (!m) return { qty: null, unit: null };
  return { qty: Number(m[1]), unit: Number(m[2]) };
}

const TransactionHistoryModal = ({ open, onClose, customer }) => {
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [totalBalance, setTotalBalance] = useState(0);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API_URL = `${BACKEND_URL}api/customers`;

  useEffect(() => {
    if (!open || !customer?._id) return;

    const fetchTransactions = async () => {
      try {
        const { data } = await axios.get(
          `${API_URL}/transactionHistory/${customer._id}`,
          { withCredentials: true }
        );

        const history = Array.isArray(data?.transactionHistory)
          ? data.transactionHistory
          : [];

        let balance = 0;

        const ledger = history.map((t) => {
          const type = String(t?.type || "").toLowerCase();

          // prefer explicit fields if present
          let qty = toNum(t?.quantity);
          let unitPrice =
            t?.unitPrice != null ? toNum(t.unitPrice) : null;

          // parse from description if needed (old rows)
          if (!qty || !unitPrice) {
            const { qty: q2, unit: u2 } = parseQtyUnitFromDesc(t?.description);
            if (!qty && q2) qty = q2;
            if (!unitPrice && u2) unitPrice = u2;
          }

          // compute total: prefer total/amount, else qty*unit
          let lineTotal = toNum(t?.total ?? t?.amount);
          if (!lineTotal && qty && unitPrice != null) {
            lineTotal = qty * unitPrice;
          }

          const debit = type === "debit" ? lineTotal : 0;
          const credit = type === "credit" ? lineTotal : 0;
          balance += credit - debit;

          return {
            ...t,
            quantity: qty || null,
            unitPrice: unitPrice != null ? unitPrice : null,
            lineTotal,
            debit,
            credit,
            runningBalance: balance,
          };
        });

        setTransactions(ledger);
        setTotalBalance(balance);
      } catch (err) {
        console.error("Error fetching transaction history:", err);
      }
    };

    fetchTransactions();
  }, [open, customer?._id, API_URL]);

  // Handle image view
  const handleViewImage = (imageUrl) => {
    setSelectedImage(imageUrl);
    setImageModalOpen(true);
  };

  const handleCloseImageModal = () => {
    setImageModalOpen(false);
    setSelectedImage(null);
  };

  // ✅ Pagination handlers
  const handlePageChange = (nextPage) => {
    setPage(Math.max(0, Number(nextPage) || 0));
  };

  const handleRowsPerPageChange = (nextRpp) => {
    setRowsPerPage(Number(nextRpp) || 5);
    setPage(0);
  };

  // PDF export (includes Qty/Unit/Line Total)
  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text(`Ledger for ${customer?.username || "-"}`, 14, 10);

    const head = [
      "Date",
      "Description",
      "Payment Type",
      "Qty",
      "Unit Price",
      "Line Total",
      "Debit",
      "Credit",
      "Cheque Date",
      "Running Balance",
    ];

    const body = transactions.map((tr) => [
      tr?.date ? new Date(tr.date).toLocaleDateString() : "-",
      tr?.description || "-",
      tr?.paymentMethod || "-",
      tr?.quantity ?? "-",
      tr?.unitPrice != null ? toNum(tr.unitPrice).toFixed(2) : "-",
      toNum(tr?.lineTotal).toFixed(2),
      toNum(tr?.debit).toFixed(2),
      toNum(tr?.credit).toFixed(2),
      tr?.chequeDate ? new Date(tr.chequeDate).toLocaleDateString() : "-",
      toNum(tr?.runningBalance).toFixed(2),
    ]);

    autoTable(doc, { head: [head], body, startY: 20 });
    const endY = doc.lastAutoTable?.finalY ?? 20;
    doc.text(`Total Balance: ${toNum(totalBalance).toFixed(2)}`, 14, endY + 10);
    doc.save(`Customer_Transaction_History_${customer?.username || "customer"}.pdf`);
  };

  // Table columns (adds Qty/Unit/Line Total + Image column)
  const columns = [
    {
      field: "date",
      headerName: "Date",
      renderCell: (row) => (row?.date ? new Date(row.date).toLocaleDateString() : "-"),
    },
    { 
      field: "description", 
      headerName: "Description", 
      renderCell: (row) => row?.description || "-" 
    },
    { 
      field: "paymentMethod", 
      headerName: "Payment Type" 
    },
    { 
      field: "quantity", 
      headerName: "Qty", 
      renderCell: (row) => (row?.quantity != null ? row.quantity : "-") 
    },
    { 
      field: "unitPrice", 
      headerName: "Unit Price", 
      renderCell: (row) => (row?.unitPrice != null ? toNum(row.unitPrice).toFixed(2) : "-") 
    },
    { 
      field: "lineTotal", 
      headerName: "Line Total", 
      renderCell: (row) => toNum(row?.lineTotal).toFixed(2) 
    },
    { 
      field: "debit", 
      headerName: "Debit", 
      renderCell: (row) => <span style={{ color: "red" }}>{toNum(row?.debit).toFixed(2)}</span> 
    },
    { 
      field: "credit", 
      headerName: "Credit", 
      renderCell: (row) => <span style={{ color: "green" }}>{toNum(row?.credit).toFixed(2)}</span> 
    },
    {
      field: "chequeDate",
      headerName: "Cheque Date",
      renderCell: (row) => (row?.chequeDate ? new Date(row.chequeDate).toLocaleDateString() : "-"),
    },
    {
      field: "image",
      headerName: "Image",
      renderCell: (row) => {
        const imageUrl = row?.image?.filePath;
        return imageUrl ? (
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleViewImage(imageUrl)}
            title="View Image"
          >
            <Visibility />
          </IconButton>
        ) : (
          "-"
        );
      },
    },
    { 
      field: "runningBalance", 
      headerName: "Running Balance", 
      renderCell: (row) => toNum(row?.runningBalance).toFixed(2) 
    },
  ];

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <Box
          sx={{
            width: 1200,
            p: 3,
            mx: "auto",
            mt: 5,
            bgcolor: "background.paper",
            boxShadow: 24,
            borderRadius: 1,
            overflow: "auto",
            maxHeight: "90vh",
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            Ledger for {customer?.username}
          </Typography>

          <CustomTable
            columns={columns}
            data={transactions}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
            <Typography 
              variant="subtitle1" 
              sx={{ fontWeight: "bold", color: totalBalance >= 0 ? "green" : "red" }}
            >
              Total Balance: {toNum(totalBalance).toFixed(2)}
            </Typography>

            <Box>
              <Button variant="contained" color="secondary" onClick={downloadPDF} sx={{ mr: 2 }}>
                Download PDF
              </Button>
              <Button variant="contained" color="primary" onClick={onClose}>
                Close
              </Button>
            </Box>
          </Box>
        </Box>
      </Modal>

      {/* Image Preview Modal */}
      <Modal open={imageModalOpen} onClose={handleCloseImageModal}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 2,
            borderRadius: 1,
            maxWidth: "90vw",
            maxHeight: "90vh",
            overflow: "auto",
          }}
        >
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Transaction"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={handleCloseImageModal}
            sx={{ mt: 2, display: "block", mx: "auto" }}
          >
            Close
          </Button>
        </Box>
      </Modal>
    </>
  );
};

export default TransactionHistoryModal;