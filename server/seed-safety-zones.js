/**
 * Seed SafetyZones into MongoDB Atlas
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const SafetyZone = require('./models/SafetyZone');

const seedData = [
  {
    name: 'Delhi CP Central Corridor',
    center: { latitude: 28.6139, longitude: 77.2090 },
    radiusMeters: 3000,
    riskLevel: 'high',
    active: true
  },
  {
    name: 'Noida Expressway Caution Area',
    center: { latitude: 28.5500, longitude: 77.3200 },
    radiusMeters: 2500,
    riskLevel: 'medium',
    active: true
  },
  {
    name: 'Gurgaon Cyber City Monitored Area',
    center: { latitude: 28.4950, longitude: 77.0895 },
    radiusMeters: 2000,
    riskLevel: 'low',
    active: true
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas for SafetyZone seeding...');

    // Upsert seed safety zones
    for (const zone of seedData) {
      await SafetyZone.updateOne(
        { name: zone.name },
        { $set: zone },
        { upsert: true }
      );
      console.log(`Seeded SafetyZone: ${zone.name} (${zone.riskLevel})`);
    }

    console.log('SafetyZone seeding complete!');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

seedDB();
