import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home/Home";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Forgot from "./pages/auth/Forgot";
import Reset from "./pages/auth/Reset";
import Dashboard from "./pages/dashboard/Dashboard";
import Sidebar from "./components/sidebar/Sidebar";
import Layout from "./components/layout/Layout";
import axios from "axios";
// import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useDispatch } from "react-redux";
import { getLoginStatus } from "./services/authService";
import { SET_LOGIN } from "./redux/features/auth/authSlice";

//ADD
import AddProduct from "./pages/addProduct/AddProduct";
import AddCustomer from "./pages/customer/Customer.jsx";
import AddSupplier from "./pages/Supplier/Supplier.jsx";
import AddManager from "./pages/AddManager/Manager.jsx";
import Order from "./pages/Orders/Order.jsx";
import ProductDetail from "./components/product/productDetail/ProductDetail";
import SaleProduct from "./pages/SaleProduct/Sales.js";

//Edite
import EditProduct from "./pages/editProduct/EditProduct";
//Accounts
import Profile from "./pages/profile/Profile";
import EditProfile from "./pages/profile/EditProfile";
import Contact from "./pages/contact/Contact";
import EditCustomer from "./pages/profile/EditProfile";
import EditManager from "./pages/profile/EditProfile";
import AddExpenses from "./pages/ownAccount/AddExpenses.js";
import ViewExpenses from "./pages/ownAccount/ViewExpenses.js";
import ViewWarehouse from "./pages/Warehouse/ViewWarehouse.js";
import AddBank from "./pages/ownAccount/bank-accounts/AddBank.jsx";
import ChequeDetails from "./pages/CheuqeDetail/CheuqeDetails.js";

axios.defaults.withCredentials = true;

function App() {
  const dispatch = useDispatch();

  useEffect(
    () => {
      async function loginStatus() {
        const status = await getLoginStatus();
        dispatch(SET_LOGIN(status));
      }
      loginStatus();
    },
    [dispatch]
  );

  return (
    <BrowserRouter>
      {/* <ToastContainer /> */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* 
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/resetpassword/:resetToken" element={<Reset />} /> */}

        <Route
          path="/dashboard"
          element={
            <Sidebar>
              <Layout>
                <Dashboard />
              </Layout>
            </Sidebar>
          }
        />
        <Route
          path="/add-product"
          element={
            <Sidebar>
              <Layout>
                <AddProduct />
              </Layout>
            </Sidebar>
          }
        />
        <Route
          path="/cheque-details"
          element={
            <Sidebar>
              <Layout>
                <ChequeDetails />
              </Layout>
            </Sidebar>
          }
        />
        <Route
          path="/add-customer"
          element={
            <Sidebar>
              <Layout>
                <AddCustomer />
              </Layout>
            </Sidebar>
          }
        />
        <Route
          path="/add-supplier"
          element={
            <Sidebar>
              <Layout>
                <AddSupplier />
              </Layout>
            </Sidebar>
          }
        />
        <Route
          path="/add-manager"
          element={
            <Sidebar>
              <Layout>
                <AddManager />
              </Layout>
            </Sidebar>
          }
        />
        {/* <Route
          path="/order"
          element={
            <Sidebar>
              <Layout>
                <Order />
              </Layout>
            </Sidebar>
          }
        /> */}
        <Route
          path="/product-detail/:id"
          element={
            <Sidebar>
              <Layout>
                <ProductDetail />
              </Layout>
            </Sidebar>
          }
        />
        <Route
          path="/edit-product/:id"
          element={
            <Sidebar>
              <Layout>
                <EditProduct />
              </Layout>
            </Sidebar>
          }
        />
        <Route
          path="/profile"
          element={
            <Sidebar>
              <Layout>
                <Profile />
              </Layout>
            </Sidebar>
          }
        />
        <Route
          path="/edit-profile"
          element={
            <Sidebar>
              <Layout>
                <EditProfile />
              </Layout>
            </Sidebar>
          }
        />
        <Route
          path="/add-expenses"
          element={
            <Sidebar>
              <Layout>
                <AddExpenses />
              </Layout>
            </Sidebar>
          }
        />
        <Route
          path="/view-expenses"
          element={
            <Sidebar>
              <Layout>
                <ViewExpenses />
              </Layout>
            </Sidebar>
          }
        />

        <Route
          path="/view-warehouse"
          element={
            <Sidebar>
              <Layout>
                <ViewWarehouse />
              </Layout>
            </Sidebar>
          }
        />

        <Route
          path="/bank-accounts"
          element={
            <Sidebar>
              <Layout>
                <AddBank />
              </Layout>
            </Sidebar>
          }
        />

        {/* <Route
          path="/view-expenses"
          element={
            <Sidebar>
              <Layout>
               <ViewExpenses/>
              </Layout>
            </Sidebar>
          }
        /> */}

        <Route
          path="/Add-sale"
          element={
            <Sidebar>
              <Layout>
                <SaleProduct />
              </Layout>
            </Sidebar>
          }
        />

        <Route
          path="/contact-us"
          element={
            <Sidebar>
              <Layout>
                <Contact />
              </Layout>
            </Sidebar>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
