require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const errorHandler = require('./middleware/errorHandler');
const HttpError = require('./utils/httpError');

for (const key of ['MONGODB_URI', 'JWT_SECRET']) {
  if (!process.env[key]) {
    console.error(`Missing environment variable: ${key} (see server/.env.example)`);
    process.exit(1);
  }
}

const app = express();

app.use(helmet());
// CORS is only needed if the React app is hosted on a different origin than the API
app.use(cors({ origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : false }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api', (req, res, next) => next(new HttpError(404, 'Route not found')));

// In production the Express server also serves the built React app,
// so the whole project deploys as a single service.
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
  .catch((err) => {
    console.error('Could not connect to MongoDB:', err.message);
    process.exit(1);
  });
