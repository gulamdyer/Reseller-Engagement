import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { resellerAPI } from '../../services/api';
import { format } from 'date-fns';

export default function ResellersPage() {
  const [resellers, setResellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchResellers();
  }, []);

  const fetchResellers = async () => {
    try {
      const response = await resellerAPI.getResellers();
      setResellers(response.data);
    } catch (error) {
      console.error('Error fetching resellers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResellers = resellers.filter(
    (r) =>
      r.RESELLER_NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.REGION?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'DORMANT':
        return 'warning';
      case 'CHURNED':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Resellers
      </Typography>

      <TextField
        fullWidth
        placeholder="Search resellers..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Reseller Name</TableCell>
              <TableCell>Region</TableCell>
              <TableCell>Last Order Date</TableCell>
              <TableCell>Days Since Order</TableCell>
              <TableCell>Orders (12M)</TableCell>
              <TableCell>Sales (12M)</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredResellers.map((reseller) => (
              <TableRow key={reseller.RESELLER_ID}>
                <TableCell>{reseller.RESELLER_NAME}</TableCell>
                <TableCell>{reseller.REGION || '-'}</TableCell>
                <TableCell>
                  {reseller.LAST_ORDER_DATE
                    ? format(new Date(reseller.LAST_ORDER_DATE), 'MMM dd, yyyy')
                    : 'Never'}
                </TableCell>
                <TableCell>{reseller.DAYS_SINCE_LAST_ORDER || '-'}</TableCell>
                <TableCell>{reseller.ORDERS_LAST_12M || 0}</TableCell>
                <TableCell>AED {(reseller.SALES_LAST_12M || 0).toFixed(2)}</TableCell>
                <TableCell>
                  <Chip
                    label={reseller.ACTIVITY_STATUS || 'UNKNOWN'}
                    color={getStatusColor(reseller.ACTIVITY_STATUS)}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
