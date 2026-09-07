import 'dotenv/config';
import { Pool } from 'pg';
import { getSessionEmail } from '../lib/auth.js';


const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: true
    }
});

// ---POST method---
async function checkAddDetailsFormat(email, newDetails){
    const client = await pool.connect();
    try {
        const userDetails = await getDetailsFromDB(email, client);
        if(Object.hasOwn(userDetails, 'instruments') === false){
            userDetails['instruments'] = [];
        }

        //check if empty
        if(newDetails.length === 0){
            delete userDetails.instruments;
            await updateRow(email, userDetails, client);
            return;
        }

        userDetails.instruments = newDetails;
        await updateRow(email, userDetails, client);
    }
    catch (err){
        console.error(err);
        return [];
    }
    finally {
        client.release();
    }
}

async function updateRow(email, details, client){
    try{
        const qText = `
                    UPDATE profiles
                    SET details = $1
                    WHERE email = $2
                    `;
        const qValues = [details, email];
        await client.query(qText, qValues);  
    }
    catch (err){
        console.error(err);
    }
}

// ---GET method---
async function getDetailsFromDB(email, client){    
    const qText = `
                SELECT details
                FROM profiles
                WHERE email = $1
                `;
    const qValues = [email];
    const data = await client.query(qText, qValues);  
    return data.rows[0].details;
}

// ---Starting point---
export default async function handler(req, res){
    const email = getSessionEmail(req);
    if ( req.method === 'POST' ) {
        addDetails(email, req, res);
    }
    else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}

async function addDetails(email, req, res){
    const { instDetails } = req.body;
    // takes details, replaces whatever is already there
    
    await checkAddDetailsFormat(email, instDetails);
    res.status(200).json({ success: true });
}
