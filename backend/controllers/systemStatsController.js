// backend/controllers/systemStatsController.js
const User = require('../models/User');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Invoice = require('../models/Invoice');
const TimeTracking = require('../models/TimeTracking');
const SystemLog = require('../models/SystemLog');

// @desc    Allgemeine Systemstatistiken abrufen
// @route   GET /api/stats
// @access  Private/Admin
exports.getSystemStats = async (req, res) => {
  try {
    // Sammle Statistiken aus verschiedenen Sammlungen
    const [
      usersCount,
      customersCount,
      ordersCount,
      invoicesCount,
      totalRevenue,
      timeTrackingsCount
    ] = await Promise.all([
      User.countDocuments(),
      Customer.countDocuments(),
      Order.countDocuments(),
      Invoice.countDocuments(),
      Invoice.aggregate([
        { $match: { status: 'bezahlt' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      TimeTracking.countDocuments()
    ]);

    // Ermittle den Gesamtumsatz (bezahlte Rechnungen)
    const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

    // Berechne offene Rechnungen
    const openInvoices = await Invoice.aggregate([
      { $match: { status: { $ne: 'bezahlt' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    const openAmount = openInvoices.length > 0 ? openInvoices[0].total : 0;

    res.status(200).json({
      success: true,
      data: {
        users: usersCount,
        customers: customersCount,
        orders: ordersCount,
        invoices: invoicesCount,
        revenue: revenue,
        openAmount: openAmount,
        timeTrackings: timeTrackingsCount
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Systemstatistiken:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der Systemstatistiken'
    });
  }
};

// @desc    Monatlichen Umsatz für das aktuelle Jahr abrufen
// @route   GET /api/stats/monthly-revenue
// @access  Private/Admin
exports.getMonthlyRevenue = async (req, res) => {
  try {
    // Aktuelles Jahr bestimmen
    const year = parseInt(req.query.year) || new Date().getFullYear();
    
    // Monatsumsatz berechnen (auch für noch nicht vergangene Monate)
    const monthlyRevenue = await Invoice.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { month: { $month: '$createdAt' } },
          total: { $sum: '$totalAmount' },
          paid: {
            $sum: {
              $cond: { if: { $eq: ['$status', 'bezahlt'] }, then: '$totalAmount', else: 0 }
            }
          }
        }
      },
      { $sort: { '_id.month': 1 } }
    ]);

    // Daten für alle 12 Monate formatieren (mit 0 für Monate ohne Umsatz)
    const formattedData = [];
    for (let i = 1; i <= 12; i++) {
      const monthData = monthlyRevenue.find(item => item._id.month === i);
      formattedData.push({
        month: i,
        monthName: new Date(year, i - 1, 1).toLocaleString('de-DE', { month: 'short' }),
        total: monthData ? monthData.total : 0,
        paid: monthData ? monthData.paid : 0,
        unpaid: monthData ? (monthData.total - monthData.paid) : 0
      });
    }

    res.status(200).json({
      success: true,
      data: formattedData,
      year: year
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der monatlichen Umsätze:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der monatlichen Umsätze'
    });
  }
};

// @desc    Statistiken für Kundenverteilung abrufen
// @route   GET /api/stats/customer-distribution
// @access  Private/Admin
exports.getCustomerDistribution = async (req, res) => {
  try {
    // Anzahl der Kunden mit und ohne Aufträge
    const customersWithOrders = await Order.aggregate([
      { $group: { _id: '$customer' } }
    ]);
    
    const totalCustomers = await Customer.countDocuments();
    const activeCustomers = customersWithOrders.length;
    const inactiveCustomers = totalCustomers - activeCustomers;

    // Top 5 Kunden nach Umsatz
    const topCustomers = await Invoice.aggregate([
      { $match: { status: 'bezahlt' } },
      { 
        $group: { 
          _id: '$customer', 
          totalRevenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        } 
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customerData'
        }
      },
      {
        $project: {
          _id: 1,
          name: { $arrayElemAt: ['$customerData.name', 0] },
          totalRevenue: 1,
          count: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalCustomers,
        active: activeCustomers,
        inactive: inactiveCustomers,
        topCustomers
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Kundenverteilungsstatistiken:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der Kundenverteilungsstatistiken'
    });
  }
};

// @desc    Statistiken für Aufträge abrufen
// @route   GET /api/stats/order-statistics
// @access  Private/Admin
exports.getOrderStatistics = async (req, res) => {
  try {
    // Status-Verteilung der Aufträge
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Umwandeln in ein benutzerfreundlicheres Format
    const statusStats = {
      neu: 0,
      'in Bearbeitung': 0,
      abgeschlossen: 0,
      storniert: 0
    };

    ordersByStatus.forEach(item => {
      if (statusStats.hasOwnProperty(item._id)) {
        statusStats[item._id] = item.count;
      }
    });

    // Aufträge der letzten 6 Monate
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentOrders = await Order.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Formatieren der Ergebnisse für das Frontend
    const monthlyData = [];
    
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      const existingData = recentOrders.find(
        item => item._id.year === year && item._id.month === month
      );
      
      monthlyData.unshift({
        month: date.toLocaleString('de-DE', { month: 'short' }),
        year: year,
        count: existingData ? existingData.count : 0,
        totalAmount: existingData ? existingData.totalAmount : 0
      });
    }

    res.status(200).json({
      success: true,
      data: {
        statusStats,
        monthlyData
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Auftragsstatistiken:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der Auftragsstatistiken'
    });
  }
};