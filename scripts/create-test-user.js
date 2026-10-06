import connectDB from '../lib/mongodb';
import User from '../models/User';

const create = async () => {
  try {
    await connectDB();
    const email = 'test@example.com';
    const existing = await User.findOne({ email });
    if (existing) {
      console.log('User already exists:', existing.email);
      process.exit(0);
    }

    const user = new User({
      N_CIN: 'T123456',
      matricule: 'M123456',
      nom: 'Test',
      prenom: 'User',
      email,
      password: 'password123',
      role: 'admin',
    });

    await user.save();
    console.log('Created user:', user.email, 'role:', user.role);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

create();
