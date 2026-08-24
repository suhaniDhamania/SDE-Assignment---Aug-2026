require('dotenv').config();
const express = require('express');
const cors = require('cors');
const PersistentPriorityQueue = require('./module');

const app = express();
const PORT = process.env.PORT || 5001;

const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
};

const pq = new PersistentPriorityQueue(dbConfig);

app.use(cors());
app.use(express.json());

async function startServer() {
  try {
    console.log('Connecting to PostgreSQL database...');
    await pq.connect();
    console.log('Database connected.');

    app.get('/api/queue/items', async (req, res) => {
      try {
        const items = await pq.getAll();
        res.json({ success: true, data: items });
      } catch (err) {
        console.error('Error fetching queue items:', err.message);
        res.status(500).json({ success: false, error: 'Failed to retrieve queue items.' });
      }
    });

    app.post('/api/queue/insert', async (req, res) => {
      const { element, priority } = req.body;
      if (!element || priority === undefined) {
        return res.status(400).json({ success: false, error: 'Both element and priority are required.' });
      }
      try {
        const result = await pq.insert(element, priority);
        res.status(201).json({ success: true, data: result });
      } catch (err) {
        console.error('Error inserting element:', err.message);
        const status = err.message.includes('already exists') ? 400 : 500;
        res.status(status).json({ success: false, error: err.message });
      }
    });

    app.post('/api/queue/extract-min', async (req, res) => {
      try {
        const result = await pq.extract_min();
        res.json({ success: true, data: result });
      } catch (err) {
        console.error('Error extracting min:', err.message);
        res.status(500).json({ success: false, error: 'Failed to extract minimum element.' });
      }
    });

    app.post('/api/queue/extract-max', async (req, res) => {
      try {
        const result = await pq.extract_max();
        res.json({ success: true, data: result });
      } catch (err) {
        console.error('Error extracting max:', err.message);
        res.status(500).json({ success: false, error: 'Failed to extract maximum element.' });
      }
    });

    app.get('/api/queue/peek', async (req, res) => {
      try {
        const result = await pq.peek();
        res.json({ success: true, data: result });
      } catch (err) {
        console.error('Error peeking queue:', err.message);
        res.status(500).json({ success: false, error: 'Failed to peek queue.' });
      }
    });

    app.put('/api/queue/update', async (req, res) => {
      const { element, priority } = req.body;
      if (!element || priority === undefined) {
        return res.status(400).json({ success: false, error: 'Both element and priority are required.' });
      }
      try {
        const result = await pq.update(element, priority);
        res.json({ success: true, data: result });
      } catch (err) {
        console.error('Error updating element priority:', err.message);
        const status = err.message.includes('not found') ? 404 : 500;
        res.status(status).json({ success: false, error: err.message });
      }
    });

    app.delete('/api/queue/delete/:element', async (req, res) => {
      const { element } = req.params;
      if (!element) {
        return res.status(400).json({ success: false, error: 'Element is required.' });
      }
      try {
        const result = await pq.delete(element);
        res.json({ success: true, data: result });
      } catch (err) {
        console.error('Error deleting element:', err.message);
        const status = err.message.includes('not found') ? 404 : 500;
        res.status(status).json({ success: false, error: err.message });
      }
    });

    app.get('/api/queue/is-empty', async (req, res) => {
      try {
        const empty = await pq.is_empty();
        res.json({ success: true, data: { is_empty: empty } });
      } catch (err) {
        console.error('Error checking is_empty:', err.message);
        res.status(500).json({ success: false, error: 'Failed to verify if queue is empty.' });
      }
    });

    app.post('/api/queue/clear', async (req, res) => {
      try {
        await pq.clear();
        res.json({ success: true, message: 'Queue successfully cleared.' });
      } catch (err) {
        console.error('Error clearing queue:', err.message);
        res.status(500).json({ success: false, error: 'Failed to clear queue.' });
      }
    });

    app.listen(PORT, () => {
      console.log(`Priority Queue API Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Server failed to start:', err.message);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('\nClosing PostgreSQL connection pool...');
  await pq.close();
  console.log('Database connections closed. Exiting server.');
  process.exit(0);
});

startServer();
