import 'dotenv/config';
import { Pool } from 'pg';
import { put, del } from '@vercel/blob';
import { getSessionEmail } from '../lib/auth.js';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: true
    }
});

export default async function handler(req, res) {
    const email = getSessionEmail(req);
    if (!email) {
        return res.status(401).json({ error: 'Not logged in' });
    }

    const fileBuffer = await bufferFromRequest(req);

    const oldPhotoUrl = await getCurrentPhotoUrl(email);
    const timestamp = Date.now();
    
    const blob = await put(`profile-photos/${email}-${timestamp}.jpg`, fileBuffer, {
        access: 'public',
        allowOverwrite: true,
    });

    try {
        await updatePhotoRow(blob.url, email);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Photo uploaded but failed to save' });
    }

    if (oldPhotoUrl) {
        try {
            await del(oldPhotoUrl);
        }
        catch (err) {
            console.error('Failed to delete old profile picture:', err);
        }
    }

    res.status(200).json({ url: blob.url });
}

function bufferFromRequest(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

async function updatePhotoRow(photoUrl, email){
    const client = await pool.connect();

    try{
        const qText = `
                    UPDATE profiles
                    SET photo_url = $1
                    WHERE email = $2
                    `;
        const qValues = [photoUrl, email];
        await client.query(qText, qValues);  
    }
    catch (err){
        console.error(err);
    }
    finally {
        client.release();
    }
}

async function getCurrentPhotoUrl(email) {
    const client = await pool.connect();

    try {
        const qText = `
            SELECT photo_url
            FROM profiles
            WHERE email = $1
        `;
        const qValues = [email];

        const result = await client.query(qText, qValues);

        return result.rows[0]?.photo_url || null;
    }
    finally {
        client.release();
    }
}