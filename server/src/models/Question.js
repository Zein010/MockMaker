import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
  },
  type: {
    type: String,
    enum: ['Radio', 'MultiChoice', 'Text'],
    required: true,
  },
  // Store the variations. A variation includes the text (paraphrased) and options.
  variations: [{
    text: { type: String, required: true },
    options: [String], // Array of strings for options
    correctAnswers: [String], // Array of correct answers (for grading)
  }],
  isBonus: {
    type: Boolean,
    default: false
  }
});

export default mongoose.model('Question', questionSchema);
