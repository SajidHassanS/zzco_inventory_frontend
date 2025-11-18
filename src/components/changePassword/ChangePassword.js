import React, { useState } from "react";
import "./ChangePassword.scss";
import { toast } from "react-toastify";
import { changePassword } from "../../services/authService";
import Card from "../card/Card";
import { useNavigate } from "react-router-dom";

const initialState = {
  oldPassword: "",
  password: "",
  password2: "",
};

const ChangePassword = () => {
  const navigate = useNavigate();
  const [formData, setformData] = useState(initialState);
  const { oldPassword, password, password2 } = formData;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setformData({ ...formData, [name]: value });
  };

  const changePass = async (e) => {
    e.preventDefault();

    // Validation
    if (!oldPassword || !password || !password2) {
      return toast.error("All fields are required");
    }

    if (password !== password2) {
      return toast.error("New passwords do not match");
    }

    if (password.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    // Prepare data
    const passwordData = {
      oldPassword,
      password,
    };

    console.log("Sending password change request:", passwordData); // ✅ Debug log

    try {
      const data = await changePassword(passwordData);
      console.log("Password change response:", data); // ✅ Debug log
      
      toast.success(data?.message || "Password changed successfully");
      navigate("/profile");
    } catch (error) {
      console.error("Password change error:", error); // ✅ Debug log
      console.error("Error response:", error.response?.data); // ✅ Debug log
      
      const errorMessage = 
        error.response?.data?.message || 
        error.message || 
        "Failed to change password";
      
      toast.error(errorMessage);
    }
  };

  return (
    <div className="change-password">
      <Card cardClass={"password-card"}>
        <h3>Change Password</h3>
        <form onSubmit={changePass} className="--form-control">
          <input
            type="password"
            placeholder="Old Password"
            required
            name="oldPassword"
            value={oldPassword}
            onChange={handleInputChange}
          />
          <input
            type="password"
            placeholder="New Password"
            required
            name="password"
            value={password}
            onChange={handleInputChange}
            minLength={6}
          />
          <input
            type="password"
            placeholder="Confirm New Password"
            required
            name="password2"
            value={password2}
            onChange={handleInputChange}
            minLength={6}
          />
          <button type="submit" className="--btn --btn-primary">
            Change Password
          </button>
        </form>
      </Card>
    </div>
  );
};

export default ChangePassword;