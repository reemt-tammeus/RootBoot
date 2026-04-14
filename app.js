let drillPool = [], apPool = [];
let activeBlock = [], wordsInRound = [], apTasks = [];
let currentWordIdx = 0, currentTaskIdx = 0;
let lives = 3, score = 0, currentMode = ""; 

// --- INIT ---
async function init() {
    try {
        const [dRes, aRes] = await Promise.all([fetch('data_drill.json'), fetch('data_ap_mode.json')]);
        drillPool = shuffle([...await dRes.json()]);
        apPool = await aRes.json();
    } catch(e) { console.error("Load Error"); }

    document.getElementById('btn-start-drill').onclick = startDrill;
    document.getElementById('btn-start-ap').onclick = startAP;
    document.getElementById('btn-check').onclick = checkAnswer;
}

function shuffle(a) { return a.sort(() => Math.random() - 0.5); }

function updateHUD() {
    document.getElementById('lives-container').innerText = "❤️".repeat(lives);
    document.getElementById('score').innerText = score;
    if (lives <= 0) showScreen('result');
}

// --- DRILL MODE ---
function startDrill() {
    currentMode = "drill"; lives = 3; score = 0;
    activeBlock = drillPool.splice(0, 3);
    prepareSorting();
    showScreen('drill');
}

function prepareSorting() {
    wordsInRound = []; currentWordIdx = 0;
    const types = ['noun', 'verb', 'adjective', 'adverb'];
    
    activeBlock.forEach(fam => {
        let famWords = [];
        types.forEach(t => {
            if(fam[t] && fam[t][0]) {
                famWords.push({ text: fam[t][0], type: t, root: fam.noun[0] });
                const slotCont = document.getElementById(`slots-${t}`);
                const dot = document.createElement('div'); dot.className = 'ghost-slot';
                slotCont.appendChild(dot);
            }
        });
        wordsInRound.push(...shuffle(famWords)); // Innerhalb der Familie mischen
    });
    renderSorting();
}

function renderSorting() {
    const word = wordsInRound[currentWordIdx];
    document.getElementById('current-tap-word').innerText = word.text.toUpperCase();
    document.getElementById('sorting-label').innerText = `Gehört zu "${word.root.toUpperCase()}":`;
}

document.querySelectorAll('.drop-zone').forEach(zone => {
    zone.onclick = () => {
        if(currentMode !== "drill" || currentWordIdx >= wordsInRound.length) return;
        const type = zone.dataset.type;
        if(type === wordsInRound[currentWordIdx].type) {
            zone.querySelector('.ghost-slot:not(.filled)').classList.add('filled');
            currentWordIdx++;
            if(currentWordIdx < wordsInRound.length) renderSorting();
            else startDrillSentences();
        } else { lives--; updateHUD(); }
    };
});

function startDrillSentences() {
    currentTaskIdx = 0;
    apTasks = activeBlock.map(fam => ({
        context: fam.sentence.replace(/\[.*?\]/g, "_______"),
        solution: [fam.noun[0]], // Vereinfacht für Drill
        base_word: fam.noun[0],
        correct: fam.sentence.match(/\[(.*?)\]/)[1] 
    }));
    showScreen('task');
    showTask();
}

// --- AP MODE ---
function startAP() {
    currentMode = "ap"; lives = 3; score = 0;
    let all = [];
    apPool.forEach(b => b.gaps.forEach(g => all.push({...g, context: b.text})));
    apTasks = shuffle(all).slice(0, 10);
    currentTaskIdx = 0;
    showScreen('task');
    showTask();
}

function showTask() {
    const t = apTasks[currentTaskIdx];
    document.getElementById('task-display').innerHTML = t.context.replace(/{(\d+)}/g, "___");
    document.getElementById('task-hint').innerHTML = `Stammwort: <strong>${t.base_word.toUpperCase()}</strong>`;
    document.getElementById('task-input').value = "";
    renderKeyboard(currentMode === "drill" ? t.correct : "");
}

function renderKeyboard(filterWord) {
    const cont = document.getElementById('app-keyboard');
    cont.innerHTML = "";
    let keys = filterWord ? [...new Set(filterWord.toUpperCase())] : "QWERTYUIOPASDFGHJKLZXCVBNM".split("");
    if(filterWord) while(keys.length < 15) { 
        let r = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random()*26)];
        if(!keys.includes(r)) keys.push(r);
    }
    shuffle(keys).forEach(k => {
        const b = document.createElement('button'); b.className = "key"; b.innerText = k;
        b.onclick = () => document.getElementById('task-input').value += k.toLowerCase();
        cont.appendChild(b);
    });
    const del = document.createElement('button'); del.className="key action"; del.innerText="⌫";
    del.onclick = () => { let i = document.getElementById('task-input'); i.value = i.value.slice(0,-1); };
    cont.appendChild(del);
}

function checkAnswer() {
    const t = apTasks[currentTaskIdx];
    const val = document.getElementById('task-input').value.trim().toLowerCase();
    const sol = currentMode === "drill" ? t.correct.toLowerCase() : t.solution.map(s => s.toLowerCase());
    
    if ( (currentMode === "drill" && val === sol) || (currentMode === "ap" && sol.includes(val)) ) {
        score += 20; currentTaskIdx++;
        if(currentTaskIdx < apTasks.length) showTask();
        else showScreen('result');
    } else {
        lives--; updateHUD();
        apTasks.push(apTasks[currentTaskIdx]); // Wiederholungsschleife
        currentTaskIdx++;
        showTask();
    }
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id + '-screen').classList.add('active');
    document.getElementById('top-bar').className = id === 'start' ? 'hidden' : '';
    updateHUD();
}

init();
