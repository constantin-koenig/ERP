const app = require('./app');
const config = require('./config/config');
const connectDB = require('./config/db');

// Datenbankverbindung
connectDB();

const server = app.listen(config.PORT, () => {
  console.log(`Server läuft auf Port ${config.PORT}`);
});

// Behandlung von unerwarteten Fehlern
process.on('unhandledRejection', (err) => {
  console.log('Unhandled Rejection! Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});