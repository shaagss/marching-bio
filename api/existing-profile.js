import { checkExistingProfile } from '../lib/db.js';

export default async function handler(req, res) {
    const { email } = req.query;
    const profile = await checkExistingProfile(email);

    return res.status(200).json(profile);
}