import 'dotenv/config';
import { Pool } from 'pg';
import { getSessionEmail } from '../lib/auth.js';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: true
    }
});

// ---Starting point---
export default async function handler(req, res){
    const email = getSessionEmail(req);

    if ( req.method === 'GET' ) {
        getAll(email, req, res);
    }
    else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}

async function getAll(email, req, res){
    const client = await pool.connect();
    const {expr, clips, details} = await getAllFromDB(email, client);

    res.status(200).json({expr, clips, details});
}

// ---GET method---
async function getAllFromDB(email, client){    
    const qText = `
                SELECT expr, clips, details
                FROM profiles
                WHERE email = $1
                `;
    const qValues = [email];
    const data = await client.query(qText, qValues);  
    return {
        expr: data.rows[0].expr, 
        clips: data.rows[0].clips, 
        details: data.rows[0].details
    };
}
