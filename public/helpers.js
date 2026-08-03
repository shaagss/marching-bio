
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
        yearHead.dataset.year = year;
        yearCont.append(yearHead, groupsCont);

        const circuits = ['WGI', 'DCI'];
        for(const circuit of circuits){
            if(Object.hasOwn(groups, circuit) === true){
                const thisGroupCont = document.createElement('div');
                thisGroupCont.classList.add(circuit + '-cont')
                groupsCont.append(thisGroupCont);

                const p = document.createElement('p');
                p.textContent = `${circuit}: ${groups[circuit]}`;
                p.dataset.group = groups[circuit];
                thisGroupCont.append(p);
                if(Object.hasOwn(clips, year) && Object.hasOwn(clips[year], circuit)){
                    addClipButton(clips[year][circuit], thisGroupCont, year, circuit);
                }
            }
        }

        parent.append(yearCont);
        // parent has year-cont,
        // which is the year and a div class groups-cont,
        // which has the groups and a div class clip-videoId
    }
}

function addClipButton(clips, groupsCont, year, circuit){
    let count = 1;
    for(const clip of clips){
        let button = document.createElement('button');
        button.classList.add('clip-toggle');
        button.textContent = `🎥 #` + count;
        button.dataset.count = count;
        count++;
        button.dataset.videoId = clip.videoId;
        button.dataset.start = clip.start;
        button.dataset.end = clip.end;
        
        const clipCont = document.createElement('div');
        clipCont.id = `clip-${year}-${circuit}-${clip.videoId}-${clip.start}-${clip.end}`;
        clipCont.classList.add('clip-cont');
        
        button.setAttribute('aria-controls', clipCont.id);
        
        groupsCont.appendChild(button);
        groupsCont.append(clipCont);
    }
}

export function exprToList(expr, selectId, defaultOptString){
    const select = document.getElementById(selectId);
    select.replaceChildren();

    const defaultOpt = document.createElement('option');
    defaultOpt.textContent = defaultOptString;
    defaultOpt.value = '';
    defaultOpt.disabled = true;
    defaultOpt.selected = true;
    select.append(defaultOpt);

    for (const [year, groups] of Object.entries(expr)){
        const yearHead = document.createElement('optgroup')
        yearHead.label = year;

        const circuits = ['WGI', 'DCI'];
        for(const circuit of circuits){
            if(Object.hasOwn(groups, circuit) === true){
                const thisGroupOpt = document.createElement('option');
                thisGroupOpt.textContent = groups[circuit];
                thisGroupOpt.value = groups[circuit];
                thisGroupOpt.dataset.year = year;

                yearHead.append(thisGroupOpt);

            }
        }
        select.append(yearHead);
    }
}
