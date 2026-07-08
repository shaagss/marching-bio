import 'dotenv/config';
import { Pool } from 'pg';
import { Resend } from 'resend';
import crypto from 'crypto';
import fs from 'node:fs/promises';

const EMAIL_TEMPLATE_PATH = new URL('./login-email.html', import.meta.url);

const resend = new Resend(process.env.RESEND_API_KEY);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: true
    }
});

async function storeData(hashedToken, email){
    const client = await pool.connect();
    try {
        console.log('Connection esatblished');
        const expiredTime = new Date();
        expiredTime.setMinutes(expiredTime.getMinutes() + 15);

        const qText = `
            INSERT INTO login_tokens (token_hash, email, expires_at, used)
            VALUES ($1, $2, $3, $4);`;
        const qValues = [hashedToken, email, expiredTime, false];

        await client.query(qText, qValues);

        console.log('Successfully added');
        
    }
    catch (err){
        console.error(err);
        return [];
    }
    finally {
        client.release();
        pool.end();
    }
}

async function sendEmail(email, token){
    try{
        let htmlContent = await fs.readFile(EMAIL_TEMPLATE_PATH, 'utf-8');
        htmlContent = htmlContent
            .replace('{{email}}', email)
            .replace('{{token}}', token);

        const {data, error} = await resend.emails.send({
            from: 'Marching Bio <noreply@verify.marching.bio>',
            to: [email],
            subject: 'Hello World',
            html: htmlContent
        });

        return {data, error};
    }
    catch (err){
        console.error(err);
    }
}

export function requestLogin(email){
    let token = crypto.randomBytes(32).toString('hex');
    let hash = crypto.createHash('sha256');
    hash.update(token);
    let hashedToken = hash.digest('hex');
    console.log("Hashed token: ");
    console.log(hashedToken);

    storeData(hashedToken, email);

    sendEmail(email, token);
}