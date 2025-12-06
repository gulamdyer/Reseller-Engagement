import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
} from '@mui/material';

export default function SettingsPage() {
  const [settings, setSettings] = React.useState({
    resellerDormantDays: '60',
    resellerChurnedDays: '90',
    promoMaxPerWeek: '2',
    creditExpiryDays: '180',
  });

  const handleSave = () => {
    alert('Settings saved successfully!');
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Reseller Segmentation
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Dormant Threshold (Days)"
              type="number"
              value={settings.resellerDormantDays}
              onChange={(e) =>
                setSettings({ ...settings, resellerDormantDays: e.target.value })
              }
              helperText="Days without order to consider reseller dormant"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Churned Threshold (Days)"
              type="number"
              value={settings.resellerChurnedDays}
              onChange={(e) =>
                setSettings({ ...settings, resellerChurnedDays: e.target.value })
              }
              helperText="Days without order to consider reseller churned"
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Promotion Settings
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Max Promotions Per Week"
              type="number"
              value={settings.promoMaxPerWeek}
              onChange={(e) =>
                setSettings({ ...settings, promoMaxPerWeek: e.target.value })
              }
              helperText="Maximum promotions per reseller per week"
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Credit Back Settings
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Credit Expiry (Days)"
              type="number"
              value={settings.creditExpiryDays}
              onChange={(e) =>
                setSettings({ ...settings, creditExpiryDays: e.target.value })
              }
              helperText="Days until earned credit expires"
            />
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ mt: 3 }}>
        <Button variant="contained" onClick={handleSave}>
          Save Settings
        </Button>
      </Box>
    </Box>
  );
}
