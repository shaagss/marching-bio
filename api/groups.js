import { getGroups } from '../lib/db.js';

export default async function handler(req, res) {
    const { circuit, theClass, instrument } = req.query;
    const rows = await getGroups(circuit, theClass, instrument);
    res.status(200).json(rows);
}