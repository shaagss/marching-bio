import 'dotenv/config';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { makeCookie } from '../lib/cookies.js';
import { hashToken } from '../lib/tokens.js';

const JWT_SECRET = process.env.JWT_SECRET;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: true
    }
});

// ---
async function getTokenData(token){
    const hashedToken = hashToken(token);

    const client = await pool.connect();
    try {
        const data = await client.query(`
            SELECT *
            FROM login_tokens
            WHERE token_hash = $1;`,
            [hashedToken]); 
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
    if(data === undefined){
        return false;
    }

    const currentTime = new Date();
    return !(data.used || data.expires_at <= currentTime);
}

async function checkProfileExists(email, name, pool){
    const existing = await client.query(
        `SELECT code
        FROM profiles
        WHERE email = $1`,
        [email]
    );
    
    if (existing.rows.length > 0) {
        return existing.rows[0].code; 
    }
    else {
        await createProfile(email, name, pool);
    }
}

async function createProfile(email, name, client){
    // Check how many profiles exist, for length of code
    const countResult = await client.query(`
        SELECT COUNT(*)
        FROM profiles`);
    const count = parseInt(countResult.rows[0].count);
    const byteLength = count < 65536 ? 2 : 3; // 4 digits, then 6
    
    // Try 10 times to make a code
    for (let attempt = 0; attempt < 10; ++attempt) {
        const code = crypto.randomBytes(byteLength).toString('hex');

        try {
            await client.query(
                `INSERT INTO profiles (code, email, name)
                VALUES ($1, $2, $3)`,
                [code, email, name]
            );
        }
        catch (err) {
            if (err.code === '23505') {// Already exists error code
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
    if( !(checkData(tokenData)) ){
        // return res.status(400).json({ error: 'Expired token' });
        return res.redirect(302, '/editor');
    }
    
    const { email, name } = tokenData;
    const sessionToken = jwt.sign(
        {email: email},
        process.env.JWT_SECRET,
        {expiresIn: '30d'}
    );

    await pool.query(
        `UPDATE login_tokens
        SET used = true
        WHERE token_hash = $1`,
        [hashToken(token)]
    );

    await checkProfileExists(email, name, pool);

    res.setHeader('Set-Cookie', serializeCookie('session', sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
    }));

    res.redirect(302, '/editor');
}