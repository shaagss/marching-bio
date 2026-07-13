async function getGroups(circuit, theClass, instrument = null) {
    const params = new URLSearchParams({ circuit, theClass });

    if (instrument) {
        params.append('instrument', instrument);
    }

    const response = await fetch(`/api/groups?${params.toString()}`);
    const data = await response.json()
    const groupsParent = document.getElementById('groups');
    groupsParent.replaceChildren()

    data.forEach((row) => {
        console.log(row);
        const group = document.createElement('p');
        group.textContent = row.name;
        groupsParent.appendChild(group);
    })
}

document.getElementById('group-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const circuit = document.querySelector('input[name="circuit"]:checked').value;
    const theClass = document.querySelector('input[name="class"]:checked').value;
    const instrument = document.querySelector('input[name="instrument"]:checked')?.value || null;
    console.log(circuit, theClass, instrument);
    getGroups(circuit, theClass, instrument);
    
});