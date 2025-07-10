import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination
} from '@mui/material';

const CustomTable = ({ columns, data, page, rowsPerPage, onPageChange, onRowsPerPageChange, maxHeight = "600px" }) => {
  return (
    <Paper>
      <TableContainer style={{ maxHeight: maxHeight || '400px' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.field}>{column.headerName}</TableCell>
              ))}
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
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={data.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    </Paper>
  );
};

export default CustomTable;