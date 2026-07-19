import { getProfileByCode } from '../lib/db.js';

export default async function handler(req, res) {
    const { code } = req.query;
    const profile = await getProfileByCode(code);

    if (!profile) {
        return res.status(404).json({ error: 'Not found' });
    }
    
    let pubProfile = {};
    pubProfile.name = profile.name;
    pubProfile.expr = profile.expr;
    return res.status(200).json(pubProfile);
}