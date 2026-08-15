import { getGroupsDetails } from '../lib/db.js';

export default async function handler(req, res) {
    const { ids } = req.query;
    const groupIds = ids ? ids.split(',') : [];

    const groupDetails = await getGroupsDetails(groupIds);
    res.status(200).json(groupDetails);
}

// all copied