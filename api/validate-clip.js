import { getVideoDuration } from '../lib/yt.js';

export default async function handler(req, res) {
    let { videoId, start, end } = req.body;
    start = parseInt(start);
    end = parseInt(end);
    const duration = await getVideoDuration(videoId);

    if (!duration) {
        return res.status(400).json({ valid: false, error: 'Video not found' });
    }
    
    if (start < 0 || end > duration || start >= end) {
        return res.status(400).json({ valid: false, error: 'Timestamps out of range' });
    }

    res.status(200).json({ valid: true });
}