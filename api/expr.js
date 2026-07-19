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

// ---for POST method---

async function checkData(email, group, year){
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
                    `
        const qValues = [groupId]
        const data = await client.query(qText, qValues);  
        const group = data.rows[0]
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
                    `
        const qValues = [expr, email]
        await client.query(qText, qValues);  
    }
    catch (err){
        console.error(err);
    }
}

// ---for GET method---

async function getExprFromDB(email, client){    
    const qText = `
                SELECT expr
                FROM profiles
                WHERE email = $1
                `
    const qValues = [email]
    const data = await client.query(qText, qValues);  
    return data.rows[0].expr;
}

// ---Starting point---

export default async function handler(req, res){
    if (req.method === 'GET') {
        getExpr(req, res);
    } else if (req.method === 'POST') {
        addExpr(req, res);
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}

async function addExpr(req, res){
    const email = getSessionEmail(req);
    const { group, year, key } = req.body;

    if(key !== STUPID_KEY){
        res.status(423).json({ success: false });
        return;
    }
    
    await checkData(email, group, year);
    res.status(200).json({ success: true });
}

async function getExpr(req, res){
    const email = getSessionEmail(req);
    const client = await pool.connect();
    const expr = await getExprFromDB(email, client);

    res.status(200).json(expr);
}
