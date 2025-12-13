import DailyQuestion from '../models/DailyQuestion.model.js';
import QuestionTemplate from '../models/QuestionTemplate.model.js';

/**
 * Assign a daily question to a user
 * @param {String} userId - User ID
 * @param {Object} preferences - User preferences
 * @returns {Object} Created daily question
 */
export const assignDailyQuestion = async (userId, preferences = {}) => {
  const today = new Date().toISOString().split('T')[0];

  // Get user's category preferences
  const categories = preferences.categories || [
    'Coding', 'Logic', 'Communication', 'Interview', 'Personal Growth'
  ];

  // Get questions user has answered in the last 30 days to avoid repetition
  const recentQuestions = await DailyQuestion.find({
    userId,
    scheduledDate: { 
      $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
    }
  }).select('questionText');

  const recentQuestionTexts = recentQuestions.map(q => q.questionText);

  // Select category (simple rotation for now)
  const categoryIndex = recentQuestions.length % categories.length;
  const selectedCategory = categories[categoryIndex];

  // Find a question template that hasn't been used recently
  const template = await QuestionTemplate.findOne({
    category: selectedCategory,
    isActive: true,
    questionText: { $nin: recentQuestionTexts }
  }).sort({ usageCount: 1, rating: -1 });

  if (!template) {
    // Fallback to a default question if no template found
    return await DailyQuestion.create({
      userId,
      questionText: 'What was the most important thing you learned today?',
      category: 'Personal Growth',
      source: 'curated',
      difficulty: 'easy',
      scheduledDate: today,
      deliveredAt: new Date()
    });
  }

  // Increment usage count
  template.usageCount += 1;
  await template.save();

  // Create daily question for user
  const question = await DailyQuestion.create({
    userId,
    questionText: template.questionText,
    category: template.category,
    source: template.createdBy === 'system' ? 'curated' : 'template',
    difficulty: template.difficulty,
    scheduledDate: today,
    deliveredAt: new Date(),
    metadata: {
      templateId: template._id,
      tags: template.tags
    }
  });

  return question;
};

/**
 * Seed initial question templates
 * @returns {Number} Count of seeded templates
 */
export const seedQuestionTemplates = async () => {
  const existingCount = await QuestionTemplate.countDocuments();
  
  if (existingCount > 0) {
    console.log('Question templates already seeded');
    return existingCount;
  }

  const templates = [
    // Coding
    {
      questionText: 'What coding problem did you solve today, and what approach did you take?',
      category: 'Coding',
      difficulty: 'medium',
      tags: ['problem-solving', 'algorithms']
    },
    {
      questionText: 'Describe a bug you encountered. How did you debug it?',
      category: 'Coding',
      difficulty: 'medium',
      tags: ['debugging', 'troubleshooting']
    },
    {
      questionText: 'What new programming concept or syntax did you learn today?',
      category: 'Coding',
      difficulty: 'easy',
      tags: ['learning', 'syntax']
    },
    
    // Logic
    {
      questionText: 'Explain a logical problem you faced today. What was your reasoning process?',
      category: 'Logic',
      difficulty: 'medium',
      tags: ['reasoning', 'analysis']
    },
    {
      questionText: 'What decision did you make today? Walk through your thought process.',
      category: 'Logic',
      difficulty: 'easy',
      tags: ['decision-making']
    },
    
    // Communication
    {
      questionText: 'Summarize a technical concept you explained to someone today.',
      category: 'Communication',
      difficulty: 'medium',
      tags: ['explanation', 'teaching']
    },
    {
      questionText: 'What question did you ask today that led to valuable insights?',
      category: 'Communication',
      difficulty: 'easy',
      tags: ['questioning', 'curiosity']
    },
    {
      questionText: 'How did you handle a disagreement or difficult conversation today?',
      category: 'Communication',
      difficulty: 'hard',
      tags: ['conflict-resolution', 'interpersonal']
    },
    
    // Interview
    {
      questionText: 'If asked "Tell me about yourself," how would you answer right now?',
      category: 'Interview',
      difficulty: 'medium',
      tags: ['self-introduction', 'preparation']
    },
    {
      questionText: 'What project are you most proud of? Explain your role and impact.',
      category: 'Interview',
      difficulty: 'medium',
      tags: ['achievements', 'projects']
    },
    {
      questionText: 'Describe a challenging situation you overcame. What did you learn?',
      category: 'Interview',
      difficulty: 'hard',
      tags: ['behavioral', 'growth']
    },
    
    // Personal Growth
    {
      questionText: 'What was the most important thing you learned today?',
      category: 'Personal Growth',
      difficulty: 'easy',
      tags: ['reflection', 'learning']
    },
    {
      questionText: 'What are you grateful for today?',
      category: 'Personal Growth',
      difficulty: 'easy',
      tags: ['gratitude', 'mindfulness']
    },
    {
      questionText: 'What would you do differently if you could repeat today?',
      category: 'Personal Growth',
      difficulty: 'medium',
      tags: ['reflection', 'improvement']
    },
    {
      questionText: 'What skill or habit are you actively working on? What progress did you make?',
      category: 'Personal Growth',
      difficulty: 'medium',
      tags: ['habits', 'skills']
    }
  ];

  const created = await QuestionTemplate.insertMany(templates);
  console.log(`✅ Seeded ${created.length} question templates`);
  
  return created.length;
};
