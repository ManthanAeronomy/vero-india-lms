import 'dotenv/config';
import mongoose from 'mongoose';

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Set MONGODB_URI in server/.env');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB. No seed data configured — add leads and team members via the app.');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
