import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
  }],
  status: {
    type: String,
    enum: ['processing', 'ready', 'failed'],
    default: 'processing'
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  accessType: {
    type: String,
    enum: ['private', 'public'],
    default: 'private'
  },
  allowedEmails: [{
    type: String
  }],
  timeLimit: {
    type: Number, // In minutes
    default: null // null means unlimited
  }
});

export default mongoose.model('Exam', examSchema);
