
export async function getClipsFromDB(email, client){    
    const qText = `SELECT clips
                    FROM profiles
                    WHERE email = $1`;
    const data = await client.query(qText, [email]);
    return data.rows[0].clips;
}

export async function updateClipsRow(email, clips, client){
    const qText = `UPDATE profiles
                    SET clips = $1
                    WHERE email = $2`;
    await client.query(qText, [clips, email]);
}