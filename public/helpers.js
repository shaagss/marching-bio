export function exprToHtml(expr, parentId) {
    // Get parent and clear children
    const parent = document.getElementById(parentId);
    parent.replaceChildren();

    // Make div containing entire year, then just the groups. Fill them
    for (const [key, value] of Object.entries(expr)){
        const yearCont = document.createElement('div')
        yearCont.classList.add('year-cont');

        const groupsCont = document.createElement('div')
        groupsCont.classList.add('groups-cont');

        const year = document.createElement('h3');
        year.textContent = key;
        yearCont.append(year, groupsCont);

        const circuits = ['WGI', 'DCI'];
        for(const circuit of circuits){
            if(value.hasOwnProperty(circuit) === true){
                const p = document.createElement('p');
                p.textContent = `${circuit}: ${value[circuit]}`;
                groupsCont.append(p);
            }
        }

        parent.append(yearCont);
    }
}
