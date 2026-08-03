// ---Youtube player demo---
let ytApiLoadStarted = false;
let ytReadyResolve;
const ytReady = new Promise(resolve => {
    ytReadyResolve = resolve;
});

// Script must not be type module
function onYouTubeIframeAPIReady() { //keep name the same
    ytReadyResolve();
}

function ensureYtApiLoaded() { 
    if( !ytApiLoadStarted ){
        ytApiLoadStarted = true;
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
    }
    return ytReady;
}

async function createClipPlayer(containerId, videoDetails) {
    return new Promise(resolve => {
        const newPlayer = new YT.Player(containerId, {
            videoId: videoDetails.videoId,
            playerVars: {
                start: videoDetails.start,
                end: videoDetails.end,
                controls: 0,
                disablekb: 1,
                rel: 0,
                fs: 0
            },
            events: {
                onReady: () => resolve(newPlayer),
                onStateChange: event => {
                    if (event.data === YT.PlayerState.ENDED) {
                        event.target.seekTo(videoDetails.start, true);
                        event.target.playVideo();
                    }
                }
            }
        });
    });
}