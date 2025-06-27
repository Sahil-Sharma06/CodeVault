import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool  from './db.js';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());


//Route to add a new code snippet
app.post('/api/snippets', async (req,res)=>{
    const {title,description,code,language} = req.body;

    try {
        await pool.query(
            'INSERT INTO code_snippets (title, description, code, language) VALUES ($1, $2, $3, $4)',
            [title, description, code, language]
        );
        res.status(201).json({message: 'Snippet added successfully'});
    } catch (error) {
        console.error('Error adding snippet:', error);
        res.status(500).json({error: 'Failed to add snippet'});
    }
});

//Route to get all code snippets
app.get('/api/snippets', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM code_snippets ORDER BY created_at DESC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching snippets:', error);
    res.status(500).json({ error: 'Failed to fetch snippets' });
  }
});

//Delete a code snippet by ID
app.delete('/api/snippets/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM code_snippets WHERE id = $1', [id]);

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
app.put('/api/snippets/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, code, language } = req.body;

  try {
    const result = await pool.query(
      `UPDATE code_snippets
       SET title = $1, description = $2, code = $3, language = $4
       WHERE id = $5`,
      [title, description, code, language, id]
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