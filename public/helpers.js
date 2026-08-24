
export async function exprToHtml(expr, clips, parentId) {
    const groupDetails = await exprToGroupInfo(expr);
    // Get parent and clear children
    const parent = document.getElementById(parentId);
    parent.replaceChildren();

    // Make div containing entire year, then just the groups. Fill them
    for (const [year, groups] of Object.entries(expr).reverse()){
        const yearCont = document.createElement('div')
        yearCont.classList.add('year-cont');

        const groupsCont = document.createElement('div')
        groupsCont.classList.add('groups-cont');

        const yearHead = document.createElement('h3');
        yearHead.textContent = year;
        yearHead.dataset.year = year;
        yearCont.append(yearHead, groupsCont);

        const circuits = ['DCI', 'WGI'];
        for(const circuit of circuits){
            if(Object.hasOwn(groups, circuit) === true){
                const thisGroupCont = document.createElement('div');
                thisGroupCont.classList.add(circuit + '-cont')
                groupsCont.append(thisGroupCont);

                let groupId = groups[circuit];
                if(groupDetails[groupId].photo_url){
                    const img = document.createElement('img');
                    img.src = groupDetails[groupId].photo_url;
                    img.alt = `${groupDetails[groupId].name} logo`;
                    img.classList.add('group-img');
                    
                    const imgCont = document.createElement('div');
                    imgCont.classList.add('group-img-cont');

                    imgCont.append(img);
                    thisGroupCont.append(imgCont);
                }

                const p = document.createElement('p');
                p.textContent = groupDetails[groupId].name;
                p.dataset.group = groupId;
                thisGroupCont.append(p);
                if(Object.hasOwn(clips, year) && Object.hasOwn(clips[year], circuit)){
                    addClipButton(clips[year][circuit], thisGroupCont, year, circuit);
                }

                // div for extra detail (correct class,
                // final place / score, etc
                if( groupId === 'paradigm' ) { // obviously change
                    const extraCont = document.createElement('div');
                    extraCont.classList.add('extra-cont');
                    thisGroupCont.append(extraCont);

                    const corClass = document.createElement('p');
                    corClass.textContent = 'PIO';
                    extraCont.append(corClass);

                    const place = document.createElement('p');
                    place.textContent = '10th - Finals';
                    extraCont.append(place);

                    const score = document.createElement('p');
                    score.textContent = '91.163';
                    extraCont.append(score);
                }
            }
        }

        parent.append(yearCont);
        // parent has year-cont,
        // which is the year and a div class groups-cont,
        // which has a div class WGI-cont and/or DCI-cont,
        // which has the groups and may have a div class allClipButton-cont
        // full of button class clip-toggle
        // and after, some div class clip-cont
    }
}

async function exprToGroupInfo(expr){
    // every group id is added to dictionary,
    // and each value is a dict of details
    // (name, photo_url)
    let allGroupIds = [];

    for (const [year, circuits] of Object.entries(expr)){
        for (const [circuit, groupId] of Object.entries(circuits)){
            if( !allGroupIds.includes(groupId) ){
                allGroupIds.push(groupId);
            }
        }
    }
    const response = await fetch(`/api/get-groups-details?ids=${allGroupIds.join(',')}`);
    return response.json();
}

function addClipButton(clips, groupsCont, year, circuit){
    const allClipButtonCont = document.createElement('div');
    allClipButtonCont.classList.add('allClipButton-cont');
    groupsCont.appendChild(allClipButtonCont);

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
        
        const baseId = `clip-${year}-${circuit}-${clip.videoId}-${clip.start}-${clip.end}`;

        const clipCont = document.createElement('div');
        clipCont.id = baseId;
        clipCont.classList.add('clip-cont');

        const playerTarget = document.createElement('div');
        playerTarget.id = `player-${baseId}`;
        clipCont.appendChild(playerTarget);
        
        button.setAttribute('aria-controls', clipCont.id);
        
        allClipButtonCont.appendChild(button);
        groupsCont.append(clipCont);
    }
}

export async function exprToList(expr, selectId, defaultOptString){
    const groupDetails = await exprToGroupInfo(expr);
    const select = document.getElementById(selectId);
    select.replaceChildren();

    const defaultOpt = document.createElement('option');
    defaultOpt.textContent = defaultOptString;
    defaultOpt.value = '';
    defaultOpt.disabled = true;
    defaultOpt.selected = true;
    select.append(defaultOpt);

    for (const [year, groups] of Object.entries(expr).reverse()){
        const yearHead = document.createElement('optgroup')
        yearHead.label = year;

        const circuits = ['DCI', 'WGI'];
        for(const circuit of circuits){
            if(Object.hasOwn(groups, circuit) === true){
                const thisGroupOpt = document.createElement('option');
                thisGroupOpt.textContent = groupDetails[groups[circuit]].name;
                thisGroupOpt.value = groups[circuit];
                thisGroupOpt.dataset.year = year;

                yearHead.append(thisGroupOpt);
            }
        }
        select.append(yearHead);
    }
}

export function swapSubmitToLoading(submitButton){
    submitButton.disabled = true;
    submitButton.firstElementChild.classList.add('clear');
    submitButton.firstElementChild.addEventListener('transitioned', event => {
        if(event.propertyName === 'opacity'){
            submitButton.firstElementChild.classList.add('invisible');
        }
    }, { once: true })

    submitButton.lastElementChild.classList.remove('invisible', 'clear')
}

export function swapLoadingBack(submitButton){
    submitButton.lastElementChild.classList.add('clear');
    submitButton.lastElementChild.addEventListener('transitioned', event => {
        if(event.propertyName === 'opacity'){
            submitButton.lastElementChild.classList.add('invisible');
        }
    }, { once: true })
    
    submitButton.firstElementChild.classList.remove('invisible', 'clear');
    submitButton.disabled = false;
}
