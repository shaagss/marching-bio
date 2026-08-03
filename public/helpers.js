export function exprToHtml(expr, clips, parentId) {
    // Get parent and clear children
    const parent = document.getElementById(parentId);
    parent.replaceChildren();

    // Make div containing entire year, then just the groups. Fill them
    for (const [year, groups] of Object.entries(expr)){
        const yearCont = document.createElement('div')
        yearCont.classList.add('year-cont');

        const groupsCont = document.createElement('div')
        groupsCont.classList.add('groups-cont');

        const yearHead = document.createElement('h3');
        yearHead.textContent = year;
        yearCont.append(yearHead, groupsCont);

        const circuits = ['WGI', 'DCI'];
        for(const circuit of circuits){
            if(Object.hasOwn(groups, circuit) === true){
                const p = document.createElement('p');
                p.textContent = `${circuit}: ${groups[circuit]}`;
                groupsCont.append(p);
                if(Object.hasOwn(clips, year) && Object.hasOwn(clips[year], circuit)){
                    addClipButton(clips[year][circuit], groupsCont);
                }
            }
        }

        parent.append(yearCont);
        // parent has year-cont,
        // which is the year and a div class groups-cont,
        // which has the groups and a div class clip-videoId
    }
}

function addClipButton(clips, groupsCont){
    for(const clip of clips){
        let button = document.createElement('button');
        button.classList.add('clip-toggle');
        button.textContent = clip.videoId; //'Show clip'
        button.dataset.videoId = clip.videoId;
        button.dataset.start = clip.start;
        button.dataset.end = clip.end;
        
        const clipCont = document.createElement('div');
        clipCont.id = `clip-${clip.videoId}`;
        clipCont.classList.add('clip-cont');
        
        button.setAttribute('aria-controls', clipCont.id);
        
        groupsCont.appendChild(button);
        groupsCont.append(clipCont);
    }
}


