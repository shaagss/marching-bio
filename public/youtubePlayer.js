// ---Youtube player demo---
let isPlaying = false;
const tag = document.createElement('script');
tag.src = 'https://www.youtube.com/iframe_api';
document.body.appendChild(tag);

let player;
// Script must not be type module
function onYouTubeIframeAPIReady() {
    player = new YT.Player('video-player', {
        videoId: 'KfC6Xgy4ZL4',
        playerVars: {
            start: 422,
            end: 432,
            controls: 0,
            disablekb: 1,
            rel: 0,
            fs: 0
        },
        events: {
            onStateChange: onVideoStateChange
        }
    });

    // document.getElementById('video-pause-play').addEventListener('click', () => {
    //     if (isPlaying) {
    //         player.pauseVideo();
    //     } else {
    //         player.playVideo();
    //     }
    // });
}

function onVideoStateChange(event) {
    if( event.data === YT.PlayerState.ENDED ){
        player.seekTo(422, true);
        player.playVideo();
    }
    else if (event.data === YT.PlayerState.PLAYING) {
        isPlaying = true;
    }
    else if (event.data === YT.PlayerState.PAUSED) {
        isPlaying = false;
    }
}