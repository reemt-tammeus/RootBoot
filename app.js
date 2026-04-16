let drillPool = [], apPool = [], tasks = [];
let taskIdx = 0, lives = 3, score = 0, mode = "";

// DRILL-HYBRID LOGIK
let roundsPlayed = 0;
let roundStartScore = 0; 
const MAX_ROUNDS = 5;
const FAMILIES_PER_ROUND = 3;
let currentFamilies = []; 
let currentSortWords = []; 
let currentDrillPhase = 1;

async function init() {
    try {
        const [dRes, aRes] = await Promise.all([
            fetch('data_drill.json'), 
            fetch('data_ap_mode.json')
        ]);
        drillPool = await dRes.json();
        apPool = await aRes.json();
    } catch(e) { console.error("Daten konnten nicht geladen werden."); }

    document.getElementById('btn-start-drill').onclick = startDrill;
    document.getElementById('btn-start-ap').onclick = startAP;
}

const shuffle = (array) => {
    let a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function triggerFlash(isSuccess) {
    const body = document.body;
    const flashClass = isSuccess ? 'flash-success' : 'flash-error';
    body.classList.add(flashClass);
    setTimeout(() => body.classList.remove(flashClass), 300);
}

function showModal(title, text, callback) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-text').innerText = text;
    const m = document.getElementById('custom-modal');
    m.classList.remove('hidden');
    m.onclick = () => {
        m.classList.add('hidden');
        if(callback) callback();
    };
}

function findSolutionInSentence(sentence, familyWords) {
    let sortedWords = [...familyWords].sort((a,b) => b.length - a.length);
    for (let w of sortedWords) {
        let exactRegex = new RegExp(`\\b${escapeRegExp(w)}\\b`, 'i');
        let match = sentence.match(exactRegex);
        if (match) return { word: w, matchedText: match[0] };
    }
    for (let w of sortedWords) {
        if (w.length >= 3) {
            let prefixRegex = new RegExp(`\\b${escapeRegExp(w)}[a-z]*\\b`, 'i');
            let match = sentence.match(prefixRegex);
            if (match) return { word: w, matchedText: match[0] };
        }
    }
    return null;
}

// --- HYBRID DRILL MODE ---
function startDrill() {
    mode = "drill"; score = 0; roundsPlayed = 0;
    document.body.classList.add('game-active');
    drillPool = shuffle(drillPool); 
    startNextDrillRound();
}

function startNextDrillRound() {
    if (roundsPlayed >= MAX_ROUNDS) {
        launchFireworks(true);
        return setTimeout(() => endGame("Boot Camp exzellent bestanden!"), 2500);
    }
    roundsPlayed++;
    roundStartScore = score; 
    document.getElementById('current-round').innerText = roundsPlayed;
    document.getElementById('task-current-round').innerText = roundsPlayed;

    const startIndex = (roundsPlayed - 1) * FAMILIES_PER_ROUND;
    currentFamilies = drillPool.slice(startIndex, startIndex + FAMILIES_PER_ROUND);
    restartCurrentRound();
}

function restartCurrentRound() {
    lives = 3; score = roundStartScore; currentDrillPhase = 1;
    updateHUD();
    currentSortWords = [];
    currentFamilies.forEach(family => {
        ['noun', 'verb', 'adjective', 'adverb'].forEach(cat => {
            if (family[cat]) {
                family[cat].forEach(word => currentSortWords.push({ word, familyObj: family }));
            }
        });
    });
    currentSortWords = shuffle(currentSortWords);

    tasks = [];
    currentFamilies.forEach(family => {
        if(family.sentence) {
            let allWords = [...(family.noun||[]), ...(family.verb||[]), ...(family.adjective||[]), ...(family.adverb||[])];
            let sentence = family.sentence;
            let result = findSolutionInSentence(sentence, allWords);
            if (result) {
                let wordsNotInSentence = allWords.filter(w => w !== result.word);
                let baseWord = wordsNotInSentence.length > 0 ? wordsNotInSentence[0] : "Wortfamilie";
                tasks.push({
                    blockText: sentence, // Für Drill Mode ist blockText = sentence
                    base_word: baseWord,
                    solution: [result.matchedText] 
                });
            }
        }
    });
    tasks = shuffle(tasks);
    taskIdx = 0;
    document.getElementById('task-round-indicator').classList.add('hidden');
    showScreen('drill');
    showNextDrillWord();
}

function handleLifeLoss() {
    lives--; triggerFlash(false); updateHUD();
    if (lives <= 0) {
        setTimeout(() => {
            showModal("Leben aufgebraucht!", "Du hast leider alle Herzen verloren. Diese Runde wird zurückgesetzt.", () => {
                if(mode === "drill") {
                    restartCurrentRound();
                } else {
                    // AP Modus komplett neu starten
                    startAP();
                }
            });
        }, 400);
        return true; 
    }
    return false;
}

function showNextDrillWord() {
    if (currentSortWords.length === 0) {
        currentDrillPhase = 2;
        document.getElementById('task-round-indicator').classList.remove('hidden');
        showScreen('task');
        return showTask();
    }
    document.getElementById('current-tap-word').innerText = currentSortWords[0].word;
}

function checkSort(categoryClicked) {
    const item = currentSortWords[0];
    if (item.familyObj[categoryClicked] && item.familyObj[categoryClicked].includes(item.word)) {
        score += 10; triggerFlash(true); currentSortWords.shift(); updateHUD(); showNextDrillWord();
    } else {
        if (!handleLifeLoss()) {
            currentSortWords.push(currentSortWords.shift());
            showNextDrillWord();
        }
    }
}

