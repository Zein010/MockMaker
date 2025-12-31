import mongoose from 'mongoose';
const resultSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
  },
  score: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed'],
    default: 'in-progress'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  totalQuestions: {
      type: Number,
      required: true
  },
  bonusScore: {
      type: Number,
      default: 0
  },
  totalBonusQuestions: {
      type: Number,
      default: 0
  },
  answers: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    selectedOptions: [String],
    isCorrect: Boolean,
    gradingStatus: { 
        type: String, 
        enum: ['pending', 'ai-graded', 'manual-graded'], 
        default: 'pending' 
    },
    aiFeedback: String
  }],
  completedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Result', resultSchema);
