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
async function checkAddClipFormat(email, year, group, videoId, startTime, endTime){
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
        const videoData = {
            'videoId': videoId,
            'start': startTime,
            'end': endTime
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
// ---DELETE method---
async function checkDelClipFormat(email, year, group, videoId, startTime, endTime){
    const client = await pool.connect();
    try {
        const userClips = await getClipsFromDB(email, client);
        const circuit = await getGroupCircuit(group, client);

        if(Object.hasOwn(userClips, year) === false ||
            Object.hasOwn(userClips[year], circuit) === false){
            throw new Error('That group/year for clip entry does not exist for this user');
        }

        const index = userClips[year][circuit].findIndex(
            clip => clip.videoId === videoId &&
            Number(clip.start) === startTime &&
            Number(clip.end) === endTime
        );

        if (index === -1) {
            throw new Error('That clip entry does not exist for this user');
        }

        userClips[year][circuit].splice(index, 1);

        if (userClips[year][circuit].length === 0) {
            delete userClips[year][circuit];

            if(Object.keys(userClips[year]).length === 0){
                delete userClips[year];
            }
        }

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


// ---GET method---
async function getClipsFromDB(email, client){    
    const qText = `
                SELECT clips
                FROM profiles
                WHERE email = $1
                `;
    const qValues = [email];
    const data = await client.query(qText, qValues);  
    return data.rows[0].clips;
}

// ---Starting point---
export default async function handler(req, res){
    const email = getSessionEmail(req);
    if ( req.method === 'GET' ) {
        getClips(email, req, res);
    }
    else if ( req.method === 'POST' ) {
        addClip(email, req, res);
    }
    else if ( req.method === 'DELETE' ) {
        delClip(email, req, res);
    }
    else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}

async function addClip(email, req, res){
    const { year, group, videoId, startTime, endTime } = req.body;
    
    await checkAddClipFormat(email, year, group, videoId, startTime, endTime);
    res.status(200).json({ success: true });
}

async function delClip(email, req, res){
    const { year, group, videoId, startTime, endTime } = req.body;
    
    await checkDelClipFormat(email, year, group, videoId, startTime, endTime);
    res.status(200).json({ success: true });
}

async function getClips(email, req, res){
    const client = await pool.connect();
    const clips = await getClipsFromDB(email, client);

    res.status(200).json(clips);
}
