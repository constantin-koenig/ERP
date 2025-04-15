const mongoose = require('mongoose');
const config = require('./config');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log(`MongoDB verbunden: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Fehler: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;