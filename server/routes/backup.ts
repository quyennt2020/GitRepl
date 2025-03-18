import { Router } from 'express';
import { createBackup, restoreBackup, listBackups } from '../backup';

const router = Router();

// List all backups
router.get('/api/backups', async (req, res) => {
  try {
    const backups = await listBackups();
    res.json(backups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

// Create new backup
router.post('/api/backups', async (req, res) => {
  try {
    const backupPath = await createBackup();
    res.json({ message: 'Backup created successfully', path: backupPath });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// Restore from backup
router.post('/api/backups/restore/:filename', async (req, res) => {
  try {
    const backups = await listBackups();
    const backup = backups.find(b => b.filename === req.params.filename);
    
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    await restoreBackup(backup.path);
    res.json({ message: 'Database restored successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore backup' });
  }
});

export default router;
