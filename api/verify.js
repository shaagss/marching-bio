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

async function getTokenData(token){
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
    if(data === undefined){
        return false;
    }

    const currentTime = new Date();
    if(data.used || data.expires_at <= currentTime){
        return false;
    }
    else {
        return true;
    }
}

async function maybeCreateProfile(email, name, client){
    const existing = await client.query(
        `SELECT code
        FROM profiles
        WHERE email = $1`,
        [email]
    );

    if (existing.rows.length > 0) {
        return existing.rows[0].code; 
    }

    //Here they dont have a profile
    const countResult = await client.query(`
        SELECT COUNT(*)
        FROM profiles`);
    const count = parseInt(countResult.rows[0].count);
    const byteLength = count < 65536 ? 2 : 3; // 4 digits, then 6
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const code = crypto.randomBytes(byteLength).toString('hex');

        try {
            await client.query(
                `INSERT INTO profiles (code, email, name)
                VALUES ($1, $2, $3)`,
                [code, email, name]
            );
            return code; 
        }
        catch (err) {
            if (err.code === '23505') {//already exists error code
                continue;
            }
            throw err; 
        }
    }

    throw new Error('Failed to generate a profile code after 10 attempts');
}

export default async function handler(req, res) {
    const { token } = req.query;
    
    if(!token){
        // return res.status(400).json({ error: 'Token is required' });
        return res.redirect(302, '/');
    }

    const [ tokenData ] = await getTokenData(token);
    if(!tokenData){
        // return res.status(400).json({ error: 'Invalid token' });
        return res.redirect(302, '/');
    }
    if(checkData(tokenData) === false){
        // return res.status(400).json({ error: 'Expired token' });
        return res.redirect(302, '/editor');
    }
    
    const email = tokenData.email;
    const name = tokenData.name;
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

    await maybeCreateProfile(email, name, pool);

    res.setHeader('Set-Cookie', serializeCookie('session', sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
    }));

    res.redirect(302, '/editor');
}