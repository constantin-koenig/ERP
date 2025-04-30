// backend/controllers/systemLogsController.js (Mit Hinzufügung einer Bereinigungsfunktion)
const SystemLog = require('../models/SystemLog');
const { validationResult } = require('express-validator');
const { logger } = require('../middleware/logger');
const fs = require('fs');
const path = require('path');

// @desc    Systemlogs abrufen (nur Business-Events)
// @route   GET /api/logs
// @access  Private/Admin
exports.getSystemLogs = async (req, res) => {
    try {
      // Erweiterte Filteroptionen
      const filter = {};
      
      // Default-Filter: Nur Business-Events anzeigen (keine API-Anfragen)
      if (!req.query.source) {
        // Verwende einen Filter, der API-Anfragen ausschließt
        // GEÄNDERT: system_startup und system_maintenance hinzugefügt
        filter.source = { 
          $in: [
            'business_event', 
            'user_action', 
            'data_operation', 
            'admin_action',
            'system_startup',    // System-Start-Ereignisse 
            'system_maintenance' // Wartungsereignisse
          ] 
        };
      } else {
        filter.source = req.query.source;
      }
      
      // Basis-Filter: Level, Benutzer, Datumsbereich
      if (req.query.level) {
        filter.level = req.query.level;
      }
      
      if (req.query.user) {
        filter.userId = req.query.user;
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
      
      // Erweiterte Filter
      if (req.query.module) {
        filter.module = req.query.module;
      }
      
      if (req.query.action) {
        filter.action = req.query.action;
      }
      
      if (req.query.entity) {
        filter.entity = req.query.entity;
      }
      
      // Volltextsuche in der Nachricht
      if (req.query.search) {
        filter.message = { $regex: req.query.search, $options: 'i' };
      }
  
      // Paginierung
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 100;
      const skip = (page - 1) * limit;
  
      // Gesamtanzahl für Paginierung
      const total = await SystemLog.countDocuments(filter);
      
      // DEBUG: Log der verwendeten Filter
      console.log('Log-Abfrage mit Filter:', JSON.stringify(filter, null, 2));
      
      // Logs mit Sortierung nach Zeitstempel absteigend (neueste zuerst)
      const logs = await SystemLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      
      // Logs in ein für das Frontend optimiertes Format konvertieren
      const formattedLogs = logs.map(log => SystemLog.generateReadableLog(log));
  
      // Log-Anfrage protokollieren (nur im File)
      logger.debug(`Systemlogs abgerufen: ${total} Einträge gefunden`, {
        filter,
        page,
        limit,
        userId: req.user.id
      });
  
      res.status(200).json({
        success: true,
        count: logs.length,
        data: formattedLogs,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit)
        },
        filters: {
          available: {
            modules: await getDistinctValues('module'),
            actions: await getDistinctValues('action'),
            entities: await getDistinctValues('entity'),
            sources: await getDistinctValues('source'),
            levels: ['info', 'warning', 'error', 'debug']
          }
        }
      });
    } catch (error) {
      logger.error('Fehler beim Abrufen der Systemlogs:', error);
      
      res.status(500).json({
        success: false,
        message: 'Serverfehler beim Abrufen der Systemlogs'
      });
    }
  };

// Hilfsfunktion zum Abrufen eindeutiger Werte für Filter
async function getDistinctValues(field) {
  try {
    const values = await SystemLog.distinct(field);
    return values.filter(v => v && v !== 'null' && v !== 'undefined');
  } catch (error) {
    logger.error(`Fehler beim Abrufen eindeutiger Werte für ${field}:`, error);
    return [];
  }
}

