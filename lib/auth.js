import jwt from 'jsonwebtoken';
import { parseCookies } from '../lib/cookies.js';

export function getSessionEmail(req) {
    const cookies = parseCookies(req.headers.cookie || '');
    const token = cookies.session;

    if (!token) return null;

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        return payload.email;
    } 
    catch {
        return null; 
    }
}