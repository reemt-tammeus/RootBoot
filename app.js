let drillPool = [], apPool = [], tasks = [], currentDrillItem = null;
let taskIdx = 0, lives = 3, score = 0, mode = "";

async function init() {
    try {
        const [dRes, aRes] = await Promise.all([
            fetch('data_drill.json'), 
            fetch('data_ap_mode.json')
        ]);
        drillPool = await dRes.json();
        apPool = await aRes.json();
    } catch(e) { 
        console.error("Daten konnten nicht geladen werden.", e); 
    }

    document.getElementById('btn-start-drill').onclick = startDrill;
    document.getElementById('btn-start-ap').onclick = startAP;
}

const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);

// --- DRILL MODE (SORTIEREN) ---
function startDrill() {
    mode = "drill"; 
    lives = 3; 
    score = 0; 
    taskIdx = 0;
    drillPool = shuffle(drillPool); 
    updateHUD();
    showScreen('drill');
    nextDrillWord();
}

function nextDrillWord() {
    if(taskIdx >= drillPool.length || lives <= 0) {
        return endGame(lives > 0 ? "Gewonnen!" : "Game Over");
    }

    currentDrillItem = drillPool[taskIdx];

    const wordToDisplay = 
        (currentDrillItem.noun && currentDrillItem.noun[0]) || 
        (currentDrillItem.verb && currentDrillItem.verb[0]) || 
        (currentDrillItem.adjective && currentDrillItem.adjective[0]) ||
        (currentDrillItem.adverb && currentDrillItem.adverb[0]);

    if (!wordToDisplay) {
        taskIdx++;
        return nextDrillWord();
    }

    document.getElementById('current-tap-word').innerText = wordToDisplay;
}

function checkSort(category) {
    const word = document.getElementById('current-tap-word').innerText;
    
    if (currentDrillItem[category] && currentDrillItem[category].includes(word)) {
        score += 10;
        taskIdx++;
        nextDrillWord();
    } else {
        lives--;
        updateHUD();
        if(lives <= 0) endGame("Game Over");
    }
}

// --- AP MODE (TIPPEN) ---
function startAP() {
    mode = "ap"; 
    lives = 3; 
    score = 0; 
    taskIdx = 0;
    tasks = [];

    apPool.forEach(block => {
        block.gaps.forEach(gap => {
            tasks.push({
                text: block.text,
                base_word: gap.base_word,
                solution: gap.solution,
                gapId: gap.id 
            });
        });
    });

    tasks = shuffle(tasks);
    updateHUD();
    showScreen('task');
    showTask();
}

function showTask() {
    if(taskIdx >= tasks.length || lives <= 0) {
        return endGame("Boot Camp abgeschlossen!");
    }

    const t = tasks[taskIdx];
    document.getElementById('task-input').value = ""; 
    document.getElementById('task-hint').innerHTML = `Stammwort: <strong>${t.base_word || "?"}</strong>`;

    let textToDisplay = t.text || "";
    
    // Aktuelle Lücke auffällig markieren
    if (t.gapId) {
        const activeRegex = new RegExp(`\\{${t.gapId}\\}`, 'g');
        textToDisplay = textToDisplay.replace(activeRegex, `<span style="color: var(--secondary); border-bottom: 3px solid var(--secondary); padding: 0 5px; font-weight: bold;">[ HIER ]</span>`);
    }

    // Alle anderen {x} durch Striche ersetzen
    textToDisplay = textToDisplay.replace(/\{\d+\}/g, "________");

    // Drill Mode Wörter im Satz zensieren (falls nötig)
    if (t.solution && !t.gapId) {
        t.solution.forEach(sol => {
            const regex = new RegExp(`\\b${sol}\\b`, 'gi');
            textToDisplay = textToDisplay.replace(regex, "________");
        });
    }

    document.getElementById('task-display').innerHTML = textToDisplay;
    renderKeyboard();
}

// --- TASTATUR (QWERTZ) ---
function renderKeyboard() {
    const cont = document.getElementById('app-keyboard');
    cont.innerHTML = ""; 
    
    const layout = [
        ['Q','W','E','R','T','Z','U','I','O','P'],
        ['A','S','D','F','G','H','J','K','L'],
        ['⌫','Y','X','C','V','B','N','M','ENTER']
    ];

    layout.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = "keyboard-row";
        
        row.forEach(k => {
            const b = document.createElement('button'); 
            b.className = "key"; 
            
            if (k === 'ENTER') {
                b.innerText = "⏎";
                b.classList.add('action', 'enter');
                b.addEventListener('pointerdown', (e) => { 
                    e.preventDefault(); 
                    checkAnswer(); 
                });
            } else if (k === '⌫') {
                b.innerText = "⌫";
                b.classList.add('action');
                b.addEventListener('pointerdown', (e) => { 
                    e.preventDefault(); 
                    let i = document.getElementById('task-input'); 
                    i.value = i.value.slice(0, -1); 
                });
            } else {
                b.innerText = k;
                b.addEventListener('pointerdown', (e) => {
                    e.preventDefault(); 
                    document.getElementById('task-input').value += k.toLowerCase();
                });
            }
            rowDiv.appendChild(b);
        });
        cont.appendChild(rowDiv);
    });
}

function checkAnswer() {
    const t = tasks[taskIdx];
    const val = document.getElementById('task-input').value.trim().toLowerCase();
    
    const isCorrect = t.solution.some(s => s.toLowerCase() === val);

    if (isCorrect) {
        score += 20; 
        taskIdx++;
        showTask();
    } else {
        lives--; 
        updateHUD();
        if (lives > 0) {
            tasks.push(tasks[taskIdx]);
            taskIdx++;
            showTask();
        }
    }
}

// --- UI ---
function updateHUD() {
    document.getElementById('lives-container').innerText = "❤️".repeat(Math.max(0, lives));
    document.getElementById('score').innerText = score;
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
    });
    
    const target = document.getElementById(id + '-screen');
    if(target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }
    
    const topBar = document.getElementById('top-bar');
    if(id === 'start' || id === 'result') {
        topBar.classList.add('hidden');
    } else {
        topBar.classList.remove('hidden');
    }
}

function endGame(msg) {
    document.getElementById('result-title').innerText = msg;
    document.getElementById('final-score').innerText = score;
    showScreen('result');
}

window.onload = init;