// --- AP MODE (TIPPEN) ---
function startAP() {
    mode = "ap"; lives = 3; score = 0; taskIdx = 0; tasks = [];
    document.body.classList.add('game-active');

    // Mische die Blöcke durch...
    let shuffledBlocks = shuffle(apPool);

    shuffledBlocks.forEach(block => {
        // ...aber behalte die Lücken in chronologischer Reihenfolge!
        let sortedGaps = [...block.gaps].sort((a, b) => a.id - b.id);
        
        sortedGaps.forEach(gap => {
            tasks.push({ 
                blockText: block.text, 
                base_word: gap.base_word, 
                solution: gap.solution, 
                gapId: gap.id 
            });
        });
    });

    document.getElementById('task-round-indicator').classList.add('hidden');
    updateHUD();
    showScreen('task');
    showTask();
}

function showTask() {
    if (tasks.length === 0 && mode === "drill") {
        launchFireworks(false);
        return setTimeout(startNextDrillRound, 1500);
    }

    if(taskIdx >= tasks.length) {
        if (mode === "drill") {
            launchFireworks(false);
            return setTimeout(startNextDrillRound, 1500); 
        } else {
            launchFireworks(true);
            return setTimeout(() => endGame("AP-Bootcamp bestanden!"), 2500);
        }
    }

    const t = tasks[taskIdx];
    document.getElementById('task-input').value = ""; 
    document.getElementById('task-hint').innerHTML = `Stammwort: <strong>${t.base_word || "?"}</strong>`;

    let textToDisplay = t.blockText || "";
    
    // Die aktuelle Lücke markieren, damit wir gleich dorthin scrollen können
    if (t.gapId) {
        const activeRegex = new RegExp(`\\{${t.gapId}\\}`, 'g');
        textToDisplay = textToDisplay.replace(activeRegex, `<span id="active-gap-element" class="active-gap">[ HIER ]</span>`);
    }

    // Alle anderen {x} in leere Striche verwandeln
    textToDisplay = textToDisplay.replace(/\{\d+\}/g, "________");

    // Drill Mode Logik beibehalten (zensieren der Lösung)
    if (t.solution && !t.gapId) {
        t.solution.forEach(sol => {
            const regex = new RegExp(`\\b${escapeRegExp(sol)}\\b`, 'gi');
            textToDisplay = textToDisplay.replace(regex, "________");
        });
    }

    document.getElementById('task-display').innerHTML = textToDisplay;
    renderKeyboard();

    // AUTO-SCROLL MAGIC: Springt zur aktuellen Lücke!
    setTimeout(() => {
        const activeGap = document.getElementById('active-gap-element');
        if(activeGap) {
            activeGap.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
}

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
            const b = document.createElement('button'); b.className = "key"; 
            if (k === 'ENTER') {
                b.innerText = "⏎"; b.classList.add('action', 'enter');
                b.addEventListener('pointerdown', (e) => { e.preventDefault(); checkAnswer(); });
            } else if (k === '⌫') {
                b.innerText = "⌫"; b.classList.add('action');
                b.addEventListener('pointerdown', (e) => { e.preventDefault(); let i = document.getElementById('task-input'); i.value = i.value.slice(0, -1); });
            } else {
                b.innerText = k;
                b.addEventListener('pointerdown', (e) => { e.preventDefault(); document.getElementById('task-input').value += k.toLowerCase(); });
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
        score += 20; triggerFlash(true); taskIdx++; setTimeout(showTask, 300);
    } else {
        if (!handleLifeLoss()) {
            if (mode === "ap") {
                // Im AP Mode versuchen wir die gleiche Lücke einfach nochmal (ohne sie ans Ende zu hängen)
                setTimeout(showTask, 300);
            } else {
                tasks.push(tasks[taskIdx]);
                taskIdx++;
                setTimeout(showTask, 300);
            }
        }
    }
}

// --- UI & ENDGAME ---
function updateHUD() {
    document.getElementById('lives-container').innerText = "❤️".repeat(Math.max(0, lives));
    document.getElementById('score').innerText = score;
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.add('hidden'); s.classList.remove('active');
    });
    const target = document.getElementById(id + '-screen');
    if (target) { target.classList.remove('hidden'); target.classList.add('active'); }
    document.getElementById('top-bar').classList.toggle('hidden', id === 'start' || id === 'result');
}

function endGame(msg) {
    document.body.classList.remove('game-active');
    document.getElementById('result-title').innerText = msg;
    document.getElementById('final-score').innerText = score;
    showScreen('result');
}

function launchFireworks(isBig) {
    const canvas = document.getElementById('fireworks-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight; canvas.style.display = 'block';

    let particles = [];
    const colors = ['#4A90E2', '#50E3C2', '#FF5252', '#FFD700', '#FF69B4'];
    const particleCount = isBig ? 200 : 50;

    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: canvas.width / 2, y: canvas.height / 2 + (isBig ? 0 : 100),
            vx: (Math.random() - 0.5) * (isBig ? 15 : 8), vy: (Math.random() - 0.5) * (isBig ? 15 : 8) - 2,
            life: Math.random() * 50 + 50, color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 3 + 1
        });
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        particles.forEach(p => {
            if (p.life > 0) {
                alive = true; p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--; p.size *= 0.98;
                ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
            }
        });
        if (alive) requestAnimationFrame(animate); else canvas.style.display = 'none'; 
    }
    animate();
}

window.onload = init;
