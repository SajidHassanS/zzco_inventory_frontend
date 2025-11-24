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
  MenuItem,
  InputAdornment,
  IconButton
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import heroImg from "../../assets/logom.png";

import { loginUser, validateEmail } from "../../services/authService";
import {
  SET_LOGIN,
  SET_ROLE,
  SET_USER
} from "../../redux/features/auth/authSlice";
import Loader from "../../components/loader/Loader";

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
  const [showPassword, setShowPassword] = useState(false);
  const { email, password, role } = formData;

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleRoleChange = e => {
    setFormData({ ...formData, role: e.target.value });
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = event => {
    event.preventDefault();
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!email || !password || !role) {
      return toast.error("All fields are required, including role.");
    }

    if (!validateEmail(email)) {
      return toast.error("Please enter a valid email");
    }

    // ✅ Include role in userData
    const userData = { email, password, role };

    setIsLoading(true);
    try {
      // ✅ Clear old data before login
      localStorage.removeItem("userRole");
      localStorage.removeItem("name");
      localStorage.removeItem("token");

      // ✅ Use single loginUser function - it now handles role
      const data = await loginUser(userData);

      // ✅ Check if login was successful (data returned)
      if (!data) {
        throw new Error("Login failed - no data returned");
      }

      await dispatch(SET_LOGIN(true));

      // ✅ Use role from response or the selected role
      const displayRole =
        (data.role || role).charAt(0).toUpperCase() +
        (data.role || role).slice(1);
      await dispatch(SET_ROLE(displayRole));
      await dispatch(SET_USER(data));

      navigate("/dashboard");
    } catch (error) {
      console.error("❌ Login error:", error);
      // Toast is already shown in authService, so we don't need to show it again
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
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleInputChange}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
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
