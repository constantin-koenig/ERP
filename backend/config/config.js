require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/erp_system',
  JWT_SECRET: process.env.JWT_SECRET || 'mysecretkey',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '30d'
};