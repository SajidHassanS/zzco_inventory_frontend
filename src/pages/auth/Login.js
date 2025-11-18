import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Button,
  TextField,
  Typography,
  Grid,
  Paper,
  MenuItem
} from "@mui/material";
import heroImg from "../../assets/logom.png";

import {
  loginUser,
  loginManager,
  validateEmail
} from "../../services/authService";
import {
  SET_LOGIN,
  SET_ROLE,
  SET_USER
} from "../../redux/features/auth/authSlice";
import Loader from "../../components/loader/Loader";
import SignupImage from "../../assets/signup.jpg";

const initialState = {
  email: "",
  password: "",
  role: ""
};

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(initialState);
  const { email, password, role } = formData;

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleRoleChange = e => {
    setFormData({ ...formData, role: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!email || !password || !role) {
      return toast.error("All fields are required, including role.");
    }

    if (!validateEmail(email)) {
      return toast.error("Please enter a valid email");
    }

    const userData = { email, password };

    setIsLoading(true);
    try {
      let data;
      // ✅ Changed to lowercase for comparison
      if (role === "admin") {
        data = await loginUser(userData);
      } else if (role === "manager") {
        data = await loginManager(userData);
      } else {
        throw new Error("Invalid role selected");
      }

      await dispatch(SET_LOGIN(true));

      // ✅ Store the role with capital first letter for display/localStorage
      const displayRole = role.charAt(0).toUpperCase() + role.slice(1); // "admin" -> "Admin", "manager" -> "Manager"
      await dispatch(SET_ROLE(displayRole));
      await dispatch(SET_USER(data));

      navigate("/dashboard");
    } catch (error) {
      toast.error(error.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Grid container component={Paper} sx={{ height: "100vh" }}>
      {isLoading && <Loader />}
      <Grid
        item
        xs={false}
        sm={4}
        md={6}
        display={"flex"}
        justifyContent={"center"}
        alignItems={"center"}
      >
        <img
          src={heroImg}
          style={{ width: "60rem", borderRadius: "50%" }}
          alt="Signup"
        />
      </Grid>
      <Grid
        item
        xs={12}
        sm={8}
        md={6}
        display={"flex"}
        justifyContent={"center"}
        alignItems={"center"}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column"
          }}
        >
          <Typography variant="h5">Sign in to your Account</Typography>
          <form onSubmit={handleSubmit} style={{ marginTop: "24px" }}>
            <TextField
              select
              fullWidth
              id="role-select"
              name="role"
              value={role}
              sx={{ mt: 2 }}
              onChange={handleRoleChange}
              label="Role"
            >
              {/* ✅ Changed values to lowercase */}
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="manager">Manager</MenuItem>
            </TextField>
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email address"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleInputChange}
            />
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleInputChange}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              style={{ marginTop: "16px" }}
            >
              Sign In
            </Button>
          </form>
        </div>
      </Grid>
    </Grid>
  );
};

export default Login;
