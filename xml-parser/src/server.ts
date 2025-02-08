import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import reportRoutes from './routes/reportRoutes';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

app.use('/api', reportRoutes);

const MONGO_URI = process.env?.MONGO_URI;
mongoose.connect(MONGO_URI!)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((error) => console.error('MongoDB connection error:', error));

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(500).json({
    message: 'Internal server error',
    error: error instanceof Error ? error.message : 'Unknown error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
