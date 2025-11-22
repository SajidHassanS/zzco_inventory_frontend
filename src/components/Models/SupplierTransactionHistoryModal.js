// src/components/Models/SupplierTransactionHistoryModal.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Modal, Box, Typography, Button, IconButton } from "@mui/material";
import { Visibility } from "@mui/icons-material";
import axios from "axios";
import CustomTable from "../CustomTable/CustomTable";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const SupplierTransactionHistoryModal = ({ open, onClose, supplier }) => {
  const [transactions, setTransactions] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Local pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API_URL = `${BACKEND_URL}api/suppliers`;

  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // Parse qty from flexible description patterns
  const parseQtyFromDesc = (desc) => {
    const s = String(desc || "");
    let m = s.match(/(\d+)\s*[x×]\s/i);
    if (m) return Number(m[1]);
    m = s.match(/qty(?:uantity)?\s*[:\-]?\s*(\d+)/i);
    if (m) return Number(m[1]);
    m = s.match(/(\d+)\s*(pcs?|pieces?|units?|bags?|boxes?|kg|kilograms?|lts?|liters?)/i);
    if (m) return Number(m[1]);
    m = s.match(/(\d+)\s*@\s*\d+(?:[.,]\d+)?/i);
    if (m) return Number(m[1]);
    m = s.match(/\(?\s*qty\s*[:\-]?\s*(\d+)\s*\)?/i);
    if (m) return Number(m[1]);
    return 0;
  };

  const normalizeQty = (t) => {
    const direct =
      toNum(t?.quantity) ||
      toNum(t?.qty) ||
      toNum(t?.stockSold) ||
      toNum(t?.units) ||
      toNum(t?.count);
    if (direct > 0) return direct;
    return parseQtyFromDesc(t?.description);
  };

  // Handle image view
  const handleViewImage = (imageUrl) => {
    setSelectedImage(imageUrl);
    setImageModalOpen(true);
  };

  const handleCloseImageModal = () => {
    setImageModalOpen(false);
    setSelectedImage(null);
  };

  // ✅ Helper to extract image URL from any object structure
  const extractImageUrl = (obj) => {
    if (!obj) return null;
    
    // Try direct access
    if (typeof obj === 'string') return obj;
    if (obj.filePath) return obj.filePath;
    if (obj.imageFilePath) return obj.imageFilePath;
    
    // Try _doc property (Mongoose)
    if (obj._doc) {
      if (obj._doc.filePath) return obj._doc.filePath;
      if (obj._doc.imageFilePath) return obj._doc.imageFilePath;
    }
    
    // Try bracket notation
    if (obj['filePath']) return obj['filePath'];
    if (obj['imageFilePath']) return obj['imageFilePath'];
    
    return null;
  };

  // Fetch & build running ledger
  useEffect(() => {
    if (!open || !supplier?._id) return;
    
    const fetchTransactions = async () => {
      try {
        const { data } = await axios.get(
          `${API_URL}/${supplier._id}/transaction-history`,
          { withCredentials: true }
        );

        let history = Array.isArray(data?.transactionHistory)
          ? data.transactionHistory
          : [];

        console.log("📦 RAW TRANSACTION HISTORY FROM API:", history);

        // ✅ SORT by date (oldest first) to calculate running balance correctly
        history = history.sort((a, b) => {
          const dateA = new Date(a.date || a.createdAt || 0);
          const dateB = new Date(b.date || b.createdAt || 0);
          return dateA - dateB; // Ascending order (oldest first)
        });

        console.log("📅 SORTED HISTORY (oldest first):", history);

        let balance = 0;
        const ledger = history.map((t, idx) => {
          const type = String(t?.type || "").toLowerCase();
          const amount = toNum(t?.amount);
          
          // ✅ For suppliers: CREDIT increases balance (payment received), DEBIT decreases (purchase made)
          const debit = type === "debit" ? amount : 0;
          const credit = type === "credit" ? amount : 0;
          balance += credit - debit;

          const quantity = normalizeQty(t);

          // ✅ DEBUG: Log transferred cheques
          if (t.description?.toLowerCase().includes("transferred")) {
            console.log("🔍 TRANSFERRED TRANSACTION:", {
              date: t.date,
              description: t.description,
              type: type,
              amount: amount,
              debit: debit,
              credit: credit,
              runningBalance: balance,
              image: t.image,
              chequeImage: t.chequeImage,
            });
          }

          // ✅ Try to convert to plain object for better access
          let plainT;
          try {
            plainT = JSON.parse(JSON.stringify(t));
          } catch (e) {
            plainT = { ...t };
          }

          return {
            id: plainT._id || t._id || idx,
            ...plainT,
            quantity,
            debit,
            credit,
            runningBalance: balance,
            // ✅ Preserve original objects for image access
            _originalImage: t.image,
            _originalChequeImage: t.chequeImage,
          };
        });

        console.log("✅ PROCESSED LEDGER (with running balance):", ledger);
        
        // ✅ REVERSE for display (newest first in table)
        const reversedLedger = [...ledger].reverse();
        
        setTransactions(reversedLedger);
        setTotalBalance(balance);
      } catch (err) {
        console.error("Error fetching supplier transaction history:", err);
      }
    };

    fetchTransactions();
  }, [open, supplier?._id, API_URL]);

  const handlePageChange = (nextPage) => setPage(Math.max(0, Number(nextPage) || 0));
  const handleRowsPerPageChange = (nextRpp) => {
    setRowsPerPage(Number(nextRpp) || 5);
    setPage(0);
  };

  // PDF download
  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text(`Ledger for ${supplier?.username || "-"}`, 14, 10);

    const tableColumn = [
      "Date",
      "Product Name",
      "Description",
      "Qty",
      "Payment Type",
      "Debit",
      "Credit",
      "Cheque Date",
      "Running Balance",
    ];

    // ✅ Reverse back to chronological order for PDF (oldest to newest)
    const pdfTransactions = [...transactions].reverse();

    const tableRows = pdfTransactions.map((tr) => [
      tr?.date ? new Date(tr.date).toLocaleDateString() : "-",
      tr?.productName || "-",
      tr?.description || "-",
      toNum(tr?.quantity) > 0 ? tr.quantity : "-",
      tr?.paymentMethod
        ? String(tr.paymentMethod).charAt(0).toUpperCase() +
          String(tr.paymentMethod).slice(1).toLowerCase()
        : "-",
      Number(tr?.debit ?? 0).toFixed(2),
      Number(tr?.credit ?? 0).toFixed(2),
      tr?.chequeDate ? new Date(tr.chequeDate).toLocaleDateString() : "-",
      Number(tr?.runningBalance ?? 0).toFixed(2),
    ]);

    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
    const endY = doc.lastAutoTable?.finalY ?? 20;
    doc.text(`Total Balance: ${Number(totalBalance || 0).toFixed(2)}`, 14, endY + 10);
    doc.save(`Supplier_Transaction_History_${supplier?.username || "supplier"}.pdf`);
  };

  const columns = useMemo(
    () => [
      {
        field: "date",
        headerName: "Date",
        renderCell: (row) =>
          row?.date ? new Date(row.date).toLocaleDateString() : "-",
      },
      {
        field: "productName",
        headerName: "Product Name",
        renderCell: (row) => {
          const name = row?.productName;
          if (name === supplier?.username || name === supplier?.name) return "-";
          return name || "-";
        }
      },
      { field: "description", headerName: "Description" },
      {
        field: "quantity",
        headerName: "Qty",
        renderCell: (row) => (toNum(row?.quantity) > 0 ? row.quantity : "-"),
      },
      {
        field: "paymentMethod",
        headerName: "Payment Type",
        renderCell: (row) => {
          const pm = String(row?.paymentMethod || "");
          return pm ? pm.charAt(0).toUpperCase() + pm.slice(1).toLowerCase() : "-";
        },
      },
      {
        field: "debit",
        headerName: "Debit",
        renderCell: (row) => (
          <span style={{ color: "red" }}>{Number(row?.debit ?? 0).toFixed(2)}</span>
        ),
      },
      {
        field: "credit",
        headerName: "Credit",
        renderCell: (row) => (
          <span style={{ color: "green" }}>{Number(row?.credit ?? 0).toFixed(2)}</span>
        ),
      },
      {
        field: "chequeDate",
        headerName: "Cheque Date",
        renderCell: (row) =>
          row?.chequeDate ? new Date(row.chequeDate).toLocaleDateString() : "-",
      },
      {
        field: "image",
        headerName: "Cheque Image",
        renderCell: (row) => {
          // ✅ Try all possible ways to get image URL
          let imageUrl = null;
          
          // Try plain object properties
          imageUrl = extractImageUrl(row.image) || extractImageUrl(row.chequeImage);
          
          // Try original Mongoose objects if available
          if (!imageUrl) {
            imageUrl = extractImageUrl(row._originalImage) || extractImageUrl(row._originalChequeImage);
          }
          
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
        renderCell: (row) => (
          <span style={{ 
            color: Number(row?.runningBalance ?? 0) >= 0 ? "green" : "red",
            fontWeight: "bold" 
          }}>
            {Number(row?.runningBalance ?? 0).toFixed(2)}
          </span>
        ),
      },
    ],
    [supplier]
  );

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <Box
          sx={{
            width: 1100,
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
            Ledger for {supplier?.username}
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
              Total Balance: {Number(totalBalance || 0).toFixed(2)}
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
              alt="Cheque"
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

export default SupplierTransactionHistoryModal;