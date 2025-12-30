import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  name: String,
  uploadedAt: { 
    type: Date, 
    default: Date.now // This handles the "datetime" part automatically
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' // Tells Mongoose which collection to look in
  },

  deletedAt:{
    type:Date,
    default:null
  },

},{collection:"documents"});

export default mongoose.model('Document', documentSchema);