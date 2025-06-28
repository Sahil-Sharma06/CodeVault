import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../db.js';
import jwt from 'jsonwebtoken'
import { authMiddleware } from '../middleware/authMiddleware.js';
const router = express.Router();

router.post('/register', async (req,res)=>{
    const {username,email,password} = req.body;

    try {
        const existingUser = await pool.query(
            'SELECT * FROM users where email = $1',
            [email]
        );

        if(existingUser.rows.length > 0){
            return res.status(400).json({message: 'User already exist'})
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password,salt);

        const newUser = await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, email, hashedPassword]
        );

        res.status(201).json({
            message: 'User Registered Successfully',
            user: newUser.rows[0],
        });
    } catch (error) {
        console.error('Registration error', error.message);
        res.status(500).json({message:'Server Error'});
    }
});

router.post('/login', async (req,res)=>{
    const {email, password} = req.body;

    try {
        const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if(userRes.rows.length === 0){
            return res.status(400).json({message:'Invalid Credentials'});
        }

        const user = userRes.rows[0];

        const isMatch = await bcrypt.compare(password,user.password);
        if(!isMatch){
            return res.status(400).json({message:'Invalid Credentials'});
        }

        const payload = {
            user:{
                id:user.id,
            }
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn:'1h'});
        res.json({token});
    } catch (error) {
        console.error(error.message);
        res.status(500).json({message:'Server Error'});
    }
});

export default router;