import 'dotenv/config';
import { Pool } from 'pg';
import { Resend } from 'resend';
import fs from 'node:fs/promises';
import { generateToken, hashToken } from '../lib/tokens.js';

const STUPID_KEY = process.env.STUPID_KEY;
const EMAIL_TEMPLATE_PATH = new URL('./login-email.html', import.meta.url);

const resend = new Resend(process.env.RESEND_API_KEY);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: true
    }
});

async function storeNewToken(hashedToken, email, name){
    const client = await pool.connect();
    try {
        const expiredTime = new Date();
        expiredTime.setMinutes(expiredTime.getMinutes() + 15);

        const qText = `
            INSERT INTO login_tokens (token_hash, email, name, expires_at, used)
            VALUES ($1, $2, $3, $4, $5);`;
        const qValues = [hashedToken, email, name, expiredTime, false];
        await client.query(qText, qValues);        
    }
    catch (err){
        console.error(err);
    }
    finally {
        client.release();
    }
}

async function sendEmail(email, token){
    try{
        let htmlContent = await fs.readFile(EMAIL_TEMPLATE_PATH, 'utf-8');
        htmlContent = htmlContent
            .replaceAll('{{email}}', email)
            .replaceAll('{{token}}', token);

        const {data, error} = await resend.emails.send({
            from: 'marching.bio <noreply@verify.marching.bio>',
            to: [email],
            subject: 'Login to marching.bio',
            html: htmlContent
        });
    }
    catch (err){
        console.error(err);
    }
}

export default async function handler(req, res){
    const { email, name, key } = req.body;
    if(key !== STUPID_KEY){
        res.status(423).json({ success: false });
        return;
    }
    
    let token = generateToken()
    let hashedToken = hashToken(token);

    await storeNewToken(hashedToken, email, name);

    await sendEmail(email, token);

    res.status(200).json({ success: true });
}