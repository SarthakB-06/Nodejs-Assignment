import express from 'express';
import { z } from 'zod';
import db from '../config/db.js';
import { calculateDistance } from '../utils/distance.js';

const router = express.Router();

const schoolSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

router.post('/addSchool', async (req, res) => {
  try {
    const validatedData = schoolSchema.parse(req.body);
    const { name, address, latitude, longitude } = validatedData;

    const [result] = await db.query(
      'INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)',
      [name, address, latitude, longitude]
    );

    res.status(201).json({
      message: 'School added successfully',
      schoolId: result.insertId
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/listSchools', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude and longitude are required parameters' });
    }

    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);
    
    if (isNaN(userLat) || isNaN(userLon)) {
       return res.status(400).json({ error: 'Valid latitude and longitude numbers are required' });
    }

    const [schools] = await db.query('SELECT * FROM schools');

    // Calculate distance and map to a new array
    const schoolsWithDistance = schools.map(school => {
      return {
        ...school,
        distance: calculateDistance(userLat, userLon, school.latitude, school.longitude)
      };
    });

    // Sort by proximity
    schoolsWithDistance.sort((a, b) => a.distance - b.distance);

    res.status(200).json(schoolsWithDistance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
