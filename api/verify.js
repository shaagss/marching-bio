import 'dotenv/config';
import { Pool } from 'pg';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { serializeCookie } from '../lib/cookies.js';

const JWT_SECRET = process.env.JWT_SECRET;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: true
    }
});

async function getData(token){
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const client = await pool.connect();
    try {
        const qText = `
            SELECT *
            FROM login_tokens
            WHERE token_hash = $1;`;
        const qValues = [hashedToken];

        const data = await client.query(qText, qValues); 
        return data.rows;
    }
    catch (err){
        console.error(err);
        return [];
    }
    finally {
        client.release();
    }
}

function checkData(data) {
    //returns true if valid
    const currentTime = new Date();

    if(data.used || data.expires_at <= currentTime){
        return false;
    }
    else {
        return true;
    }
}

export default async function handler(req, res) {
    const { token } = req.query;

    if(!token){
        console.log('No token');
        return res.status(400).json({ error: 'Token is required' });
    }

    const [ data ] = await getData(token);
    if(!data){
        return res.status(400).json({ error: 'Invalid token' });
    }
    if(checkData(data) === false){
        return res.status(400).json({ error: 'Expired token' });
    }
    
    const email = data.email;
    const sessionToken = jwt.sign(
        {email: email},
        process.env.JWT_SECRET,
        {expiresIn: '30d'}
    );

    await pool.query(
        `UPDATE login_tokens
        SET used = true
        WHERE token_hash = $1`,
        [crypto.createHash('sha256').update(token).digest('hex')]
    );

    res.setHeader('Set-Cookie', serializeCookie('session', sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
    }));

    res.redirect(302, '/edit-bio.html');
}