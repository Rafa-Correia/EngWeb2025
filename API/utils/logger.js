const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, '..', 'logs.json');

function logAction(user, action, itemId) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    user: user,
    action: action,
    itemId: itemId
  };

  let logs = [];
  if (fs.existsSync(LOG_PATH)) {
    try {
      const raw = fs.readFileSync(LOG_PATH);
      logs = JSON.parse(raw);
    } catch (err) {
      console.error('Erro ao ler logs:', err);
      logs = [];
    }
  }

  logs.push(logEntry);

  try {
    fs.writeFileSync(LOG_PATH, JSON.stringify(logs, null, 2));
  } catch (err) {
    console.error('Erro ao escrever logs:', err);
  }
}

function getLogs() {
  if (!fs.existsSync(LOG_PATH)) return [];
  try {
    const raw = fs.readFileSync(LOG_PATH);
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler logs:', err);
    return [];
  }
}

module.exports = { logAction, getLogs };
