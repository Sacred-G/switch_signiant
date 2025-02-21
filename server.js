import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from 'dotenv';
import { webhookHandler } from './api/webhook.js';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Make environment variables available to the API routes
app.use((req, res, next) => {
  req.env = {
    VITE_SIGNIANT_API_URL: process.env.VITE_SIGNIANT_API_URL,
    VITE_SIGNIANT_CLIENT_ID: process.env.VITE_SIGNIANT_CLIENT_ID,
    VITE_SIGNIANT_CLIENT_SECRET: process.env.VITE_SIGNIANT_CLIENT_SECRET,
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY
  };
  next();
});

// API Routes
app.post('/api/webhook', webhookHandler);

// Start server
app.listen(port, () => {
  console.log(`API Server running on port ${port}`);
});
