var express = require('express');
var router = express.Router();
var Auth = require('../auth/auth');
var logger = require('../utils/logger');

// GET /admin/stats
router.get('/stats', Auth.validate, (req, res) => {
  const logs = logger.getLogs();

  const stats = {
    totalViews: 0,
    totalDownloads: 0,
    viewsPorItem: {},
    downloadsPorItem: {}
  };

  logs.forEach(log => {
    if (log.action === 'view') {
      stats.totalViews++;
      stats.viewsPorItem[log.itemId] = (stats.viewsPorItem[log.itemId] || 0) + 1;
    }
    if (log.action === 'download') {
      stats.totalDownloads++;
      stats.downloadsPorItem[log.itemId] = (stats.downloadsPorItem[log.itemId] || 0) + 1;
    }
  });

  res.status(200).json(stats);
});

module.exports = router;
