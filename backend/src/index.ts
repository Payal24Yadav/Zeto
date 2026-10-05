import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from './app';
import { BackgroundWorker } from './services/backgroundWorker';
import { seedDatabase } from './seed';
import { Product } from './models/Product';

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zeto_ecommerce';

async function bootstrap() {
  try {
    console.log(`[Database] Connecting to MongoDB at ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI);
    console.log('[Database] MongoDB connected successfully.');

    // Auto-seed if database is empty
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      console.log('[Bootstrap] No products found. Seeding initial data...');
      await seedDatabase();
    }

    // Start background worker for reservation expirations & abandoned carts
    BackgroundWorker.start(30000);

    const server = app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`🚀 ZETO E-Commerce Backend running on port ${PORT}`);
      console.log(`🌐 Base URL: http://localhost:${PORT}`);
      console.log(`📄 API Health: http://localhost:${PORT}/health`);
      console.log(`===============================================`);
    });

    const shutdown = async () => {
      console.log('\n[Server] Gracefully shutting down...');
      BackgroundWorker.stop();
      server.close(async () => {
        await mongoose.connection.close();
        console.log('[Server] Closed connections. Exiting.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('[Bootstrap] Fatal startup error:', error);
    process.exit(1);
  }
}

bootstrap();
