import express from 'express';
import userRoutes from './src/routes/userRoutes.js';
import connectDB from './db.js';

const app = express();
app.use(express.json());
await connectDB();
// Apply routes
app.use('/users', userRoutes);

app.listen(3000, () => console.log('Server running on port 3000'));