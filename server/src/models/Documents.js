import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  path: { type: String, required: true }, // Local path or cloud URI
  size: { type: Number },
  uploadedAt: { type: Date, default: Date.now },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

export default mongoose.model('Document', documentSchema);