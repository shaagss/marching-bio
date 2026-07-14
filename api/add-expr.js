import 'dotenv/config';
import { Pool } from 'pg';

const STUPID_KEY = process.env.STUPID_KEY;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: true
    }
});

async function checkData(email, group, year){
    const client = await pool.connect();
    try {
        //on editor load, should check if user exists.
        //if not, make new user with {} expr and new URL code
        //now, its given user exists and has {} value.

        //expr is dict where key is year, and value is dict of
        //keys dci and wgi.

        const qText = `
                    SELECT expr
                    FROM profiles
                    WHERE email = $1
                    `
        const qValues = [email]
        // const qText = `
        //     INSERT INTO profiles (token_hash, email, expires_at, used)
        //     VALUES ($1, $2, $3, $4);`;
        // const qValues = [hashedToken, email, expiredTime, false];
        const data = await client.query(qText, qValues);  
        const userExpr = data.rows[0].expr
        if(Object.hasOwn(userExpr, year) === false){
            // userExpr[year] = {"DCI": null, "WGI": null}
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

export default async function handler(req, res){
    const { email, group, year, key } = req.body;

    if(key !== STUPID_KEY){
        res.status(423).json({ success: false });
        return;
    }
    
    await checkData(email, group, year);

    res.status(200).json({ success: true });
}