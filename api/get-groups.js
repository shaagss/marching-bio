import { getAllGroups } from '../lib/db.js';

export default async function handler(req, res) {
    const rows = await getAllGroups();
    res.status(200).json(rows);
}