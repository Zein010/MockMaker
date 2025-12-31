import mongoose from 'mongoose';

const aiLogSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: false // Might be null if no doc involved? Actually config says docId is used.
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  prompt: {
    type: String, // Store detailed instructions or summary
    required: false
  },
  response: {
    type: mongoose.Schema.Types.Mixed, // Store the full JSON response
    required: true
  },
  apiRequestDate: {
    type: Date,
    required: true
  },
  responseDate: {
    type: Date,
    required: true
  },
  durationMs: {
    type: Number,
    required: true
  }
});

export default mongoose.model('AILog', aiLogSchema);
