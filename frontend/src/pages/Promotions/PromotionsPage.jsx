import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
} from '@mui/material';
import { Add as AddIcon, Send as SendIcon } from '@mui/icons-material';
import { promoAPI } from '../../services/api';
import { format } from 'date-fns';

export default function PromotionsPage() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    promoName: '',
    description: '',
    startDt: '',
    endDt: '',
    targetSegment: 'DORMANT',
  });

  useEffect(() => {
    fetchPromos();
  }, []);

  const fetchPromos = async () => {
    try {
      const response = await promoAPI.getPromos();
      setPromos(response.data);
    } catch (error) {
      console.error('Error fetching promos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromo = async () => {
    try {
      await promoAPI.createPromo(formData);
      setDialogOpen(false);
      fetchPromos();
      setFormData({
        promoName: '',
        description: '',
        startDt: '',
        endDt: '',
        targetSegment: 'DORMANT',
      });
    } catch (error) {
      console.error('Error creating promo:', error);
    }
  };

  const handleSendPromo = async (promoId) => {
    try {
      await promoAPI.sendPromo(promoId);
      alert('Promotion sent successfully!');
      fetchPromos();
    } catch (error) {
      console.error('Error sending promo:', error);
      alert('Failed to send promotion');
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Promotions</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Create Promotion
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Promo Name</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Target Segment</TableCell>
              <TableCell>SKUs</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {promos.map((promo) => (
              <TableRow key={promo.PROMO_ID}>
                <TableCell>{promo.PROMO_NAME}</TableCell>
                <TableCell>{format(new Date(promo.START_DT), 'MMM dd, yyyy')}</TableCell>
                <TableCell>{format(new Date(promo.END_DT), 'MMM dd, yyyy')}</TableCell>
                <TableCell>{promo.TARGET_SEGMENT}</TableCell>
                <TableCell>{promo.SKU_COUNT}</TableCell>
                <TableCell>
                  <Chip
                    label={promo.STATUS_CODE}
                    color={promo.STATUS_CODE === 'ACTIVE' ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {promo.STATUS_CODE === 'DRAFT' && (
                    <Button
                      size="small"
                      startIcon={<SendIcon />}
                      onClick={() => handleSendPromo(promo.PROMO_ID)}
                    >
                      Send
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Promotion</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Promotion Name"
                value={formData.promoName}
                onChange={(e) => setFormData({ ...formData, promoName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={formData.startDt}
                onChange={(e) => setFormData({ ...formData, startDt: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={formData.endDt}
                onChange={(e) => setFormData({ ...formData, endDt: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreatePromo} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
