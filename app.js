let drillPool = [], apPool = [], activeBlock = [], wordsInRound = [], tasks = [];
let wordIdx = 0, taskIdx = 0, lives = 3, score = 0, mode = "";

// MOBILE FIXES
document.addEventListener('touchmove', (e) => {
    if (!e.target.closest('.text-box')) e.preventDefault();
}, { passive: false });

async function init() {
    try {
        const [dRes, aRes] = await Promise.all([fetch('data_drill.json'), fetch('data_ap_mode.json')]);
        drillPool = shuffle([...await dRes.json()]);
        apPool = await aRes.json();
    } catch(e) { console.error("Data Load Error"); }

    document.getElementById('btn-start-drill').onclick = startDrill;
    document.getElementById('btn-start-ap').onclick = startAP;
    document.getElementById('btn-check').onclick = checkAnswer;
}

const shuffle = (a) => a.sort(() => Math.random() - 0.5);

function updateHUD() {
    document.getElementById('lives-container').innerText = "❤️".repeat(Math.max(0, lives));
    document.getElementById('score').innerText = score;
    if (lives <= 0) endGame("Game Over");
}

// --- DRILL MODE ---
function startDrill() {
    mode = "drill"; lives = 3; score = 0;
    activeBlock = drillPool.splice(0, 3);
    document.querySelectorAll('.ghost-slot-container').forEach(c => c.innerHTML = "");
    prepareSorting();
    showScreen('drill');
}

function prepareSorting() {
    wordsInRound = []; wordIdx = 0;
    const types = ['noun', 'verb', 'adjective', 'adverb'];
    
    activeBlock.forEach(fam => {
        let famWords = [];
        types.forEach(t => {
            if(fam[t] && fam[t][0]) {
                famWords.push({ text: fam[t][0], type: t, root: fam.noun[0] });
                const dot = document.createElement('div'); dot.className = 'ghost-slot';
                document.getElementById(`slots-${t}`).appendChild(dot);
            }
        });
        wordsInRound.push(...shuffle(famWords)); // Familie für Familie
    });
    renderSorting();
}

function renderSorting() {
    const w = wordsInRound[wordIdx];
    document.getElementById('current-tap-word').innerText = w.text.toUpperCase();
    document.getElementById('sorting-label').innerText = `Gehört zu "${w.root.toUpperCase()}":`;
}

document.querySelectorAll('.drop-zone').forEach(zone => {
    zone.onclick = () => {
        if(mode !== "drill" || wordIdx >= wordsInRound.length) return;
        if(zone.dataset.type === wordsInRound[wordIdx].type) {
            zone.querySelector('.ghost-slot:not(.filled)').classList.add('filled');
            wordIdx++;
            if(wordIdx < wordsInRound.length) renderSorting();
            else startDrillSentences();
        } else { lives--; updateHUD(); if(navigator.vibrate) navigator.vibrate(100); }
    };
});

function startDrillSentences() {
    tasks = activeBlock.map(fam => {
        const match = fam.sentence.match(/\[(.*?)\]/);
        return {
            context: fam.sentence.replace(/\[.*?\]/g, "_______"),
            solution: [match ? match[1] : ""],
            base_word: fam.noun[0]
        };
    });
    taskIdx = 0;
    showScreen('task');
    showTask();
}

// --- AP MODE ---
function startAP() {
    mode = "ap"; lives = 3; score = 0;
    let all = [];
    apPool.forEach(b => b.gaps.forEach(g => all.push({...g, context: b.text})));
    tasks = shuffle(all).slice(0, 10);
    taskIdx = 0;
    showScreen('task');
    showTask();
}

function showTask() {
    if(taskIdx >= tasks.length) return endGame("Bestanden!");
    const t = tasks[taskIdx];
    document.getElementById('task-display').innerHTML = t.context.replace(/{(\d+)}/g, "___")
                                                                 .replace(`{${t.id}}`, `<b style="color:var(--primary)">_______</b>`);
    document.getElementById('task-hint').innerHTML = `Stammwort: <strong>${t.base_word.toUpperCase()}</strong>`;
    document.getElementById('task-input').value = "";
    renderKeyboard(mode === "drill" ? t.solution[0] : "");
}

function renderKeyboard(filter) {
    const cont = document.getElementById('app-keyboard'); cont.innerHTML = "";
    let keys = filter ? [...new Set(filter.toUpperCase())] : "QWERTYUIOPASDFGHJKLZXCVBNM".split("");
    if(filter) while(keys.length < 14) {
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
    const t = tasks[taskIdx];
    const val = document.getElementById('task-input').value.trim().toLowerCase();
    const isCorrect = t.solution.some(s => s.toLowerCase() === val);

    if (isCorrect) {
        score += 20; taskIdx++;
        showTask();
    } else {
        lives--; updateHUD();
        tasks.push(tasks[taskIdx]); // Wiederholungsschleife
        taskIdx++;
        showTask();
    }
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id + '-screen').classList.add('active');
    document.getElementById('top-bar').className = id === 'start' ? 'hidden' : '';
    updateHUD();
}

function endGame(msg) {
    document.getElementById('result-title').innerText = msg;
    document.getElementById('final-score').innerText = score;
    showScreen('result');
}

init();
