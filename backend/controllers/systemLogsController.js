// backend/controllers/systemLogsController.js
const SystemLog = require('../models/SystemLog');
const { validationResult } = require('express-validator');

// @desc    Systemlogs abrufen
// @route   GET /api/logs
// @access  Private/Admin
exports.getSystemLogs = async (req, res) => {
  try {
    // Ermögliche Filterung nach Level, Datum und Benutzer
    const filter = {};
    
    if (req.query.level) {
      filter.level = req.query.level;
    }
    
    if (req.query.user) {
      filter.user = req.query.user;
    }
    
    // Datumsbereiche
    if (req.query.startDate && req.query.endDate) {
      filter.timestamp = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.timestamp = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.timestamp = { $lte: new Date(req.query.endDate) };
    }

    // Paginierung
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    const skip = (page - 1) * limit;

    // Gesamtanzahl für Paginierung
    const total = await SystemLog.countDocuments(filter);
    
    // Logs mit Sortierung nach Zeitstempel absteigend (neueste zuerst)
    const logs = await SystemLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Systemlogs:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der Systemlogs'
    });
  }
};

// @desc    Systemlog erstellen
// @route   POST /api/logs
// @access  Private
exports.createSystemLog = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // User ID aus dem authentifizierten Benutzer oder vom Request Body
    const userId = req.user ? req.user.id : (req.body.userId || 'System');
    const userName = req.user ? req.user.name : (req.body.userName || 'System');

    // Log-Eintrag erstellen
    const log = await SystemLog.create({
      level: req.body.level || 'info',
      message: req.body.message,
      userId,
      userName,
      details: req.body.details || {},
      source: req.body.source || 'api',
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Systemlogs:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Erstellen des Systemlogs'
    });
  }
};

// @desc    Systemlogs nach Typ abrufen (für Widgets/Dashboard)
// @route   GET /api/logs/stats
// @access  Private/Admin
exports.getSystemLogStats = async (req, res) => {
  try {
    // Statistik der letzten 30 Tage
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Anzahl der Logs pro Level
    const logsByLevel = await SystemLog.aggregate([
      { $match: { timestamp: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$level', count: { $sum: 1 } } }
    ]);

    // Umwandeln in ein benutzerfreundlicheres Format
    const levelStats = {
      info: 0,
      warning: 0,
      error: 0
    };

    logsByLevel.forEach(item => {
      if (levelStats.hasOwnProperty(item._id)) {
        levelStats[item._id] = item.count;
      }
    });

    // Gruppierung nach Tagen für ein Liniendiagramm
    const logsByDay = await SystemLog.aggregate([
      { $match: { timestamp: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
            level: '$level'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // In ein Format umwandeln, das für Frontend-Diagramme geeignet ist
    const chartData = [];
    const uniqueDays = new Set();

    logsByDay.forEach(item => {
      const date = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}-${item._id.day.toString().padStart(2, '0')}`;
      uniqueDays.add(date);
    });

    const sortedDays = Array.from(uniqueDays).sort();
    
    sortedDays.forEach(date => {
      const dayData = {
        date,
        info: 0,
        warning: 0,
        error: 0
      };
      
      logsByDay.forEach(item => {
        const logDate = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}-${item._id.day.toString().padStart(2, '0')}`;
        
        if (logDate === date && dayData.hasOwnProperty(item._id.level)) {
          dayData[item._id.level] = item.count;
        }
      });
      
      chartData.push(dayData);
    });

    res.status(200).json({
      success: true,
      data: {
        levelStats,
        chartData
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Systemlog-Statistiken:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der Systemlog-Statistiken'
    });
  }
};

// @desc    Alle Systemlogs exportieren
// @route   GET /api/logs/export
// @access  Private/Admin
exports.exportSystemLogs = async (req, res) => {
  try {
    // Filter-Optionen wie bei getSystemLogs
    const filter = {};
    
    if (req.query.level) {
      filter.level = req.query.level;
    }
    
    if (req.query.user) {
      filter.user = req.query.user;
    }
    
    if (req.query.startDate && req.query.endDate) {
      filter.timestamp = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.timestamp = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.timestamp = { $lte: new Date(req.query.endDate) };
    }

    // Alle passenden Logs abrufen (ohne Limit)
    const logs = await SystemLog.find(filter)
      .sort({ timestamp: -1 })
      .lean();

    // Formatieren für CSV-Export
    let csvContent = 'Zeitstempel,Level,Meldung,Benutzer,Quelle,IP-Adresse\n';
    
    logs.forEach(log => {
      // Zeitstempel formatieren
      const date = new Date(log.timestamp);
      const formattedDate = date.toISOString();
      
      // CSV-Zeile erstellen mit Escaping für Kommas in Texten
      csvContent += [
        formattedDate,
        log.level,
        `"${log.message.replace(/"/g, '""')}"`, // Doppelte Anführungszeichen escapen
        log.userName || 'System',
        log.source || 'api',
        log.ipAddress || ''
      ].join(',') + '\n';
    });

    // Aktuelles Datum für den Dateinamen
    const currentDate = new Date().toISOString().split('T')[0];
    
    // HTTP-Header für den Download setzen
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=systemlogs_${currentDate}.csv`);
    
    // CSV-Daten senden
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Fehler beim Exportieren der Systemlogs:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Exportieren der Systemlogs'
    });
  }
};