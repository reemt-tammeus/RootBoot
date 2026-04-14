let drillPool = [], apPool = [], activeBlock = [], wordsInRound = [], tasks = [];
let wordIdx = 0, taskIdx = 0, lives = 3, score = 0, mode = "";

// Der touchmove-Fix wurde entfernt, da CSS "overscroll-behavior: none" das jetzt besser und sicherer regelt.

async function init() {
    try {
        const [dRes, aRes] = await Promise.all([fetch('data_drill.json'), fetch('data_ap_mode.json')]);
        drillPool = shuffle([...await dRes.json()]);
        apPool = await aRes.json();
    } catch(e) { 
        console.error("Data Load Error: ", e); 
    }

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

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
    });
    
    let target = document.getElementById(id + '-screen');
    if(target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }
    
    let topBar = document.getElementById('top-bar');
    if(id === 'start' || id === 'result') {
        topBar.classList.add('hidden');
    } else {
        topBar.classList.remove('hidden');
    }
}

// Dummy-Funktionen für Start & End (passe diese mit deiner genauen Logik an)
function startDrill() {
    mode = "drill"; lives = 3; score = 0;
    updateHUD();
    showScreen('task'); // Nur als Beispiel, du hattest hier noch eigene Logik
    // showTask();
}

function startAP() {
    mode = "ap"; lives = 3; score = 0;
    updateHUD();
    showScreen('task');
}

function endGame(msg) {
    document.getElementById('result-title').innerText = msg;
    document.getElementById('final-score').innerText = score;
    showScreen('result');
}

// --- TASTATUR LOGIK (iOS FIX) ---
// Ich rufe diese in showTask() oder wo immer du das Keyboard generierst auf
function renderKeyboard(keysArray) {
    const cont = document.getElementById('app-keyboard');
    cont.innerHTML = ""; // Reset
    
    // keysArray könnte z.B. deine gemischten Buchstaben sein
    shuffle(keysArray).forEach(k => {
        const b = document.createElement('button'); 
        b.className = "key"; 
        b.innerText = k;
        
        // iOS FIX: pointerdown ist extrem schnell. e.preventDefault() stoppt Ghost-Clicks und Fokus.
        b.addEventListener('pointerdown', (e) => {
            e.preventDefault(); 
            document.getElementById('task-input').value += k.toLowerCase();
        });
        cont.appendChild(b);
    });

    const del = document.createElement('button'); 
    del.className = "key action"; 
    del.innerText = "⌫";
    del.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        let i = document.getElementById('task-input'); 
        i.value = i.value.slice(0, -1); 
    });
    cont.appendChild(del);
}

function checkAnswer() {
    // Da tasks & taskIdx hier als Dummy stehen, musst du sicherstellen, dass tasks befüllt ist
    if(tasks.length === 0) return; 
    
    const t = tasks[taskIdx];
    const val = document.getElementById('task-input').value.trim().toLowerCase();
    
    // Check, ob eine der Lösungen passt
    const isCorrect = t.solution && t.solution.some(s => s.toLowerCase() === val);

    if (isCorrect) {
        score += 20; 
        taskIdx++;
        // showTask(); // Deine Methode um den nächsten Task zu laden
    } else {
        lives--; 
        updateHUD();
        tasks.push(tasks[taskIdx]); // Wiederholungsschleife
        taskIdx++;
        // showTask();
    }
}

// Boot
window.onload = init;
