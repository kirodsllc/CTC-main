import express from 'express';
import prisma from '../config/database';

const router = express.Router();

// GET /api/backups - Get all backups
router.get('/', async (req, res) => {
  try {
    const backups = await prisma.backup.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: backups });
  } catch (error: any) {
    console.error('Error fetching backups:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/backups/:id - Get single backup
router.get('/:id', async (req, res) => {
  try {
    const backup = await prisma.backup.findUnique({
      where: { id: req.params.id },
    });

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    res.json({ data: backup });
  } catch (error: any) {
    console.error('Error fetching backup:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/backups - Create new backup
router.post('/', async (req, res) => {
  try {
    const {
      name,
      type,
      tables,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Backup name is required' });
    }

    const tablesStr = type === 'full' ? 'All Tables' : (tables || []).join(', ');

    const backup = await prisma.backup.create({
      data: {
        name,
        tables: tablesStr,
        type: type || 'full',
        size: '0 MB',
        status: 'in_progress',
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        createdBy: 'Admin User',
      },
    });

    // Simulate backup process with progress updates (in production, this would be async)
    // Update progress every 300ms for ~3-4 seconds total
    let progress = 0;
    const finalSize = Math.floor(Math.random() * 100 + 50); // Random size between 50-150 MB
    const progressInterval = setInterval(async () => {
      progress += 8; // Increment by 8% each time
      const currentSizeMB = Math.floor((progress / 100) * finalSize);
      
      try {
        if (progress < 100) {
          await prisma.backup.update({
            where: { id: backup.id },
            data: {
              size: `${currentSizeMB} MB`,
            },
          });
        } else {
          clearInterval(progressInterval);
          // Final update to completed
          await prisma.backup.update({
            where: { id: backup.id },
            data: {
              status: 'completed',
              size: `${finalSize} MB`,
            },
          });
          console.log(`✅ Backup ${backup.name} completed successfully`);
        }
      } catch (error) {
        console.error('Error updating backup progress:', error);
        clearInterval(progressInterval);
      }
    }, 300);

    res.status(201).json({ data: backup });
  } catch (error: any) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/backups/:id/restore - Restore from backup
router.post('/:id/restore', async (req, res) => {
  try {
    const backup = await prisma.backup.findUnique({
      where: { id: req.params.id },
    });

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    if (backup.status !== 'completed') {
      return res.status(400).json({ error: 'Backup is not completed' });
    }

    // In production, implement actual restore logic here
    res.json({ message: `Restoring from backup: ${backup.name}` });
  } catch (error: any) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/backups/:id - Delete backup
router.delete('/:id', async (req, res) => {
  try {
    await prisma.backup.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Backup deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting backup:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Backup not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /api/backups/schedules - Get backup schedules
router.get('/schedules', async (req, res) => {
  try {
    const schedules = await prisma.backupSchedule.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Parse tables JSON
    const formattedSchedules = schedules.map(schedule => {
      let tables: string[] = [];
      try {
        tables = JSON.parse(schedule.tables || '[]');
      } catch {
        tables = [];
      }

      return {
        ...schedule,
        tables,
      };
    });

    res.json({ data: formattedSchedules });
  } catch (error: any) {
    console.error('Error fetching backup schedules:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

