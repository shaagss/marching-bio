export async function getVideoDuration(videoId) {
    const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`
    );
    const data = await response.json();

    if (!data.items || data.items.length === 0) {
        return null; // invalid video ID, or video doesn't exist/is private
    }

    return toSeconds(data.items[0].contentDetails.duration);
}

function toSeconds(duration) {
const match = duration.match(/PT(?:(?<hours>\d+)H)?(?:(?<minutes>\d+)M)?(?:(?<seconds>\d+)S)?/);

const hours = parseInt(match.groups.hours || 0, 10);
const minutes = parseInt(match.groups.minutes || 0, 10);
const seconds = parseInt(match.groups.seconds || 0, 10);

return hours * 3600 + minutes * 60 + seconds;
}