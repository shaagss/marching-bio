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

    if(req.query.which === 'expr'){
        if ( req.method === 'GET' ) {
            getExpr(email, req, res);
        }
        else if ( req.method === 'POST' ) {
            addExpr(email, req, res);
        }
        else if ( req.method === 'DELETE' ) {
            delExpr(email, req, res);
        }
        else {
            res.status(405).json({ error: 'Method not allowed' });
        }
    }
    else if(req.query.which === 'clips'){
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
    else if(req.query.which === 'details'){
        if ( req.method === 'GET' ) {
            getDetails(email, req, res);
        }
        else if ( req.method === 'POST' ) {
            addDetails(email, req, res);
        }
        else if ( req.method === 'DELETE' ) {
            delDetails(email, req, res);
        }
        else {
            res.status(405).json({ error: 'Method not allowed' });
        }
    }
    else{
        res.status(405).json({ error: 'Invalid parameter' });
    }

}

// Expr
async function getExpr(email, req, res){
    const client = await pool.connect();
    const expr = await getExprFromDB(email, client);

    res.status(200).json(expr);
}

async function addExpr(email, req, res){
    const { group, year } = req.body;
    
    await checkAddExprFormat(email, group, year);
    res.status(200).json({ success: true });
}    

async function delExpr(email, req, res){
    const { group, year } = req.body;
    
    await checkDelExprFormat(email, group, year);
    res.status(200).json({ success: true });
}

// Clips
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

// Details
async function getDetails(email, req, res){
    const client = await pool.connect();
    const details = await getDetailsFromDB(email, client);

    res.status(200).json(details);
}

async function addDetails(email, req, res){
    const { year, circuit, details } = req.body;
    // takes details, replaces whatever is already there
    
    await checkAddDetailsFormat(email, year, circuit, details);
    res.status(200).json({ success: true });
}

async function delDetails(email, req, res){
    const { year, group } = req.body;
    
    await checkDelDetailsFormat(email, year, group);
    res.status(200).json({ success: true });
}



// ===EXPR===

// ---POST method---
async function checkAddExprFormat(email, group, year){
    const client = await pool.connect();
    try {
        const userExpr = await getExprFromDB(email, client);
        if(Object.hasOwn(userExpr, year) === false){
            userExpr[year] = {}
        }
        const circuit = await getGroupCircuit(group, client)
        userExpr[year][circuit] = group;
        await updateExprRow(email, userExpr, client);
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

async function updateExprRow(email, expr, client){
    try{
        const qText = `
                    UPDATE profiles
                    SET expr = $1
                    WHERE email = $2
                    `;
        const qValues = [expr, email];
        await client.query(qText, qValues);  
    }
    catch (err){
        console.error(err);
    }
}

// ---DELETE method---
async function checkDelExprFormat(email, group, year){
    const client = await pool.connect();
    try {
        const userExpr = await getExprFromDB(email, client);
        const circuit = await getGroupCircuit(group, client);

        if(Object.hasOwn(userExpr, year) === false ||
            Object.hasOwn(userExpr[year], circuit) === false){
            throw new Error('That group/year entry does not exist for this user');
        }

        delete userExpr[year][circuit];
        if (Object.keys(userExpr[year]).length === 0) {
            delete userExpr[year]
        }
        await updateExprRow(email, userExpr, client);

        // remove any clips tied to it
        const userClips = await getClipsFromDB(email, client);
        if (Object.hasOwn(userClips, year) && Object.hasOwn(userClips[year], circuit)) {
            delete userClips[year][circuit];
            if (Object.keys(userClips[year]).length === 0) {
                delete userClips[year];
            }
            await updateClipsRow(email, userClips, client);
        }

        //remove details
        const userDetails = await getDetailsFromDB(email, client);
        if (Object.hasOwn(userDetails, year) && Object.hasOwn(userDetails[year], circuit)) {
            delete userDetails[year][circuit];
            if (Object.keys(userDetails[year]).length === 0) {
                delete userDetails[year];
            }
            await updateDetailsRow(email, userDetails, client);
        }

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
async function getExprFromDB(email, client){    
    const qText = `
                SELECT expr
                FROM profiles
                WHERE email = $1
                `;
    const qValues = [email];
    const data = await client.query(qText, qValues);  
    return data.rows[0].expr;
}

// ===CLIPS===

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
        await updateClipsRow(email, userClips, client);
    }
    catch (err){
        console.error(err);
        return [];
    }
    finally {
        client.release();
    }
}

async function updateClipsRow(email, clips, client){
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

        await updateClipsRow(email, userClips, client);
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

// ===DETAILS===

// ---POST method---
async function checkAddDetailsFormat(email, year, circuit, newDetails){
    const client = await pool.connect();
    try {
        const userDetails = await getDetailsFromDB(email, client);
        if(Object.hasOwn(userDetails, year) === false){
            userDetails[year] = {}
        }

        if(Object.hasOwn(userDetails[year], circuit) === false){
            userDetails[year][circuit] = {};
        }

        //check if empty
        if(Object.keys(newDetails).length === 0){
            delete userDetails[year][circuit];
            if(Object.keys(userDetails[year]).length === 0){
                delete userDetails[year];
            }
            await updateDetailsRow(email, userDetails, client);
            return;
        }

        const keyNames = ['showName', 'correctedClass', 'placement', 'competition', 'score'];
        for(const key of keyNames){
            if( Object.hasOwn(newDetails, key) ){
                userDetails[year][circuit][key] = newDetails[key];
            }
            else {
                if( Object.hasOwn(userDetails[year][circuit], key) ){
                    delete userDetails[year][circuit][key];
                }
            }
        }

        await updateDetailsRow(email, userDetails, client);
    }
    catch (err){
        console.error(err);
        return [];
    }
    finally {
        client.release();
    }
}

async function updateDetailsRow(email, details, client){
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

// ---DELETE method---
async function checkDelDetailsFormat(email, year, group){
    const client = await pool.connect();
    try {
        const userDetails = await getDetailsFromDB(email, client);
        const circuit = await getGroupCircuit(group, client);

        if(Object.hasOwn(userDetails, year) === false ||
            Object.hasOwn(userDetails[year], circuit) === false){
            throw new Error('That group/year for detail entry does not exist for this user');
        }

        delete userDetails[year][circuit];
        if(Object.keys(userDetails[year]).length === 0){
            delete userDetails[year];
        }

        await updateDetailsRow(email, userDetails, client);
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

