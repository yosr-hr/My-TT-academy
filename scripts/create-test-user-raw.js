import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Please set MONGODB_URI in environment');
  process.exit(1);
}

const create = async () => {
  await mongoose.connect(MONGODB_URI, { dbName: 'ges_form_bd' });
  const db = mongoose.connection.db;
  const email = 'test@example.com';
  const users = db.collection('users');
  const existing = await users.findOne({ email });
  if (existing) {
    console.log('User already exists:', existing.email);
    await mongoose.disconnect();
    process.exit(0);
  }

  const hashed = await bcrypt.hash('password123', 10);
  const now = new Date();
  const doc = {
    N_CIN: 'T123456',
    matricule: 'M123456',
    nom: 'Test',
    prenom: 'User',
    email,
    password: hashed,
    role: 'admin',
    createdAt: now,
    updatedAt: now,
  };
  const res = await users.insertOne(doc);
  console.log('Inserted user id:', res.insertedId.toString());
  await mongoose.disconnect();
  process.exit(0);
};

create().catch((e) => { console.error(e); process.exit(1); });