// @desc    Details eines spezifischen Logs anzeigen
// @route   GET /api/logs/:id
// @access  Private/Admin
exports.getLogDetails = async (req, res) => {
  try {
    const log = await SystemLog.findById(req.params.id).lean();
    
    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Log-Eintrag nicht gefunden'
      });
    }
    
    // Formatierte Version für leichte Lesbarkeit
    const formattedLog = {
      ...log,
      formattedDate: new Date(log.timestamp).toLocaleString('de-DE'),
      readableMessage: SystemLog.generateReadableLog(log).message
    };
    
    logger.debug(`Log-Details abgerufen: ID ${req.params.id}`, {
      logId: req.params.id,
      userId: req.user.id
    });

    res.status(200).json({
      success: true,
      data: formattedLog
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Log-Details: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der Log-Details'
    });
  }
};

// @desc    Systemlog erstellen (manuell, z.B. für Frontend-Logs)
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

    // Erweiterte Felder 
    const module = req.body.module || 'general';
    const action = req.body.action || 'general';
    const entity = req.body.entity || null;
    const entityId = req.body.entityId || null;
    const changes = req.body.changes || {};
    
    // Quelle auf business_event setzen, falls nicht explizit angegeben
    const source = req.body.source || 'business_event';

    // Log-Eintrag erstellen
    const log = await SystemLog.create({
      level: req.body.level || 'info',
      message: req.body.message,
      userId,
      userName,
      module,
      action,
      entity,
      entityId,
      changes,
      details: req.body.details || {},
      source,
      ipAddress: req.ip
    });

    // In Winston loggen
    logger[req.body.level || 'info'](`Manuell erstellt: ${req.body.message} [${source}]`, {
      userId,
      userName,
      details: req.body.details || {},
      source
    });

    res.status(201).json({
      success: true,
      data: log
    });
  } catch (error) {
    logger.error('Fehler beim Erstellen des Systemlogs:', error);
    
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
    // Zeitraum konfigurierbar machen
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Filter für Business-Events setzen (keine API-Anfragen)
    const baseFilter = {
      timestamp: { $gte: startDate },
      // Nur Business-Events berücksichtigen
      source: { $in: ['business_event', 'user_action', 'data_operation', 'admin_action'] }
    };

    // Anzahl der Logs pro Level
    const logsByLevel = await SystemLog.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$level', count: { $sum: 1 } } }
    ]);

    // Umwandeln in ein benutzerfreundlicheres Format
    const levelStats = {
      info: 0,
      warning: 0,
      error: 0,
      debug: 0
    };

    logsByLevel.forEach(item => {
      if (levelStats.hasOwnProperty(item._id)) {
        levelStats[item._id] = item.count;
      }
    });

    // Gruppierung nach Tagen für ein Liniendiagramm
    const logsByDay = await SystemLog.aggregate([
      { $match: baseFilter },
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
        error: 0,
        debug: 0
      };
      
      logsByDay.forEach(item => {
        const logDate = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}-${item._id.day.toString().padStart(2, '0')}`;
        
        if (logDate === date && dayData.hasOwnProperty(item._id.level)) {
          dayData[item._id.level] = item.count;
        }
      });
      
      chartData.push(dayData);
    });
    
    // Top-Module und -Aktionen
    const [topModules, topActions, topErrors] = await Promise.all([
      // Top 5 Module
      SystemLog.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$module', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      
      // Top 5 Aktionen
      SystemLog.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      
      // Top 5 Fehlerquellen
      SystemLog.aggregate([
        { $match: { ...baseFilter, level: 'error' } },
        { $group: { _id: '$message', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    logger.debug(`Systemlog-Statistiken abgerufen für ${days} Tage`, {
      userId: req.user.id,
      totalLogs: Object.values(levelStats).reduce((sum, val) => sum + val, 0)
    });

    res.status(200).json({
      success: true,
      data: {
        levelStats,
        chartData,
        topModules,
        topActions,
        topErrors,
        timeRange: {
          days,
          startDate,
          endDate: new Date()
        }
      }
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Systemlog-Statistiken:', error);
    
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
    
    // Default-Filter: Nur Business-Events exportieren
    if (!req.query.source) {
      // Verwende einen Filter, der API-Anfragen ausschließt
      filter.source = { $in: ['business_event', 'user_action', 'data_operation', 'admin_action'] };
    } else {
      filter.source = req.query.source;
    }
    
    // Basis-Filter anwenden
    if (req.query.level) {
      filter.level = req.query.level;
    }
    
    if (req.query.user) {
      filter.userId = req.query.user;
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
    
    // Erweiterte Filter
    if (req.query.module) {
      filter.module = req.query.module;
    }
    
    if (req.query.action) {
      filter.action = req.query.action;
    }
    
    if (req.query.entity) {
      filter.entity = req.query.entity;
    }

    // Bestimmen des Exportformats (CSV oder JSON)
    const format = req.query.format || 'csv';

    // Alle passenden Logs abrufen (ohne Limit)
    const logs = await SystemLog.find(filter)
      .sort({ timestamp: -1 })
      .lean();
    
    // Aktionsdatum für den Dateinamen
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Exportieren je nach angeforderten Format
    if (format.toLowerCase() === 'json') {
      // JSON-Export
      const jsonData = {
        exportDate: new Date(),
        filter,
        count: logs.length,
        logs: logs.map(log => ({
          ...log,
          formattedDate: new Date(log.timestamp).toLocaleString('de-DE')
        }))
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=systemlogs_${currentDate}.json`);
      return res.status(200).json(jsonData);
    } else {
      // Standard: CSV-Export
      // Volle Header mit allen relevanten Feldern
      let csvContent = 'Zeitstempel,Level,Meldung,Benutzer,Modul,Aktion,Entität,Entitäts-ID,Quelle,IP-Adresse\n';
      
      logs.forEach(log => {
        // Zeitstempel formatieren
        const date = new Date(log.timestamp);
        const formattedDate = date.toISOString();
        
        // CSV-Zeile erstellen mit Escaping für Kommas in Texten
        csvContent += [
          formattedDate,
          log.level,
          `"${(log.message || '').replace(/"/g, '""')}"`, // Doppelte Anführungszeichen escapen
          `"${(log.userName || 'System').replace(/"/g, '""')}"`,
          log.module || 'general',
          log.action || '',
          log.entity || '',
          log.entityId || '',
          log.source || 'business_event',
          log.ipAddress || ''
        ].join(',') + '\n';
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=systemlogs_${currentDate}.csv`);
      return res.status(200).send(csvContent);
    }
  } catch (error) {
    logger.error('Fehler beim Exportieren der Systemlogs:', error);
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Exportieren der Systemlogs'
    });
  }
};

// @desc    Logdateien auflisten
// @route   GET /api/logs/files
// @access  Private/Admin
exports.getLogFiles = async (req, res) => {
  try {
    const logDirectory = path.join(__dirname, '..', 'logs');
    
    // Prüfen, ob das Verzeichnis existiert
    if (!fs.existsSync(logDirectory)) {
      return res.status(404).json({
        success: false,
        message: 'Log-Verzeichnis nicht gefunden'
      });
    }
    
    // Dateien im Verzeichnis auflisten
    const files = fs.readdirSync(logDirectory)
      .filter(file => file.endsWith('.log'))
      .map(file => {
        const stats = fs.statSync(path.join(logDirectory, file));
        return {
          name: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => b.modified - a.modified); // Neueste zuerst
    
    logger.debug(`${files.length} Logdateien aufgelistet`, {
      userId: req.user.id
    });

    res.status(200).json({
      success: true,
      count: files.length,
      data: files
    });
  } catch (error) {
    logger.error('Fehler beim Auflisten der Logdateien:', error);
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Auflisten der Logdateien'
    });
  }
};

// @desc    Logdatei-Inhalt abrufen
// @route   GET /api/logs/files/:filename
// @access  Private/Admin
exports.getLogFileContent = async (req, res) => {
  try {
    const { filename } = req.params;
    const logDirectory = path.join(__dirname, '..', 'logs');
    const filePath = path.join(logDirectory, filename);
    
    // Sicherheitscheck: Keine Directory-Traversal zulassen
    if (!filename || filename.includes('..') || !filename.endsWith('.log')) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiger Dateiname'
      });
    }
    
    // Prüfen, ob die Datei existiert
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Logdatei nicht gefunden'
      });
    }
    
    // Optional: Nur die letzten n Zeilen lesen
    const lines = parseInt(req.query.lines) || 1000;
    
    // Datei lesen (bei sehr großen Dateien: nur die letzten n Zeilen)
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const allLines = fileContent.split('\n');
    const lastLines = allLines.slice(-lines).join('\n');
    
    logger.debug(`Logdatei ${filename} abgerufen`, {
      userId: req.user.id,
      lines: lines
    });

    res.status(200).json({
      success: true,
      data: {
        filename,
        totalLines: allLines.length,
        displayedLines: Math.min(lines, allLines.length),
        content: lastLines
      }
    });
  } catch (error) {
    logger.error(`Fehler beim Lesen der Logdatei ${req.params.filename}:`, error);
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Lesen der Logdatei'
    });
  }
};

// @desc    Systemlogs löschen (mit Filteroptionen)
// @route   DELETE /api/logs
// @access  Private/Admin
exports.deleteSystemLogs = async (req, res) => {
  try {
    // Filter-Optionen wie bei getSystemLogs
    const filter = {};
    
    // Datumsbereiche - MINDESTENS ein Datumsfilter ist erforderlich
    if (req.body.startDate && req.body.endDate) {
      filter.timestamp = {
        $gte: new Date(req.body.startDate),
        $lte: new Date(req.body.endDate)
      };
    } else if (req.body.startDate) {
      filter.timestamp = { $gte: new Date(req.body.startDate) };
    } else if (req.body.endDate) {
      filter.timestamp = { $lte: new Date(req.body.endDate) };
    } else {
      // Sicherheitscheck: Verhindert versehentliches Löschen ALLER Logs
      return res.status(400).json({
        success: false,
        message: 'Ein Datumsbereich ist für das Löschen erforderlich'
      });
    }
    
    // Optionale weitere Filter
    if (req.body.level) {
      filter.level = req.body.level;
    }
    
    if (req.body.user) {
      filter.userId = req.body.user;
    }
    
    if (req.body.module) {
      filter.module = req.body.module;
    }
    
    if (req.body.source) {
      filter.source = req.body.source;
    }
    
    // Zähle die zu löschenden Einträge
    const count = await SystemLog.countDocuments(filter);
    
    if (count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Keine Logs gefunden, die den Kriterien entsprechen'
      });
    }
    
    // Löschbestätigung in Anfrage erforderlich
    if (!req.body.confirm || req.body.confirm !== 'true') {
      return res.status(400).json({
        success: false,
        message: `Zum Löschen von ${count} Log-Einträgen bitte Bestätigung senden`,
        count
      });
    }
    
    // Logs löschen
    const result = await SystemLog.deleteMany(filter);
    
    // Löschaktion selbst loggen
    logger.warn(`${result.deletedCount} Systemlogs gelöscht`, {
      userId: req.user.id,
      filter,
      count: result.deletedCount
    });
    
    // Erstelle auch einen Log-Eintrag
    await SystemLog.create({
      level: 'warning',
      message: `${result.deletedCount} Systemlogs wurden gelöscht`,
      userId: req.user.id,
      userName: req.user.name,
      module: 'system',
      action: 'delete',
      entity: 'logs',
      details: {
        filter,
        deletedCount: result.deletedCount
      },
      source: 'admin_action',
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    logger.error('Fehler beim Löschen der Systemlogs:', error);
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Löschen der Systemlogs'
    });
  }
};

