import express from 'express';
import prisma from '../config/database';

const router = express.Router();

// GET /api/whatsapp-settings - Get WhatsApp settings
router.get('/', async (req, res) => {
  try {
    let settings = await prisma.whatsAppSettings.findFirst();

    if (!settings) {
      return res.json({
        data: {
          appKey: '',
          authKey: '',
        },
      });
    }

    res.json({
      data: {
        appKey: settings.appKey || '',
        authKey: settings.authKey || '',
      },
    });
  } catch (error: any) {
    console.error('Error fetching WhatsApp settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/whatsapp-settings - Update WhatsApp settings
router.put('/', async (req, res) => {
  try {
    const {
      appKey,
      authKey,
    } = req.body;

    let settings = await prisma.whatsAppSettings.findFirst();

    const data: any = {};
    if (appKey !== undefined) data.appKey = appKey || null;
    if (authKey !== undefined) data.authKey = authKey || null;

    if (settings) {
      settings = await prisma.whatsAppSettings.update({
        where: { id: settings.id },
        data,
      });
    } else {
      settings = await prisma.whatsAppSettings.create({
        data,
      });
    }

    res.json({
      data: {
        appKey: settings.appKey || '',
        authKey: settings.authKey || '',
      },
    });
  } catch (error: any) {
    console.error('Error updating WhatsApp settings:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

