import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool  from './db.js';
import authRoutes from './routes/authRoutes.js'
import { authMiddleware } from './middleware/authMiddleware.js';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/users', authRoutes)

//Route to add a new code snippet
app.post('/api/snippets', authMiddleware, async (req, res) => {
  const { title, description, code, language, tags } = req.body;
  const userId = req.user.id;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Step 1: Insert the snippet
    const snippetResult = await client.query(
      `INSERT INTO code_snippets (title, description, code, language, user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [title, description, code, language, userId]
    );
    const snippetId = snippetResult.rows[0].id;

    // Step 2: Handle tags if provided
    if (Array.isArray(tags) && tags.length > 0) {
      for (const tag of tags) {
        // Insert tag if it doesn't exist
        const tagResult = await client.query(
          `INSERT INTO tags (name)
           VALUES ($1)
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [tag.trim().toLowerCase()]
        );

        const tagId = tagResult.rows[0].id;

        // Link tag to snippet
        await client.query(
          `INSERT INTO snippet_tags (snippet_id, tag_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [snippetId, tagId]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({ message: 'Snippet with tags added successfully' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding snippet with tags:', error);
    res.status(500).json({ error: 'Failed to add snippet' });

  } finally {
    client.release();
  }
});

//Route to get all code snippets
app.get('/api/snippets', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    // Step 1: Get all snippets for the user
    const snippetsResult = await pool.query(
      'SELECT * FROM code_snippets WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    const snippets = snippetsResult.rows;

    // Step 2: For each snippet, get its tags
    for (let snippet of snippets) {
      const tagResult = await pool.query(
        `SELECT t.name
         FROM tags t
         JOIN snippet_tags st ON st.tag_id = t.id
         WHERE st.snippet_id = $1`,
        [snippet.id]
      );

      snippet.tags = tagResult.rows.map(tag => tag.name);
    }

    res.status(200).json(snippets);
  } catch (error) {
    console.error('Error fetching snippets with tags:', error);
    res.status(500).json({ error: 'Failed to fetch snippets' });
  }
});

//Delete a code snippet by ID
app.delete('/api/snippets/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

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

//Update a snippet by ID
app.put('/api/snippets/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title, description, code, language } = req.body;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `UPDATE code_snippets
       SET title = $1, description = $2, code = $3, language = $4
       WHERE id = $5 AND user_id = $6`,
      [title, description, code, language, id, userId]
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


app.listen(process.env.PORT || 8000, () => {
    console.log(`Server is running on port ${process.env.PORT || 5000}`);
});
