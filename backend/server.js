import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db.js';
import authRoutes from './routes/authRoutes.js';
import { authMiddleware } from './middleware/authMiddleware.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Auth routes
app.use('/api/users', authRoutes);

// Create a new code snippet with optional tags
app.post('/api/snippets', authMiddleware, async (req, res) => {
  const { title, description, code, language, tags } = req.body;
  const userId = req.user?.id;
  
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  if (!title || !code) {
    return res.status(400).json({ error: 'title and code are required' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const snippetResult = await client.query(
      `INSERT INTO code_snippets (title, description, code, language, user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [title, description ?? null, code, language ?? null, userId]
    );
    
    const snippetId = snippetResult.rows[0].id;
    
    if (Array.isArray(tags) && tags.length > 0) {
      for (const rawTag of tags) {
        const name = String(rawTag || '').trim().toLowerCase();
        if (!name) continue;
        
        const tagResult = await client.query(
          `INSERT INTO tags (name)
           VALUES ($1)
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [name]
        );
        
        const tagId = tagResult.rows[0].id;
        
        await client.query(
          `INSERT INTO snippet_tags (snippet_id, tag_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [snippetId, tagId]
        );
      }
    }
    
    await client.query('COMMIT');
    res.status(201).json({ message: 'Snippet with tags added successfully', id: snippetId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding snippet with tags:', error);
    res.status(500).json({ error: 'Failed to add snippet' });
  } finally {
    client.release();
  }
});

// Get all code snippets for the logged-in user, including tags
app.get('/api/snippets', authMiddleware, async (req, res) => {
  const userId = req.user?.id;
  
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const snippetsResult = await pool.query(
      'SELECT * FROM code_snippets WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    const snippets = snippetsResult.rows;
    
    for (const snippet of snippets) {
      const tagResult = await pool.query(
        `SELECT t.name
         FROM tags t
         JOIN snippet_tags st ON st.tag_id = t.id
         WHERE st.snippet_id = $1`,
        [snippet.id]
      );
      snippet.tags = tagResult.rows.map((r) => r.name);
    }
    
    res.status(200).json(snippets);
  } catch (error) {
    console.error('Error fetching snippets with tags:', error);
    res.status(500).json({ error: 'Failed to fetch snippets' });
  }
});

// Delete a code snippet by ID
app.delete('/api/snippets/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const result = await pool.query(
      'DELETE FROM code_snippets WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Snippet not found or unauthorized' });
    }
    
    res.json({ message: 'Snippet deleted successfully' });
  } catch (error) {
    console.error('Failed to delete snippet:', error.message);
    res.status(500).json({ error: 'Failed to delete snippet' });
  }
});

// Update a snippet by ID (does not change tags here)
app.put('/api/snippets/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title, description, code, language } = req.body;
  const userId = req.user?.id;
  
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  if (!title || !code) {
    return res.status(400).json({ error: 'title and code are required' });
  }
  
  try {
    const result = await pool.query(
      `UPDATE code_snippets SET title = $1, description = $2, code = $3, language = $4 
       WHERE id = $5 AND user_id = $6`,
      [title, description ?? null, code, language ?? null, id, userId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Snippet not found or unauthorized' });
    }
    
    res.json({ message: 'Snippet updated successfully' });
  } catch (error) {
    console.error('Failed to update snippet:', error.message);
    res.status(500).json({ error: 'Failed to update snippet' });
  }
});

// Add tags to a snippet (secured + transactional + ownership check)
app.post('/api/snippets/:id/tags', authMiddleware, async (req, res) => {
  const { tags } = req.body; // array of tag names
  const snippetId = req.params.id;
  const userId = req.user?.id;
  
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  if (!Array.isArray(tags) || tags.length === 0) {
    return res.status(400).json({ error: 'tags must be a non-empty array of strings' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Ensure snippet exists and belongs to user
    const sn = await client.query(
      'SELECT id FROM code_snippets WHERE id = $1 AND user_id = $2',
      [snippetId, userId]
    );
    
    if (sn.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Snippet not found or unauthorized' });
    }
    
    for (const rawTag of tags) {
      const name = String(rawTag || '').trim().toLowerCase();
      if (!name) continue;
      
      const tagResult = await client.query(
        `INSERT INTO tags (name)
         VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [name]
      );
      
      const tagId = tagResult.rows[0].id;
      
      await client.query(
        `INSERT INTO snippet_tags (snippet_id, tag_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [snippetId, tagId]
      );
    }
    
    await client.query('COMMIT');
    
    const tagsResult = await pool.query(
      `SELECT t.name
       FROM tags t
       JOIN snippet_tags st ON st.tag_id = t.id
       WHERE st.snippet_id = $1
       ORDER BY t.name`,
      [snippetId]
    );
    
    res.status(200).json({ 
      message: 'Tags added successfully', 
      tags: tagsResult.rows.map(r => r.name) 
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to add tags:', err);
    res.status(500).json({ error: 'Failed to add tags' });
  } finally {
    client.release();
  }
});

// Optional: DB health check
app.get('/health/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as now');
    res.json({ ok: true, now: result.rows[0].now });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = Number(process.env.PORT) || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});