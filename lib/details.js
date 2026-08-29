export async function getDetailsFromDB(email, client){    
    const qText = `SELECT details
                    FROM profiles
                    WHERE email = $1`;
    const data = await client.query(qText, [email]);
    return data.rows[0].details;
}

export async function updateDetailsRow(email, details, client){
    const qText = `UPDATE profiles
                    SET details = $1
                    WHERE email = $2`;
    await client.query(qText, [details, email]);
}