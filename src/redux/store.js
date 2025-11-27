import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../redux/features/auth/authSlice";
import productReducer from "../redux/features/product/productSlice";
import bankReducer from "../redux/features/Bank/bankSlice";
import filterReducer from "../redux/features/product/filterSlice";
import warehouseReducer from "../redux/features/WareHouse/warehouseSlice";
import ChequeReducer from "../redux/features/cheque/chequeSlice";
import supplierReducer from "../redux/features/supplier/supplierSlice";
import customerReducer from "../redux/features/cutomer/customerSlice";
import cashReducer from "../redux/features/cash/cashSlice";
import damageProductReducer from "../redux/features/damageProduct/damageProductSlice";
import returnProductReducer from "../redux/features/return/returnProductSlice"; // ✅ NEW
import shipperReducer from "../redux/features/shipper/shipperSlice";
export const store = configureStore({
  reducer: {
    auth: authReducer,
    product: productReducer,
    bank: bankReducer,
    filter: filterReducer,
    warehouse: warehouseReducer,
    cheque: ChequeReducer,
    supplier: supplierReducer,
    customer: customerReducer,
    cash: cashReducer,
    damageProduct: damageProductReducer,
    returnProduct: returnProductReducer,
    shipper: shipperReducer
  }
});
