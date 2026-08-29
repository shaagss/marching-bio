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
            await updateRow(email, userDetails, client);
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

async function getGroupCircuit(groupId, client){
    // the CURRENT REAL circuit
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

// also make sure details are deleted when
// group is deleted, like clips.
