// src/components/Models/ProductHistoryModal.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Modal,
  Box,
  Typography,
  IconButton,
  Button,
  Tabs,
  Tab,
  Grid,
  Chip,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  CircularProgress,
  Alert,
  Stack,
  Card,
  CardContent,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import InventoryIcon from "@mui/icons-material/Inventory";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PeopleIcon from "@mui/icons-material/People";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import TimelineIcon from "@mui/icons-material/Timeline";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ProductHistoryModal = ({ open, onClose, productId, title }) => {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);
  
  // Refs for auto-scrolling
  const tableContainerRef = useRef(null);

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "-");
  const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : "-");
  const fmtMoney = (n) =>
    `Rs ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const warehouses = useMemo(() => data?.summary?.warehouses || [], [data]);
  const purchases = useMemo(() => data?.purchases || [], [data]);
  const stockArrivals = useMemo(() => data?.stockArrivals || [], [data]);
  const sales = useMemo(() => data?.sales || [], [data]);
  const byCustomer = useMemo(() => data?.salesByCustomer || [], [data]);

  // Build unified timeline
  const timeline = useMemo(() => {
    if (!data) return [];

    const events = [];

    // Add purchases
    (data.purchases || []).forEach((p) => {
      events.push({
        date: new Date(p.when),
        type: "purchase",
        action: p.action,
        description: p.description || "Product added/purchased",
        amount: p.amount,
        quantity: null,
        entity: data.summary?.supplier?.name || "Own Inventory",
        icon: "purchase",
      });
    });

    // Add stock arrivals
    (data.stockArrivals || []).forEach((s) => {
      events.push({
        date: new Date(s.when),
        type: "arrival",
        action: "STOCK_ARRIVAL",
        description: s.description || `Received in ${s.warehouseName || "warehouse"}`,
        amount: 0,
        quantity: s.qty,
        entity: s.warehouseName || "Warehouse",
        remainingInShipping: s.remainingInShipping,
        icon: "arrival",
      });
    });

    // Add sales
    (data.sales || []).forEach((s) => {
      events.push({
        date: new Date(s.when),
        type: "sale",
        action: "SALE",
        description: `Sold to ${s.customer?.name || "Customer"}`,
        amount: s.total,
        quantity: s.quantity,
        unitPrice: s.unitPrice,
        entity: s.customer?.name || "Customer",
        icon: "sale",
      });
    });

    // Sort by date (oldest first)
    return events.sort((a, b) => a.date - b.date);
  }, [data]);

  // Calculate totals
  const totals = useMemo(() => {
    if (!data) return { soldQty: 0, soldAmount: 0 };
    
    const soldQty = (data.salesByCustomer || []).reduce((s, c) => s + (c.totalQty || 0), 0);
    const soldAmount = (data.salesByCustomer || []).reduce((s, c) => s + (c.totalAmount || 0), 0);
    
    return { soldQty, soldAmount };
  }, [data]);

  useEffect(() => {
    if (!open || !productId) return;

    let active = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await axios.get(
          `${BACKEND_URL}api/products/${productId}/history`,
          { withCredentials: true }
        );
        if (!active) return;
        setData(res.data);
        console.log("📦 Product History:", res.data);
      } catch (e) {
        console.error("Error loading product history:", e);
        setErr(e?.response?.data?.message || "Failed to load product history");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      setTab(0);
      setErr("");
      setData(null);
    };
  }, [open, productId]);

  // Auto-scroll to bottom when data or tab changes
  useEffect(() => {
    if (data && tableContainerRef.current) {
      setTimeout(() => {
        tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
      }, 100);
    }
  }, [data, tab]);

  // Scrollable table container styles
  const scrollableTableSx = {
    maxHeight: 320,
    overflow: "auto",
    "&::-webkit-scrollbar": { width: "8px" },
    "&::-webkit-scrollbar-track": { background: "#f1f1f1", borderRadius: "4px" },
    "&::-webkit-scrollbar-thumb": { background: "#888", borderRadius: "4px" },
    "&::-webkit-scrollbar-thumb:hover": { background: "#555" },
  };

  const headerCellSx = { 
    fontWeight: "bold", 
    bgcolor: "#1976d2", 
    color: "white",
    position: "sticky",
    top: 0,
    zIndex: 1,
  };

  const getTypeChip = (type) => {
    switch (type) {
      case "purchase":
        return <Chip label="Purchase" color="primary" size="small" />;
      case "arrival":
        return <Chip label="Stock Arrival" color="success" size="small" />;
      case "sale":
        return <Chip label="Sale" color="error" size="small" />;
      default:
        return <Chip label={type} size="small" />;
    }
  };

  const handlePdf = () => {
    if (!data) return;

    const doc = new jsPDF("landscape");

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 87, 34);
    doc.text("Z&Z TRADERS .CO", 148, 12, { align: "center" });

    doc.setLineWidth(0.8);
    doc.setDrawColor(255, 87, 34);
    doc.line(110, 15, 186, 15);

    // Product name
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(`${data.summary?.name || "PRODUCT"}`, 14, 15);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Product History", 14, 22);

    // Date
    doc.setFontSize(10);
    doc.text(`Generated: ${fmtDateTime(new Date())}`, 240, 15);

    // Summary info
    const s = data.summary || {};
    doc.text(`Category: ${s.category || "-"}`, 14, 32);
    doc.text(`Supplier: ${s.supplier?.name || "Own Inventory"}`, 14, 38);
    doc.text(`Unit Price: ${fmtMoney(s.unitPrice)}`, 100, 32);
    doc.text(`In Stock: ${s.inStock || 0}`, 100, 38);
    doc.text(`Shipping: ${(s.shippingType || "-").toUpperCase()}`, 180, 32);
    doc.text(`Purchased Qty: ${s.purchaseQuantity || 0}`, 180, 38);

    let startY = 46;

    // Timeline table
    if (timeline.length > 0) {
      const tableColumn = ["Date", "Type", "Description", "Entity", "Qty", "Unit Price", "Amount"];

      const tableRows = timeline.map((t) => [
        fmtDate(t.date),
        t.type.toUpperCase(),
        t.description || "-",
        t.entity || "-",
        t.quantity ? (t.type === "sale" ? `-${t.quantity}` : `+${t.quantity}`) : "-",
        t.unitPrice ? fmtMoney(t.unitPrice) : "-",
        t.amount ? fmtMoney(t.amount) : "-",
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: startY,
        theme: "grid",
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: "bold",
          halign: "center",
          fontSize: 9,
        },
        bodyStyles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 25, halign: "center" },
          1: { cellWidth: 25, halign: "center" },
          2: { cellWidth: 70, halign: "left" },
          3: { cellWidth: 40, halign: "left" },
          4: { cellWidth: 25, halign: "right" },
          5: { cellWidth: 30, halign: "right" },
          6: { cellWidth: 35, halign: "right" },
        },
      });

      startY = doc.lastAutoTable.finalY + 10;
    }

    // Sales by Customer
    if (byCustomer.length > 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Sales by Customer", 14, startY);
      startY += 6;

      autoTable(doc, {
        head: [["Customer", "Orders", "Total Qty", "Total Amount"]],
        body: byCustomer.map((c) => [
          c.customer?.name || "-",
          c.orders || 0,
          c.totalQty || 0,
          fmtMoney(c.totalAmount || 0),
        ]),
        startY: startY,
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold", fontSize: 9 },
        bodyStyles: { fontSize: 8 },
      });
    }

    const filename = `Product_History_${(data.summary?.name || "product").replace(/[^\w]/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(filename);
  };

  // ===================== TAB PANELS =====================

  const SummaryPane = () => {
    const s = data?.summary;
    if (!s) return null;

    return (
      <Stack spacing={3}>
        {/* Summary Cards */}
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: "#e3f2fd", height: "100%" }}>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <InventoryIcon fontSize="small" /> In Stock
                </Typography>
                <Typography variant="h4" fontWeight="bold">{s.inStock || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: "#fff3e0", height: "100%" }}>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <ShoppingCartIcon fontSize="small" /> Purchased
                </Typography>
                <Typography variant="h4" fontWeight="bold">{s.purchaseQuantity || 0}</Typography>
                <Typography variant="caption">{fmtMoney(s.purchaseTotal || 0)}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: "#e8f5e9", height: "100%" }}>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <PeopleIcon fontSize="small" /> Sold
                </Typography>
                <Typography variant="h4" fontWeight="bold">{totals.soldQty}</Typography>
                <Typography variant="caption">{fmtMoney(totals.soldAmount)}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: "#fce4ec", height: "100%" }}>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <LocalShippingIcon fontSize="small" /> Supplier
                </Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ wordBreak: "break-word" }}>
                  {s.supplier?.name || "Own Inventory"}
                </Typography>
                <Typography variant="caption">
                  {s.shippingType === "international"
                    ? `In Shipping: ${s.international?.remainingInShipping || 0}`
                    : (s.shippingType || "-").toUpperCase()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Product Details */}
        <Box>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Product Details</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography><b>Name:</b> {s.name}</Typography>
              <Typography><b>Category:</b> {s.category || "-"}</Typography>
              <Typography><b>Unit Price:</b> {fmtMoney(s.unitPrice)}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography><b>Shipping Type:</b> {(s.shippingType || "-").toUpperCase()}</Typography>
              <Typography><b>Supplier:</b> {s.supplier?.name || "Own Inventory"}</Typography>
            </Grid>
          </Grid>
        </Box>

        {/* International Shipping Info */}
        {s.international && (
          <Alert severity="info" icon={<LocalShippingIcon />}>
            <b>International Shipping:</b>&nbsp;
            Total Shipped: {s.international.totalShipped} | 
            Received: {s.international.receivedQuantity} | 
            Remaining in Shipping: {s.international.remainingInShipping}
          </Alert>
        )}

        <Divider />

        {/* Warehouse Stock */}
        <Box>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <WarehouseIcon fontSize="small" /> Stock by Warehouse
          </Typography>
          {warehouses.length > 0 ? (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {warehouses.map((w, i) => (
                <Chip
                  key={i}
                  label={`${w.warehouseName || w.warehouseId || "Unknown"}: ${w.quantity || 0}`}
                  variant="outlined"
                  color="primary"
                />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">No warehouse stock recorded.</Typography>
          )}
        </Box>
      </Stack>
    );
  };

  const TimelinePane = () => (
    <TableContainer component={Paper} ref={tableContainerRef} sx={scrollableTableSx}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={headerCellSx}>Date</TableCell>
            <TableCell sx={headerCellSx}>Type</TableCell>
            <TableCell sx={headerCellSx}>Description</TableCell>
            <TableCell sx={headerCellSx}>Entity</TableCell>
            <TableCell sx={headerCellSx}>Qty</TableCell>
            <TableCell sx={headerCellSx}>Unit Price</TableCell>
            <TableCell sx={headerCellSx}>Amount</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {timeline.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center">No history found</TableCell>
            </TableRow>
          ) : (
            timeline.map((row, index) => (
              <TableRow key={index} hover>
                <TableCell>{fmtDate(row.date)}</TableCell>
                <TableCell>{getTypeChip(row.type)}</TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {row.description || "-"}
                </TableCell>
                <TableCell>{row.entity || "-"}</TableCell>
                <TableCell>
                  {row.quantity ? (
                    <span style={{ color: row.type === "sale" ? "red" : "green", fontWeight: "bold" }}>
                      {row.type === "sale" ? `-${row.quantity}` : `+${row.quantity}`}
                    </span>
                  ) : "-"}
                </TableCell>
                <TableCell>{row.unitPrice ? fmtMoney(row.unitPrice) : "-"}</TableCell>
                <TableCell>
                  {row.amount ? (
                    <span style={{ color: row.type === "purchase" ? "red" : "green", fontWeight: "bold" }}>
                      {fmtMoney(row.amount)}
                    </span>
                  ) : "-"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const PurchasesPane = () => (
    <TableContainer component={Paper} ref={tableContainerRef} sx={scrollableTableSx}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={headerCellSx}>Date</TableCell>
            <TableCell sx={headerCellSx}>Action</TableCell>
            <TableCell sx={headerCellSx}>Amount</TableCell>
            <TableCell sx={headerCellSx}>Description</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {purchases.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} align="center">No purchase/addition records.</TableCell>
            </TableRow>
          ) : (
            purchases.map((p, i) => (
              <TableRow key={i} hover>
                <TableCell>{fmtDateTime(p.when)}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={p.action}
                    color={p.action?.includes("OWN") ? "default" : "primary"}
                  />
                </TableCell>
                <TableCell sx={{ color: "red", fontWeight: "bold" }}>{fmtMoney(p.amount)}</TableCell>
                <TableCell sx={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.description || "-"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const StockArrivalsPane = () => (
    <TableContainer component={Paper} ref={tableContainerRef} sx={scrollableTableSx}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={headerCellSx}>Date</TableCell>
            <TableCell sx={headerCellSx}>Warehouse</TableCell>
            <TableCell sx={headerCellSx}>Qty Received</TableCell>
            <TableCell sx={headerCellSx}>Remaining in Shipping</TableCell>
            <TableCell sx={headerCellSx}>Description</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {stockArrivals.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center">No stock arrival events.</TableCell>
            </TableRow>
          ) : (
            stockArrivals.map((r, i) => (
              <TableRow key={i} hover>
                <TableCell>{fmtDateTime(r.when)}</TableCell>
                <TableCell>{r.warehouseName || r.warehouseId || "-"}</TableCell>
                <TableCell sx={{ color: "green", fontWeight: "bold" }}>+{r.qty || 0}</TableCell>
                <TableCell>{r.remainingInShipping ?? "-"}</TableCell>
                <TableCell sx={{ maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.description || "-"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const SalesPane = () => (
    <TableContainer component={Paper} ref={tableContainerRef} sx={scrollableTableSx}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={headerCellSx}>Date</TableCell>
            <TableCell sx={headerCellSx}>Customer</TableCell>
            <TableCell sx={headerCellSx}>Qty</TableCell>
            <TableCell sx={headerCellSx}>Unit Price</TableCell>
            <TableCell sx={headerCellSx}>Total</TableCell>
            <TableCell sx={headerCellSx}>Warehouse</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sales.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center">No sales recorded.</TableCell>
            </TableRow>
          ) : (
            sales.map((s, i) => (
              <TableRow key={i} hover>
                <TableCell>{fmtDateTime(s.when)}</TableCell>
                <TableCell>{s.customer?.name || s.customer?.id || "-"}</TableCell>
                <TableCell sx={{ color: "red", fontWeight: "bold" }}>-{s.quantity || 0}</TableCell>
                <TableCell>{fmtMoney(s.unitPrice || 0)}</TableCell>
                <TableCell sx={{ color: "green", fontWeight: "bold" }}>{fmtMoney(s.total || 0)}</TableCell>
                <TableCell>{s.warehouseId || "-"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const ByCustomerPane = () => (
    <TableContainer component={Paper} ref={tableContainerRef} sx={scrollableTableSx}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={headerCellSx}>Customer</TableCell>
            <TableCell sx={headerCellSx}>Orders</TableCell>
            <TableCell sx={headerCellSx}>Total Qty</TableCell>
            <TableCell sx={headerCellSx}>Total Amount</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {byCustomer.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} align="center">No sales by customer yet.</TableCell>
            </TableRow>
          ) : (
            byCustomer.map((c, i) => (
              <TableRow key={i} hover>
                <TableCell>{c.customer?.name || c.customer?.id || "-"}</TableCell>
                <TableCell>{c.orders || 0}</TableCell>
                <TableCell>{c.totalQty || 0}</TableCell>
                <TableCell sx={{ color: "green", fontWeight: "bold" }}>{fmtMoney(c.totalAmount || 0)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "95vw", md: "90vw" },
          maxWidth: 1200,
          maxHeight: "92vh",
          bgcolor: "background.paper",
          boxShadow: 24,
          borderRadius: 2,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            {title || "Product History"}
            {data?.summary?.name ? ` — ${data.summary.name}` : ""}
          </Typography>
          <Button
            size="small"
            variant="contained"
            color="secondary"
            startIcon={<PictureAsPdfIcon />}
            onClick={handlePdf}
            disabled={!data || loading}
          >
            Download PDF
          </Button>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Body */}
        <Box sx={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
          {/* Sidebar Tabs */}
          <Box sx={{ borderRight: "1px solid #eee", minWidth: { xs: 140, md: 180 }, bgcolor: "#fafafa" }}>
            <Tabs
              orientation="vertical"
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="scrollable"
              sx={{ height: "100%" }}
            >
              <Tab icon={<InventoryIcon />} label="Summary" iconPosition="start" sx={{ justifyContent: "flex-start" }} />
              <Tab icon={<TimelineIcon />} label="Timeline" iconPosition="start" sx={{ justifyContent: "flex-start" }} />
              <Tab icon={<ShoppingCartIcon />} label="Purchases" iconPosition="start" sx={{ justifyContent: "flex-start" }} />
              <Tab icon={<LocalShippingIcon />} label="Arrivals" iconPosition="start" sx={{ justifyContent: "flex-start" }} />
              <Tab icon={<PeopleIcon />} label="Sales" iconPosition="start" sx={{ justifyContent: "flex-start" }} />
              <Tab icon={<PeopleIcon />} label="By Customer" iconPosition="start" sx={{ justifyContent: "flex-start" }} />
            </Tabs>
          </Box>

          {/* Content */}
          <Box sx={{ p: 2, flex: 1, overflow: "auto" }}>
            {loading && (
              <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 2 }}>Loading history…</Typography>
              </Stack>
            )}

            {!loading && err && <Alert severity="error">{err}</Alert>}

            {!loading && !err && !data && (
              <Typography variant="body2" color="text.secondary">No data available.</Typography>
            )}

            {!loading && !err && data && (
              <>
                {tab === 0 && <SummaryPane />}
                {tab === 1 && <TimelinePane />}
                {tab === 2 && <PurchasesPane />}
                {tab === 3 && <StockArrivalsPane />}
                {tab === 4 && <SalesPane />}
                {tab === 5 && <ByCustomerPane />}
              </>
            )}
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};

export default ProductHistoryModal;