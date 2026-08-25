import 'dotenv/config';
import { Pool } from 'pg';
import { getSessionEmail } from '../lib/auth.js';
import { getClipsFromDB, updateClipsRow } from '../lib/clips.js';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: true
    }
});

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
        await updateRow(email, userExpr, client);
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

async function updateRow(email, expr, client){
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
        await updateRow(email, userExpr, client);

        // remove any clips tied to it
        const userClips = await getClipsFromDB(email, client);
        if (Object.hasOwn(userClips, year) && Object.hasOwn(userClips[year], circuit)) {
            delete userClips[year][circuit];
            if (Object.keys(userClips[year]).length === 0) {
                delete userClips[year];
            }
            await updateClipsRow(email, userClips, client);
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

// ---Starting point---
export default async function handler(req, res){
    const email = getSessionEmail(req);

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
