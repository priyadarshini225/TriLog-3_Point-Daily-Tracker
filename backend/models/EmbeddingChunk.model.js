import mongoose from 'mongoose';

const embeddingChunkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // YYYY-MM
    month: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'],
      index: true,
    },

    // YYYY-MM-DD (best-effort)
    date: {
      type: String,
      default: null,
      index: true,
    },

    sourceType: {
      type: String,
      enum: ['dailyEntry.learned', 'dailyEntry.completed', 'dailyEntry.reviseLater', 'dailyAnswer.text', 'revisionSchedule.responseText'],
      required: true,
      index: true,
    },

    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    text: {
      type: String,
      required: true,
      maxlength: 2500,
    },

    embeddingModel: {
      type: String,
      required: true,
    },

    embedding: {
      type: [Number],
      required: true,
    },

    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

embeddingChunkSchema.index({ userId: 1, month: 1 });
embeddingChunkSchema.index({ userId: 1, month: 1, sourceType: 1, sourceId: 1, date: 1 });

const EmbeddingChunk = mongoose.model('EmbeddingChunk', embeddingChunkSchema);

export default EmbeddingChunk;
