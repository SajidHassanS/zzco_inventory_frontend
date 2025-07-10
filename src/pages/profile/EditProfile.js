import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Box, Button, TextField, Typography, CircularProgress, Avatar, Grid } from "@mui/material";
import { toast } from "react-toastify";
import { selectUser } from "../../redux/features/auth/authSlice";
import { updateUser } from "../../services/authService";
import ChangePassword from "../../components/changePassword/ChangePassword";
import Card from "../../components/card/Card";

const EditProfile = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const user = useSelector(selectUser);
  const { email } = user;

  useEffect(() => {
    if (!email) {
      navigate("/profile");
    }
  }, [email, navigate]);

  const initialState = {
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    photo: user?.photo || "",
  };
  const [profile, setProfile] = useState(initialState);
  const [profileImage, setProfileImage] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile((prevProfile) => ({ ...prevProfile, [name]: value }));
  };

  const handleImageChange = (e) => {
    setProfileImage(e.target.files[0]);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      let imageURL;
      if (
        profileImage &&
        (profileImage.type === "image/jpeg" ||
          profileImage.type === "image/jpg" ||
          profileImage.type === "image/png")
      ) {
        const image = new FormData();
        image.append("file", profileImage);
        image.append("cloud_name", "zinotrust");
        image.append("upload_preset", "wk66xdkq");

        // Save image to Cloudinary
        const response = await fetch(
          "https://api.cloudinary.com/v1_1/zinotrust/image/upload",
          { method: "post", body: image }
        );
        const imgData = await response.json();
        imageURL = imgData.url.toString();
      }

      // Save Profile
      const formData = {
        name: profile.name,
        phone: profile.phone,
        photo: imageURL || profile.photo,
      };

      const data = await updateUser(formData);
      console.log(data);
      toast.success("User updated");
      navigate("/profile");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ padding: 3 }}>
      {isLoading && <CircularProgress />}
      <Grid container spacing={3} g>
        <Grid item md={6}>


          <Card>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 3 }}>
              <Avatar src={profile.photo} sx={{ width: 100, height: 100, mb: 2 }} />
              <Typography variant="h6">Edit Profile</Typography>
            </Box>

            <form onSubmit={saveProfile}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 ,p:3}}>
                <TextField
                  fullWidth
                  label="Name"
                  name="name"
                  value={profile.name}
                  onChange={handleInputChange}
                />
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  value={profile.email}
                  disabled
                />
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={profile.phone}
                  onChange={handleInputChange}
                />
                <Button variant="contained" component="label">
                  Upload Photo
                  <input type="file" hidden onChange={handleImageChange} />
                </Button>
                <Button variant="contained" color="primary" type="submit">
                  Save Changes
                </Button>
              </Box>
            </form>
          </Card>
        </Grid>
        <Grid md={6} item>
          <Box sx={{ mt: 3 }}>
            <ChangePassword />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EditProfile;
