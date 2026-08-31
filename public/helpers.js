
export async function exprToHtml(expr, clips, details, parentId) {
    const groupDetails = await exprToGroupInfo(expr);
    // Get parent and clear children
    const parent = document.getElementById(parentId);
    parent.replaceChildren();

    // Make div containing entire year, then just the groups. Fill them
    for (const [year, groups] of Object.entries(expr).reverse()){
        const yearCont = document.createElement('div')
        yearCont.classList.add('year-cont');
        
        const yearHead = document.createElement('h3');
        yearHead.textContent = year;
        yearHead.dataset.year = year;
        
        const groupsCont = document.createElement('div')
        groupsCont.classList.add('groups-cont');

        yearCont.append(yearHead, groupsCont);

        const circuits = ['DCI', 'WGI'];
        for(const circuit of circuits){
            if(Object.hasOwn(groups, circuit) === true){
                const thisGroupCont = document.createElement('div');
                thisGroupCont.classList.add(circuit + '-cont');
                groupsCont.append(thisGroupCont);

                const circuitHead = document.createElement('h4');
                circuitHead.textContent = circuit;
                circuitHead.dataset.circuit = circuit;
                thisGroupCont.append(circuitHead);

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

                const nameCont = document.createElement('div');
                nameCont.classList.add('name-cont');
                thisGroupCont.append(nameCont);

                const p = document.createElement('p');
                p.textContent = groupDetails[groupId].name;
                p.dataset.group = groupId;
                p.dataset.class = groupDetails[groupId].class
                p.dataset.division = groupDetails[groupId].division;
                p.classList.add('groupName');
                nameCont.append(p);

                if(Object.hasOwn(clips, year) && Object.hasOwn(clips[year], circuit)){
                    addClipButton(clips[year][circuit], thisGroupCont, year, circuit);
                }

                if( Object.hasOwn(details, year) && Object.hasOwn(details[year], circuit) ){
                    saveDetails(details[year][circuit], thisGroupCont, groupDetails[groupId])
                }
                else{
                    addMinimalDetails(thisGroupCont, groupDetails[groupId]);
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
    const allClipsCont = document.createElement('div');
    allClipsCont.classList.add('allClips-cont');
    groupsCont.appendChild(allClipsCont);

    const allClipButtonCont = document.createElement('div');
    allClipButtonCont.classList.add('allClipButton-cont');
    allClipsCont.appendChild(allClipButtonCont);
    
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
        allClipsCont.append(clipCont);
    }
}

// if it has a value, display it.
// placement + competition + score are always present as a SET

function addMinimalDetails(groupsCont, defaultDetails){
    const tiny = document.createElement('p');
    tiny.classList.add('tiny');
    const displayClass = classToStr(defaultDetails.circuit, defaultDetails.division, defaultDetails.class)
    tiny.textContent = displayClass;

    const groupName = groupsCont.querySelector('.groupName');
    groupName.insertAdjacentElement('afterend', tiny);
}

function saveDetails(details, groupsCont, defaultDetails){
    let realClass;
    if(Object.hasOwn(details, 'correctedClass')){
        realClass = classToStr(defaultDetails.circuit, defaultDetails.division, details.correctedClass);
    }
    else {
        realClass = classToStr(defaultDetails.circuit, defaultDetails.division, defaultDetails.class);
    }

    const groupName = groupsCont.querySelector('.groupName');
    if( Object.hasOwn(details, 'showName') ){
        const showName = document.createElement('p');
        showName.classList.add('italic');
        showName.textContent = details.showName;
        groupName.insertAdjacentElement('beforebegin', showName);
        groupName.classList.add('tiny');
        groupName.textContent += ' - ' + realClass;
    }
    else{
        const tiny = document.createElement('p');
        tiny.classList.add('tiny');
        tiny.textContent = realClass;
        groupName.insertAdjacentElement('afterend', tiny);
    }

    if( Object.hasOwn(details, 'placement') &&
        Object.hasOwn(details, 'competition') &&
        Object.hasOwn(details, 'score') )
    {
        const extraCont = document.createElement('div');
        extraCont.classList.add('extra-cont');
        groupsCont.insertAdjacentElement('beforeend', extraCont);
        
        // PLACEMENT
        const placement = document.createElement('p');
        switch(details.placement){
            case 1:
                placement.textContent = '1st';
                break;
            case 2:
                placement.textContent = '2nd';
                break;
            case 3:
                placement.textContent = '3rd';
                break;
            default:
                placement.textContent = details.placement + 'th';
                break;
        }
        extraCont.append(placement);
    
        // COMPETITION
        let compClass = "";
        const competition = document.createElement('p');
        if(defaultDetails.circuit === "DCI"){
            if(Object.hasOwn(details, 'correctedClass')){
                compClass = details.correctedClass + " ";
            }
            else {
                compClass = defaultDetails.class + " ";
            }
        }
        competition.textContent = '@ ' + defaultDetails.circuit + ' ' + compClass + details.competition; 
        extraCont.append(competition);

        // SCORE
        const score = document.createElement('p');
        score.textContent = details.score;
        extraCont.append(score);
    }
}

function classToStr(circuit, division, theClass){
    if(circuit === "DCI"){
        return theClass;
    }

    let abrv = "";

    if(division === "percussion"){
        abrv += "P";
    }
    else if(division === "winds"){
        abrv += "W";
    }
    else if(division === "guard"){
        // nothing
    }

    abrv += "I";

    if(theClass === "A"){
        abrv += "A";
    }
    else if(theClass === "Open"){
        abrv += "O";
    }
    else if(theClass === "World"){
        abrv += "W";
    }

    return abrv;
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

    const text = submitButton.firstElementChild;
    const loading = submitButton.lastElementChild;

    const transitionId = Symbol();
    submitButton._transitionId = transitionId;
    text.classList.remove('invisible');
    text.classList.add('clear');
    // loading.classList.add('invisible', 'clear');

    text.addEventListener('transitionend', event => {
        if(event.propertyName !== 'opacity') return;
        if(submitButton._transitionId !== transitionId) return;
        text.classList.add('invisible');
    }, { once: true })

    loading.classList.remove('invisible', 'clear')
}

export function swapLoadingBack(submitButton){
    const text = submitButton.firstElementChild;
    const loading = submitButton.lastElementChild;

    const transitionId = Symbol();
    submitButton._transitionId = transitionId;
    
    loading.classList.add('clear');
    loading.addEventListener('transitionend', event => {
        if(event.propertyName !== 'opacity') return;
        if(submitButton._transitionId !== transitionId) return;
        loading.classList.add('invisible');
    }, { once: true })
    
    text.classList.remove('invisible');
    text.classList.remove('clear');
    submitButton.disabled = false;
}
