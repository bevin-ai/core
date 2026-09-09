import dotenv from 'dotenv';
// Load environment variables before any other module imports that rely on process.env
dotenv.config();

import app from './src/app';
import { connectDB } from './src/config/db';

const port: number = parseInt(process.env.PORT || '5000', 10);

async function startServer() {
  try {
    console.log("Hello")
    // Connect to MongoDB Atlas
    await connectDB();

    app.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
      console.log(`🔑 GitHub OAuth endpoint: http://localhost:${port}/auth/github`);
      console.log(`📡 GitHub Callback URL: ${process.env.GITHUB_CALLBACK_URL || `http://localhost:${port}/auth/github/callback`}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
