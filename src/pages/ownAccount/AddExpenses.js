import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Grid,
  Container,
} from "@mui/material";
import axios from "axios";
import { getBanks } from "../../redux/features/Bank/bankSlice";
import { toast, ToastContainer } from "react-toastify";

const AddExpense = () => {
  const dispatch = useDispatch();

  // Banks from Redux
  const banks = useSelector((state) => state.bank.banks || []);

  // Dialog visibility
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Form state
  const [expense, setExpense] = useState({
    expenseName: "",
    amount: "",
    description: "",
    expenseDate: "",
    paymentMethod: "",
    chequeDate: "",
    bankID: "",
  });

  // Safe API base (fix missing slash issues)
  const RAW = process.env.REACT_APP_BACKEND_URL || "";
  const BASE = RAW.endsWith("/") ? RAW : `${RAW}/`;
  const API_URL = `${BASE}api`;

  useEffect(() => {
    dispatch(getBanks());
  }, [dispatch]);

  // Input handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setExpense((prev) => ({
      ...prev,
      [name]: name === "bankID" ? String(value) : value,
    }));

    if (name === "paymentMethod") {
      if (value === "cash" || value === "credit") {
        setExpense((prev) => ({
          ...prev,
          expenseDate: new Date().toISOString().split("T")[0],
          chequeDate: "",
          bankID: "",
        }));
      }
    }
  };

  // ---- Helper: try multiple bank transaction endpoints ----
  const postBankSubtract = async ({ bankId, amount, description }) => {
    const amt = Number(amount);

    // If you know the exact route, you can replace this array with a single string.
    const candidates = [
      // path variants
      { url: `${API_URL}/banks/${bankId}/transactions`, body: {} },
      { url: `${API_URL}/banks/${bankId}/transaction`, body: {} },
      { url: `${API_URL}/bank/${bankId}/transactions`, body: {} },
      { url: `${API_URL}/banks/${bankId}/transactions/add`, body: {} },
      // body-based variant (no :id in path)
      { url: `${API_URL}/banks/transactions`, body: { bankID: String(bankId) } },
    ];

    let lastErr = null;

    for (const c of candidates) {
      try {
        const res = await axios.post(
          c.url,
          {
            // ⚠️ Change keys here if your backend expects different names (e.g. txnType/value/note)
            type: "subtract",
            amount: amt,
            description,
            ...c.body,
          },
          { withCredentials: true }
        );
        // success
        return res;
      } catch (e) {
        lastErr = e;
        const status = e?.response?.status;
        // If not 404, probably a real error (validation, auth, CORS...). Stop trying others.
        if (status && status !== 404) break;
      }
    }

    // Surface the best available message
    const msg =
      lastErr?.response?.data?.message ||
      lastErr?.message ||
      "Bank deduction failed (endpoint not found).";
    throw new Error(msg);
  };

  // Submit
  const addExpense = async () => {
    if (!expense.expenseName || !expense.amount || !expense.paymentMethod) {
      toast.error("Please fill all required fields!");
      return;
    }

    const amt = Number(expense.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a valid positive amount.");
      return;
    }

    const method = (expense.paymentMethod || "").toLowerCase();
    const isBankMethod = method === "online" || method === "cheque";

    if (isBankMethod && !expense.bankID) {
      toast.error("Select a bank for Online/Cheque payments.");
      return;
    }

    const payload = {
      expenseName: expense.expenseName,
      amount: amt,
      description: expense.description || "",
      expenseDate:
        expense.expenseDate || new Date().toISOString().split("T")[0],
      paymentMethod: method,
      bankID: isBankMethod ? String(expense.bankID) : undefined,
      chequeDate: method === "cheque" ? expense.chequeDate : undefined,
    };

    try {
      // 1) Create expense
      await axios.post(`${API_URL}/expenses/add`, payload, {
        withCredentials: true,
      });

      // 2) If paid via bank, subtract from that bank (with fallback routes)
      if (isBankMethod) {
        await postBankSubtract({
          bankId: String(expense.bankID),
          amount: amt,
          description: `Expense: ${expense.expenseName}`,
        });
      }

      // 3) Refresh banks in UI
      dispatch(getBanks());

      toast.success("Expense added successfully!");
      setShowExpenseModal(false);

      // 4) Reset form
      setExpense({
        expenseName: "",
        amount: "",
        description: "",
        expenseDate: "",
        paymentMethod: "",
        chequeDate: "",
        bankID: "",
      });
    } catch (e) {
      console.error("Expense/Bank update failed:", e?.message);
      toast.error(e?.message || "Failed to add expense or update bank.");
    }
  };

  // Toggle Modal
  const toggleExpenseModal = () => {
    setShowExpenseModal((s) => !s);
  };

  return (
    <Container>
      <ToastContainer />
      <Button
        variant="contained"
        color="primary"
        onClick={toggleExpenseModal}
        sx={{ mb: 2 }}
      >
        Add Expense
      </Button>

      <Dialog
        open={showExpenseModal}
        onClose={toggleExpenseModal}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add Expense</DialogTitle>
        <DialogContent>
          <form>
            <Grid container spacing={2}>
              {/* Expense Name */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Expense Name"
                  name="expenseName"
                  value={expense.expenseName}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Grid>

              {/* Amount */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  name="amount"
                  value={expense.amount}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Grid>

              {/* Description */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={expense.description}
                  onChange={handleInputChange}
                  multiline
                  rows={4}
                  margin="normal"
                />
              </Grid>

              {/* Payment Method */}
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    name="paymentMethod"
                    value={expense.paymentMethod}
                    onChange={handleInputChange}
                    label="Payment Method"
                  >
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="cheque">Cheque</MenuItem>
                    <MenuItem value="online">Online</MenuItem>
                    <MenuItem value="credit">Credit</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Bank (for Online/Cheque) */}
              {(expense.paymentMethod === "cheque" ||
                expense.paymentMethod === "online") && (
                <Grid item xs={12}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Bank Name</InputLabel>
                    <Select
                      name="bankID"
                      value={String(expense.bankID || "")}
                      onChange={handleInputChange}
                      label="Bank Name"
                    >
                      {banks.map((bank) => (
                        <MenuItem key={bank._id} value={String(bank._id)}>
                          {bank.bankName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* Cheque Date */}
              {expense.paymentMethod === "cheque" && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Cheque Date"
                    type="date"
                    name="chequeDate"
                    value={expense.chequeDate}
                    onChange={handleInputChange}
                    InputLabelProps={{ shrink: true }}
                    margin="normal"
                  />
                </Grid>
              )}

              {/* Expense Date */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Expense Date"
                  type="date"
                  name="expenseDate"
                  value={expense.expenseDate}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  margin="normal"
                  disabled={
                    expense.paymentMethod === "cash" ||
                    expense.paymentMethod === "credit"
                  }
                />
              </Grid>
            </Grid>
          </form>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="primary" onClick={addExpense}>
            Add Expense
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={toggleExpenseModal}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AddExpense;
