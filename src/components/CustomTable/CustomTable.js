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

const CustomTable = ({
  columns = [],
  data = [],
  page = 0,
  rowsPerPage = 5,
  onPageChange = () => {},            // safe defaults
  onRowsPerPageChange = () => {},
  maxHeight = "600px"
}) => {
  // Adapter: MUI → numeric only
  const handleMuiPageChange = (_event, newPage) => {
    onPageChange(newPage);            // pass just the number
  };

  const handleMuiRowsPerPageChange = (event) => {
    const next = parseInt(event.target.value, 10) || rowsPerPage;
    onRowsPerPageChange(next);        // pass just the number
  };

  const start = page * rowsPerPage;
  const pageRows = data.slice(start, start + rowsPerPage);

  return (
    <Paper>
      <TableContainer style={{ maxHeight }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.field}>{column.headerName}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map((row, i) => (
              <TableRow key={row._id || i}>
                {columns.map((column) => (
                  <TableCell key={column.field}>
                    {typeof column.renderCell === 'function'
                      ? column.renderCell(row)
                      : row[column.field] ?? '-'}
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
        count={data.length}                 // total rows
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleMuiPageChange}  // MUI signature -> adapter
        onRowsPerPageChange={handleMuiRowsPerPageChange}
      />
    </Paper>
  );
};

export default CustomTable;
