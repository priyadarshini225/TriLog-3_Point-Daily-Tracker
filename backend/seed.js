import dotenv from 'dotenv';
import { connectDB } from './config/database.js';
import { seedQuestionTemplates } from './services/question.service.js';

dotenv.config();

const seed = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    await connectDB();
    
    const count = await seedQuestionTemplates();
    
    console.log(`✅ Seeding complete! ${count} templates in database.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();
