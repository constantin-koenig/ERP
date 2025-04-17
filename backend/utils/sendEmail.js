// backend/utils/sendEmail.js
const nodemailer = require('nodemailer');
const config = require('../config/config');

/**
 * Sendet eine E-Mail
 * @param {Object} options - E-Mail-Optionen
 * @param {string} options.email - Empfänger-E-Mail
 * @param {string} options.subject - Betreff
 * @param {string} options.message - Nachricht (Text)
 * @param {string} options.html - HTML-Version der Nachricht (optional)
 */
const sendEmail = async (options) => {
  // In der Entwicklungsumgebung können wir Ethereal verwenden (Fake-SMTP-Service)
  let transporter;
  
  if (process.env.NODE_ENV === 'development') {
    // Ethereal-Konto erstellen (für Testzwecke)
    const testAccount = await nodemailer.createTestAccount();
    
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  } else {
    // Produktionskonfiguration
    transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE === 'true',
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASSWORD
      }
    });
  }

  // E-Mail-Optionen
  const mailOptions = {
    from: `${config.FROM_NAME} <${config.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.message
  };

  // Wenn HTML vorhanden ist, füge es hinzu
  if (options.html) {
    mailOptions.html = options.html;
  }

  // E-Mail senden
  const info = await transporter.sendMail(mailOptions);

  // Log-URL für Entwicklungsumgebung
  if (process.env.NODE_ENV === 'development') {
    console.log('Vorschau-URL:', nodemailer.getTestMessageUrl(info));
  }

  return info;
};

module.exports = sendEmail;