import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
});

export async function getAllGroups() {
    const client = await pool.connect();
    try {
        const qText = `SELECT *
                    FROM groups;`;
        const data = await client.query(qText);
        return data.rows;
    }
    catch (err) {
        console.error(err);
        return [];
    }
    finally {
        client.release();
    }
}

export async function getProfileByCode(code) {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT *
            FROM profiles
            WHERE code = $1`,
            [code]
        );
        return result.rows[0] || null;
    } 
    finally {
        client.release();
    }
}

export async function checkExistingProfile(email) {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT *
            FROM profiles
            WHERE email = $1`,
            [email]
        );
        return result.rows[0] || null;
    } 
    finally {
        client.release();
    }
}