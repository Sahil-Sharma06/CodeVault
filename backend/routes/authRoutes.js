import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../db.js';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/authMiddleware.js';
import axios from 'axios';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashedPassword]
    );

    const payload = { user: { id: newUser.rows[0].id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({
      message: 'User Registered Successfully',
      user: newUser.rows[0],
      token,
    });
  } catch (error) {
    console.error('Registration error', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    const user = userRes.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    const payload = {
      user: {
        id: user.id,
      },
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// GitHub OAuth: Redirect to GitHub login
router.get('/github', (req, res) => {
  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=user:email`;
  res.redirect(redirectUri);
});

// GitHub OAuth: Callback after login
router.get('/github/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing code');

  try {
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: 'application/json' } }
    );

    const accessToken = tokenResponse.data.access_token;

    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const { login, id: githubId, email: githubEmail } = userResponse.data;

    let email = githubEmail;

    if (!email) {
      const emailsRes = await axios.get('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const primary = emailsRes.data.find((e) => e.primary && e.verified);
      email = primary?.email;
    }

    const existingUser = await pool.query(
      'SELECT * FROM users WHERE github_id = $1 OR email = $2',
      [githubId, email]
    );

    let user;
    if (existingUser.rows.length > 0) {
      user = existingUser.rows[0];
    } else {
      const newUserRes = await pool.query(
        `INSERT INTO users (username, email, github_id, auth_provider)
         VALUES ($1, $2, $3, 'github') RETURNING *`,
        [login, email, githubId]
      );
      user = newUserRes.rows[0];
    }

    const token = jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.redirect(`http://localhost:5173/auth/callback?token=${token}`);
  } catch (err) {
    console.error('GitHub OAuth error:', err.message);
    res.redirect('http://localhost:5173/auth/callback?error=GitHub login failed');
  }
});

export default router;