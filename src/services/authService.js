import axios from "axios";
import { toast } from "react-toastify";
export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const validateEmail = email => {
  return email.match(
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  );
};

// Register User
export const registerUser = async userData => {
  try {
    const response = await axios.post(
      `${BACKEND_URL}api/users/register`,
      userData,
      { withCredentials: true }
    );
    if (response.statusText === "OK") {
      toast.success("User Registered successfully");
    }
    return response.data;
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    toast.error(message);
    throw new Error(message); // ✅ Throw error so Login.jsx can catch it
  }
};

// ✅ UPDATED: Login User - Now accepts role
export const loginUser = async userData => {
  try {
    const response = await axios.post(
      `${BACKEND_URL}api/users/login`,
      userData, // ✅ userData now includes { email, password, role }
      { withCredentials: true }
    );

    if (response.statusText === "OK" || response.status === 200) {
      const { role, name } = response.data;
      console.log("✅ Login successful - Role:", role, "Name:", name);
      if (role) localStorage.setItem("userRole", role);
      if (name) localStorage.setItem("name", name);
      toast.success("Login Successful...");
    }

    return response.data;
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    toast.error(message);
    throw new Error(message); // ✅ Throw error so Login.jsx can catch it
  }
};

// Login Customer
export const loginCustomer = async userData => {
  try {
    const response = await axios.post(
      `${BACKEND_URL}api/users/Customerlogin`,
      userData,
      { withCredentials: true }
    );
    if (response.statusText === "OK" || response.status === 200) {
      const { role } = response.data;
      if (role) {
        localStorage.setItem("userRole", role);
        toast.success(`Logged in as ${role}`);
      } else {
        console.warn("Role is missing in the response data");
      }
      toast.success("Login Successful...");
    }
    return response.data;
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    toast.error(message);
    throw new Error(message);
  }
};

// ✅ UPDATED: Login Manager - Now uses same endpoint with role
export const loginManager = async userData => {
  try {
    const response = await axios.post(
      `${BACKEND_URL}api/users/login`, // ✅ Changed to same endpoint
      { ...userData, role: "manager" }, // ✅ Add role to request
      { withCredentials: true }
    );
    if (response.statusText === "OK" || response.status === 200) {
      const { role, name } = response.data;
      if (role) {
        localStorage.setItem("userRole", role);
      }
      if (name) {
        localStorage.setItem("name", name);
      }
      toast.success("Login Successful...");
    }
    return response.data;
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    toast.error(message);
    throw new Error(message); // ✅ Throw error so Login.jsx can catch it
  }
};

// Logout User
export const logoutUser = async () => {
  try {
    await axios.get(`${BACKEND_URL}api/users/logout`, {
      withCredentials: true
    });
    localStorage.removeItem("userRole");
    localStorage.removeItem("name");
    toast.info("Logged out successfully");
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    toast.error(message);
  }
};

// Forgot Password
export const forgotPassword = async userData => {
  try {
    const response = await axios.post(
      `${BACKEND_URL}api/users/forgotpassword`,
      userData
    );
    toast.success(response.data.message);
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    toast.error(message);
  }
};

// Reset Password
export const resetPassword = async (userData, resetToken) => {
  try {
    const response = await axios.put(
      `${BACKEND_URL}api/users/resetpassword/${resetToken}`,
      userData
    );
    return response.data;
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    toast.error(message);
  }
};

// Get Login Status
export const getLoginStatus = async () => {
  try {
    const response = await axios.get(`${BACKEND_URL}api/users/loggedin`, {
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    toast.error(message);
  }
};

// Get User Profile
export const getUser = async () => {
  try {
    const response = await axios.get(`${BACKEND_URL}api/users/getuser`, {
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    toast.error(message);
  }
};

// Update Profile
export const updateUser = async formData => {
  try {
    const response = await axios.patch(
      `${BACKEND_URL}api/users/updateuser`,
      formData,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    toast.error(message);
  }
};

// Change Password
export const changePassword = async formData => {
  try {
    const response = await axios.patch(
      `${BACKEND_URL}api/users/changepassword`,
      formData,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    toast.error(message);
    throw error;
  }
};
