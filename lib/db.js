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