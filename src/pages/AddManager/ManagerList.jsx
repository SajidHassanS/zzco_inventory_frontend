import React from "react";
import { Avatar, Box } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

const CustomerList = ({ customers }) => {
  const columns = [
    {
      field: "avatar",
      headerName: "Avatar",
      width: 100,
      renderCell: (params) => (
        <Avatar src={params.value} alt={params.row.username} />
      ),
    },
    { field: "_id", headerName: "ID", width: 150 },
    { field: "username", headerName: "Username", width: 150 },
    // { field: "email", headerName: "Email", width: 200 },
    { field: "phone", headerName: "Phone", width: 150 },
  ];

  return (
    <Box
      sx={{
        margin: 3,
        bgcolor: "white",
        borderRadius: 2,
        padding: 3,
        width: "auto",
        // height: "100%",
      }}
    >
      <DataGrid
        sx={{
          borderLeft: 0,
          borderRight: 0,
          borderRadius: 0,
        }}
        rows={customers}
        columns={columns}
        getRowId={(row) => row._id} // Use _id as the id
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 10 },
          },
        }}
        pageSizeOptions={[15, 20, 30]}
        rowSelection={false}
      />
    </Box>
  );
};

export default CustomerList;