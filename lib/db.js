import 'dotenv/config';
import { Pool } from 'pg';

const JWT_SECRET = process.env.JWT_SECRET;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: true
    }
});

export async function getGroups(circuit, theClass, instrument = null){
    const client = await pool.connect();
    try {
        let qText = `SELECT *
                    FROM groups
                    WHERE circuit = $1
                    AND class = $2`;
        const qValues = [circuit, theClass];

        if (instrument) {
            qText += ` AND instrument = $3`;
            qValues.push(instrument);
        }

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
