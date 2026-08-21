import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    console.error('❌ MONGODB_URI is not defined in environment variables.');
    throw new Error('MONGODB_URI is missing');
  }

  try {
    // Enable strict query filtering
    mongoose.set('strictQuery', true);
    
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log('✅ MongoDB Atlas connected successfully');
  } catch (error) {
    console.error('❌ MongoDB Atlas connection error:', error);
    throw error;
  }
}
