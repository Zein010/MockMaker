import express from 'express';
import userRoutes from './src/routes/userRoutes.js';
import examRoutes from './src/routes/examRoutes.js';
import connectDB from './db.js';

import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());
await connectDB();
// Apply routes
app.use('/users', userRoutes);
app.use('/exams', examRoutes);

app.listen(3000, () => console.log('Server running on port 3000'));