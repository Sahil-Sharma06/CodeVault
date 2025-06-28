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
app.post('/api/snippets', authMiddleware, async (req,res)=>{
    const {title,description,code,language} = req.body;
    const userId = req.user.id;

    try {
        await pool.query(
            'INSERT INTO code_snippets (title, description, code, language, user_id) VALUES ($1, $2, $3, $4, $5)',
            [title, description, code, language, userId]
        );
        res.status(201).json({message: 'Snippet added successfully'});
    } catch (error) {
        console.error('Error adding snippet:', error);
        res.status(500).json({error: 'Failed to add snippet'});
    }
});

//Route to get all code snippets
app.get('/api/snippets', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query('SELECT * FROM code_snippets WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching snippets:', error);
    res.status(500).json({ error: 'Failed to fetch snippets' });
  }
});

//Delete a code snippet by ID
app.delete('/api/snippets/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await pool.query('DELETE FROM code_snippets WHERE id = $1 AND user_id = $2', [id, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Snippet not found' });
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
      return res.status(404).json({ message: 'Snippet not found' });
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
