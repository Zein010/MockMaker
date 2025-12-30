import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  active:Boolean,
  password:String,
  
},{collection:"users"});

export default mongoose.model('User', userSchema);