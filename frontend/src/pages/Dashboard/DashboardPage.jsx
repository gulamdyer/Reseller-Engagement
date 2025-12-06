import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { analyticsAPI } from '../../services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [salesTrend, setSalesTrend] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [overviewData, trendData] = await Promise.all([
        analyticsAPI.getOverview(),
        analyticsAPI.getSalesTrend(),
      ]);

      setOverview(overviewData.data);
      setSalesTrend(trendData.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const segmentationData = overview?.resellers
    ? [
        { name: 'Active', value: overview.resellers.active },
        { name: 'Dormant', value: overview.resellers.dormant },
        { name: 'Churned', value: overview.resellers.churned },
      ]
    : [];

  const whatsappData = overview?.whatsapp
    ? [
        { name: 'Sent', value: overview.whatsapp.SENT_COUNT || 0 },
        { name: 'Delivered', value: overview.whatsapp.DELIVERED_COUNT || 0 },
        { name: 'Read', value: overview.whatsapp.READ_COUNT || 0 },
        { name: 'Replied', value: overview.whatsapp.REPLIED_COUNT || 0 },
      ]
    : [];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard Overview
      </Typography>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Resellers
              </Typography>
              <Typography variant="h4">{overview?.resellers?.total || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Resellers
              </Typography>
              <Typography variant="h4" color="success.main">
                {overview?.resellers?.active || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Dormant Resellers
              </Typography>
              <Typography variant="h4" color="warning.main">
                {overview?.resellers?.dormant || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Credit Back Outstanding
              </Typography>
              <Typography variant="h4" color="primary">
                AED {overview?.creditBack?.totalOutstanding?.toFixed(2) || '0.00'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Sales Trend */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sales Trend (Last 6 Months)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sales" stroke="#8884d8" name="Total Sales" />
                  <Line type="monotone" dataKey="promoSales" stroke="#82ca9d" name="Promo Sales" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Reseller Segmentation */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Reseller Segmentation
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={segmentationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {segmentationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* WhatsApp Engagement */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                WhatsApp Engagement (Last 30 Days)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={whatsappData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
