import 'dotenv/config';
import { Pool } from 'pg';
import { getSessionEmail } from '../lib/auth.js';

const STUPID_KEY = process.env.STUPID_KEY;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: true
    }
});

// ---POST method---
async function checkClipsFormat(email, group, year, videoData){
    const client = await pool.connect();
    try {
        const userClips = await getClipsFromDB(email, client);
        if(Object.hasOwn(userClips, year) === false){
            userClips[year] = {}
        }

        const circuit = await getGroupCircuit(group, client)
        if(Object.hasOwn(userClips[year], circuit) === false){
            userClips[year][circuit] = [];
        }

        userClips[year][circuit].push(videoData);
        await updateRow(email, userClips, client);
    }
    catch (err){
        console.error(err);
        return [];
    }
    finally {
        client.release();
    }
}

async function getGroupCircuit(groupId, client){
    try{
        const qText = `
                    SELECT circuit
                    FROM groups
                    WHERE id = $1
                    `;
        const qValues = [groupId];
        const data = await client.query(qText, qValues);  
        const group = data.rows[0];
        return group.circuit;
    }
    catch (err){
        console.error(err);
        return null;
    }
}

async function updateRow(email, clips, client){
    try{
        const qText = `
                    UPDATE profiles
                    SET clips = $1
                    WHERE email = $2
                    `;
        const qValues = [clips, email];
        await client.query(qText, qValues);  
    }
    catch (err){
        console.error(err);
    }
}

// ---GET method---
async function getClipsFromDB(email, client){    
    const qText = `
                SELECT clips
                FROM profiles
                WHERE email = $1
                `;
    const qValues = [email];
    const data = await client.query(qText, qValues);  
    return data.rows[0].expr;
}

// ---Starting point---
export default async function handler(req, res){
    if ( req.method === 'GET' ) {
        getClips(req, res);
    }
    else if ( req.method === 'POST' ) {
        addClips(req, res);
    }
    else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}

async function addClips(req, res){
    const email = getSessionEmail(req);
    const { group, year, videoData, key } = req.body;

    if(key !== STUPID_KEY){
        res.status(423).json({ success: false });
        return;
    }
    
    await checkClipsFormat(email, group, year, videoData);
    res.status(200).json({ success: true });
}

async function getClips(req, res){
    const email = getSessionEmail(req);
    const client = await pool.connect();
    const clips = await getClipsFromDB(email, client);

    res.status(200).json(expr);
}
