import { getSessionEmail } from '../lib/auth.js';

export default function handler(req, res) {
    const email = getSessionEmail(req);
    if (!email) {
        return res.status(401).json({ loggedIn: false });
    }

    res.status(200).json({ loggedIn: true, email });
}