/**
 * Generiert eine zufällige ID
 * @param {Number} length - Länge der ID
 * @returns {String} - Generierte ID
 */
exports.generateRandomId = (length = 10) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    
    return result;
  };
  
  /**
   * Formatiert Datum
   * @param {Date} date - Das zu formatierende Datum
   * @returns {String} - Formatiertes Datum
   */
  exports.formatDate = (date) => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    
    return `${day}.${month}.${year}`;
  };
  
  /**
   * Formatiert Währung
   * @param {Number} amount - Der zu formatierende Betrag
   * @returns {String} - Formatierter Betrag
   */
  exports.formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };