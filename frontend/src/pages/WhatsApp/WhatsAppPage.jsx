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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import { whatsappAPI } from '../../services/api';
import { format } from 'date-fns';

export default function WhatsAppPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [directionFilter, setDirectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await whatsappAPI.getMessages({ limit: 100 });
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = messages.filter((msg) => {
    if (directionFilter && msg.DIRECTION_CODE !== directionFilter) return false;
    if (statusFilter && msg.STATUS_CODE !== statusFilter) return false;
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'SENT':
      case 'DELIVERED':
        return 'success';
      case 'READ':
        return 'info';
      case 'REPLIED':
        return 'primary';
      case 'FAILED':
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
        WhatsApp Message Logs
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>Direction</InputLabel>
            <Select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              label="Direction"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="OUTBOUND">Outbound</MenuItem>
              <MenuItem value="INBOUND">Inbound</MenuItem>
              <MenuItem value="INTERNAL_ALERT">Internal Alert</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="QUEUED">Queued</MenuItem>
              <MenuItem value="SENT">Sent</MenuItem>
              <MenuItem value="DELIVERED">Delivered</MenuItem>
              <MenuItem value="READ">Read</MenuItem>
              <MenuItem value="REPLIED">Replied</MenuItem>
              <MenuItem value="FAILED">Failed</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date/Time</TableCell>
              <TableCell>Direction</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Phone Number</TableCell>
              <TableCell>Message</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredMessages.map((msg) => (
              <TableRow key={msg.MSG_ID}>
                <TableCell>
                  {format(new Date(msg.CREATED_AT), 'MMM dd, yyyy HH:mm')}
                </TableCell>
                <TableCell>
                  <Chip label={msg.DIRECTION_CODE} size="small" />
                </TableCell>
                <TableCell>{msg.MESSAGE_TYPE}</TableCell>
                <TableCell>{msg.PHONE_NUMBER || '-'}</TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                    {msg.MESSAGE_BODY}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={msg.STATUS_CODE}
                    color={getStatusColor(msg.STATUS_CODE)}
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
