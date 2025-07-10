import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TablePagination,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { ViewArrayOutlined } from '@mui/icons-material';
import { BsEyeFill } from 'react-icons/bs';

const CustomTable = ({ columns, data, onEdit, onDelete,onView ,cashtrue}) => {
  console.log("cashtrue",cashtrue);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const emptyRows = rowsPerPage - Math.min(rowsPerPage, data.length - page * rowsPerPage);

  return (
    <Paper>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.field}>{column.headerName}</TableCell>
              ))}
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row) => (
                <TableRow key={row._id}>
                  {columns.map((column) => (
                    <TableCell key={column.field}>
                      {column.renderCell ? column.renderCell(row) : row[column.field]}
                    </TableCell>
                  ))}
                  <TableCell>
                    <IconButton onClick={() => onEdit(row)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => onDelete(row)}>
                      <DeleteIcon />
                    </IconButton>
                    {cashtrue !== "true" && (
  <IconButton onClick={() => onView(row)}>
    <BsEyeFill />
  </IconButton>
)}


                    {/* {renderRowActions && renderRowActions(row)} // New line for rendering row actions */}

                  </TableCell>
                </TableRow>
              ))}
            {emptyRows > 0 && (
              <TableRow style={{ height: 53 * emptyRows }}>
                <TableCell colSpan={columns.length + 1} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={data.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default CustomTable;