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
  IconButton,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { creditBackAPI } from '../../services/api';
import { format } from 'date-fns';

export default function CreditBackPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    ruleName: '',
    validFrom: '',
    validTo: '',
    modeCode: 'NEXT_ORDER',
    brackets: [{ minSalesAmount: 0, maxSalesAmount: 5000, creditPercent: 1 }],
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await creditBackAPI.getRules();
      setRules(response.data);
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRule = async () => {
    try {
      if (editingRule) {
        await creditBackAPI.updateRule(editingRule.RULE_ID, formData);
      } else {
        await creditBackAPI.createRule(formData);
      }
      setDialogOpen(false);
      fetchRules();
    } catch (error) {
      console.error('Error saving rule:', error);
    }
  };

  const handleAddBracket = () => {
    setFormData({
      ...formData,
      brackets: [...formData.brackets, { minSalesAmount: 0, maxSalesAmount: null, creditPercent: 0 }],
    });
  };

  const handleBracketChange = (index, field, value) => {
    const newBrackets = [...formData.brackets];
    newBrackets[index][field] = value === '' ? null : parseFloat(value);
    setFormData({ ...formData, brackets: newBrackets });
  };

  const handleRemoveBracket = (index) => {
    const newBrackets = formData.brackets.filter((_, i) => i !== index);
    setFormData({ ...formData, brackets: newBrackets });
  };

  const handleOpenDialog = (rule = null) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        ruleName: rule.RULE_NAME,
        validFrom: format(new Date(rule.VALID_FROM), 'yyyy-MM-dd'),
        validTo: format(new Date(rule.VALID_TO), 'yyyy-MM-dd'),
        modeCode: rule.MODE_CODE,
        brackets: rule.brackets || [],
      });
    } else {
      setEditingRule(null);
      setFormData({
        ruleName: '',
        validFrom: '',
        validTo: '',
        modeCode: 'NEXT_ORDER',
        brackets: [{ minSalesAmount: 0, maxSalesAmount: 5000, creditPercent: 1 }],
      });
    }
    setDialogOpen(true);
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
        <Typography variant="h4">Credit Back Rules</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Create Rule
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Rule Name</TableCell>
              <TableCell>Valid From</TableCell>
              <TableCell>Valid To</TableCell>
              <TableCell>Mode</TableCell>
              <TableCell>Brackets</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.RULE_ID}>
                <TableCell>{rule.RULE_NAME}</TableCell>
                <TableCell>{format(new Date(rule.VALID_FROM), 'MMM dd, yyyy')}</TableCell>
                <TableCell>{format(new Date(rule.VALID_TO), 'MMM dd, yyyy')}</TableCell>
                <TableCell>{rule.MODE_CODE}</TableCell>
                <TableCell>{rule.BRACKET_COUNT}</TableCell>
                <TableCell>
                  <Chip
                    label={rule.IS_ACTIVE === 'Y' ? 'Active' : 'Inactive'}
                    color={rule.IS_ACTIVE === 'Y' ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleOpenDialog(rule)}>
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingRule ? 'Edit Rule' : 'Create Credit Back Rule'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Rule Name"
                value={formData.ruleName}
                onChange={(e) => setFormData({ ...formData, ruleName: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Valid From"
                type="date"
                value={formData.validFrom}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Valid To"
                type="date"
                value={formData.validTo}
                onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Brackets
              </Typography>
              {formData.brackets.map((bracket, index) => (
                <Grid container spacing={2} key={index} sx={{ mb: 1 }}>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      label="Min Sales"
                      type="number"
                      size="small"
                      value={bracket.minSalesAmount}
                      onChange={(e) => handleBracketChange(index, 'minSalesAmount', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      label="Max Sales"
                      type="number"
                      size="small"
                      value={bracket.maxSalesAmount || ''}
                      onChange={(e) => handleBracketChange(index, 'maxSalesAmount', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      label="Credit %"
                      type="number"
                      size="small"
                      value={bracket.creditPercent}
                      onChange={(e) => handleBracketChange(index, 'creditPercent', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <IconButton onClick={() => handleRemoveBracket(index)} disabled={formData.brackets.length === 1}>
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
              <Button size="small" onClick={handleAddBracket}>Add Bracket</Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveRule} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
