

// ======================================================
// 2. GLOBAL STATE
// ======================================================
let penguinCoin = 0;

let penguinState = {
  lapar: 100,
  mood: 100,
  energi: 100,
  bersih: 100
};

let penguinAIState = {
  mood: "neutral",
  lastAction: "none"
};

let isLoaded = false;
let sleepInterval = null;
let isBathing = false;
let bathInterval = null;
// ======================================================
// 3. UI FUNCTIONS
// ======================================================
function updateCoinUI(){
  const el = document.getElementById("coinText");
  if (el) el.textContent = ` ${penguinCoin}`;
}

function updateStatusUI(){

  const setBar = (id,val)=>{
    const el = document.getElementById(id);
    if(el){
      el.setAttribute("height", val * 0.18);
      el.setAttribute("y", 46 - (val * 0.18));
    }
  };

  const setText = (id,val)=>{
    const el = document.getElementById(id);
    if(el){
      el.textContent = Math.round(val) + "%";
    }
  };

  setBar("laparBar", penguinState.lapar);
  setBar("moodBar", penguinState.mood);
  setBar("energiBar", penguinState.energi);
  setBar("bersihBar", penguinState.bersih);

  setText("laparText", penguinState.lapar);
  setText("moodText", penguinState.mood);
  setText("energiText", penguinState.energi);
  setText("bersihText", penguinState.bersih);



  updateHungerExpression();
}


// ======================================================
// 4. UTIL (CLAMP)
// ======================================================
function clampStats(){

  for (let k in penguinState){
    penguinState[k] = Math.max(0, Math.min(100, penguinState[k]));
  }

  // 🧠 extra safety biar gak negatif glitch
  if(penguinState.lapar <= 0) penguinState.lapar = 0;
  if(penguinState.energi <= 0) penguinState.energi = 0;
  if(penguinState.bersih <= 0) penguinState.bersih = 0;
  if(penguinState.mood <= 0) penguinState.mood = 0;
}

// ======================================================
// 5. FIREBASE SAVE / LOAD
// ======================================================
function saveGame(){
  localStorage.setItem("penguin", JSON.stringify({
    coin: penguinCoin,
    state: penguinState,
    sleeping: isSleeping,
    time: Date.now()
  }));
}

function loadGame(){
  const raw = localStorage.getItem("penguin");
  if(!raw) {
    isLoaded = true;
    updateStatusUI();
    updateCoinUI();
    return;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.log("corrupt save reset");
    isLoaded = true;
    return;
  }

  penguinCoin = data.coin || 0;

  Object.assign(penguinState, data.state || {});

  isSleeping = data.sleeping || false;
initEyeSystem(); // 🔥 penting

  const diff = Math.min(
    60,
    Math.floor((Date.now() - data.time) / 60000)
  );

  penguinState.lapar -= diff * 2;
  penguinState.mood -= diff;
  penguinState.bersih -= diff * 3;

  if (isSleeping) {
    penguinState.energi += diff * 2;
  } else {
    penguinState.energi -= diff;
  }

  clampStats();

  // 🔥 IMPORTANT: INIT STATE AFTER LOAD
  isLoaded = true;
  updateStatusUI();
  updateCoinUI();
  updateMudState?.();
  eyesWakeMode?.();
}
window.addEventListener("DOMContentLoaded", () => {
  loadGame();
});
// ======================================================
// 6. ACTION SYSTEM
// ======================================================

// 🍖 makan
function updateHungerExpression(){

  if(isChewing) return; // 🔒 BIAR GAK NABRAK CHEW

  const penguin = document.getElementById("bigPenguin");

  const leftEye = document.getElementById("bigMataKiri");
  const rightEye = document.getElementById("bigMataKanan");

  const beakTop = document.getElementById("beakTop");
  const beakBottom = document.getElementById("beakBottom");

  const throat = document.getElementById("throat");

  if(!penguin) return;

  // =========================
  // 🚫 NORMAL MODE → BALIK KE SYSTEM ASLI
  // =========================
  if(penguinState.lapar > 98){

    penguin.classList.remove("sad-mode");
    penguin.classList.remove("hunger-shake");

    // 🔥 JANGAN RESET KE FIX VALUE ANEH
    // cukup biarin blink system kamu yang handle
    return;
  }

  // =========================
  // 😐 MID MODE (26–50)
  // =========================
  if(penguinState.lapar > 25){

    penguin.classList.remove("hunger-shake");

    if(leftEye && rightEye){
      leftEye.setAttribute("ry", "5");
      rightEye.setAttribute("ry", "5");
    }

    if(beakTop && beakBottom){
      beakTop.setAttribute("transform", "translate(0,1)");
      beakBottom.setAttribute("transform", "translate(0,-1)");
    }

    if(throat){
      throat.setAttribute("ry", "2");
      throat.setAttribute("opacity", "1");
      throat.setAttribute("transform", "translate(0,-6)");
    }

    return;
  }

  // =========================
  // 😢 HUNGRY MODE (≤25)
  // =========================
  penguin.classList.add("hunger-shake");

  if(leftEye && rightEye){
    leftEye.setAttribute("ry", "2");
    rightEye.setAttribute("ry", "2");

    leftEye.setAttribute("cy", "53");
    rightEye.setAttribute("cy", "53");
  }

  if(beakTop && beakBottom){
    beakTop.setAttribute("transform", "translate(0,1)");
    beakBottom.setAttribute("transform", "translate(0,3)");
  }

  if(throat){
    throat.setAttribute("ry", "6");
    throat.setAttribute("opacity", "1");
    throat.setAttribute("transform", "translate(0,-6)");
  }
}

function feedPenguin(){

  // 🍖 kalau sudah full
if(penguinState.lapar >= 100){
  setPetReaction(); // penguin senyum / nolak
  return;
}

  if (penguinCoin < 0) return;

  penguinCoin -= 0;

  penguinState.lapar += 10;
  penguinState.mood += 2;

  clampStats();
  updateCoinUI();
  updateStatusUI();

  setEatingAnimation();
  chewBeak();
  saveGame();
}
function setEatingAnimation(){

  const penguin = document.getElementById("bigPenguin");
  if(!penguin) return;

  penguin.classList.add("eating");

  setTimeout(() => {
    penguin.classList.remove("eating");
  }, 1200);
}

let isChewing = false;

function chewBeak(){

  if(isChewing) return; // 🔒 anti double trigger
  isChewing = true;

  const top = document.getElementById("beakTop");
  const bottom = document.getElementById("beakBottom");
  const throat = document.getElementById("throat");

  let i = 0;

  const interval = setInterval(() => {

    if(i % 2 === 0){

      top.setAttribute("transform", "translate(0,-1)");
      bottom.setAttribute("transform", "translate(0,2)");

      if(throat){
        throat.setAttribute("ry", "6");
      }

    } else {

      top.setAttribute("transform", "translate(0,0)");
      bottom.setAttribute("transform", "translate(0,0)");

      if(throat){
        throat.setAttribute("ry", "5");
      }
    }

    i++;

    if(i > 8){
      clearInterval(interval);

      top.setAttribute("transform", "translate(0,1)");
      bottom.setAttribute("transform", "translate(0,-1)");

      if(throat){
        throat.setAttribute("ry", "2");
      }

      isChewing = false; // 🔓 unlock di akhir
    }

  }, 120);
}


// ❤️ elus
function petPenguin(){

  // ❗ anti spam ringan
  if(isBlinkLocked) return;

  penguinState.mood += 5;

  clampStats();
  updateStatusUI();

  isBlinkLocked = true;

  setPetReaction();
  blushCheeks();

  // save setelah state stabil (lebih aman)
  saveGame();

  setTimeout(() => {
    isBlinkLocked = false;
  }, 1200);
}

function setPetReaction(){

  const left = document.getElementById("bigMataKiri");
  const right = document.getElementById("bigMataKanan");

  const penguin = document.getElementById("bigPenguin");

  if(penguin){
    penguin.classList.add("happy-shake");
    setTimeout(() => penguin.classList.remove("happy-shake"), 800);
  }

  if(left && right){

    // “><” style (mata kecil senang)
    left.setAttribute("ry", "2");
    right.setAttribute("ry", "2");

    setTimeout(() => {
      left.setAttribute("ry", "6");
      right.setAttribute("ry", "6");
    }, 1000);
  }
}

function blushCheeks(){

  const left = document.getElementById("cheekLeft");
  const right = document.getElementById("cheekRight");

  if(!left || !right) return;

  left.classList.add("cheek-blush");
  right.classList.add("cheek-blush");

  setTimeout(() => {
    left.classList.remove("cheek-blush");
    right.classList.remove("cheek-blush");
  }, 1200);
}
// 🛁 mandi
window.bathPenguin = function(){

  const room = document.querySelector(".penguin-room");

  if(!isBathing){

    isBathing = true;
    if(room) room.classList.add("bath-mode");

    startBathBubbles();

  } else {

    isBathing = false;
    if(room) room.classList.remove("bath-mode");

    stopBathBubbles();
  }

saveGame();
}

function startBathBubbles(){

  if(bathInterval) clearInterval(bathInterval);

bathInterval = setInterval(() => {

  const count = 2 + Math.floor(Math.random() * 4);

  for(let i = 0; i < count; i++){
    spawnBubble();
  }
  
  // 💧 LUMPUR CUMA SAMPAI 75
  if(penguinState.bersih < 75){
    spawnMudDrop();
  }

  penguinState.bersih += 5;
  clampStats();
  updateStatusUI();
  updateMudState();

}, 1200); // lebih cepat biar terasa mandi

}

function stopBathBubbles(){

  if(bathInterval){
    clearInterval(bathInterval);
    bathInterval = null;
  }
}
function spawnMudDrop(){

  const container = document.getElementById("mudDropContainer");
  const penguin = document.getElementById("bigPenguin");

  if(!container || !penguin) return;

  const drop = document.createElement("div");
  drop.classList.add("mud-drop");

  // 🎯 pakai area screen (bukan SVG rect)
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;

  // 📌 kamu bisa adjust area penguin manually (ini penting)
  const centerX = screenW * 0.20;
  const centerY = screenH * 0.10;

  const spreadX = 80; // lebar area lumpur
  const spreadY = 100; // tinggi area lumpur

  const x = centerX + (Math.random() - 0.5) * spreadX;
  const y = centerY + (Math.random() - 0.5) * spreadY;

  drop.style.left = `${x}px`;
  drop.style.top = `${y}px`;

  container.appendChild(drop);

  setTimeout(() => drop.remove(), 1200);
}
function updateMudState(){

  if(!isLoaded) return;

  const mud = document.getElementById("mudLayer");
  if(!mud) return;

  const clean = penguinState.bersih;

  // 🧼 bersih banget → tidak ada lumpur
  if(clean >= 60){
    mud.style.opacity = 0;
    return;
  }

  // 🟤 sudah kotor (≤25) → FULL lumpur
  if(clean <= 25){
    mud.style.opacity = 1;
    return;
  }

  // 🔄 transisi 25 → 100
  let opacity = 1 - ((clean - 25) / 50);

  mud.style.opacity = Math.max(0, Math.min(1, opacity));
}

// ======================================================
// 7. SLEEP SYSTEM
// ======================================================


// ======================================================
// EYE SYSTEM GLOBAL STATE
// ======================================================
let isSleeping = false;
let isBlinkLocked = false;
let blinkInterval = null;

// ======================================================
// EYE VISUAL STATE
// ======================================================
function eyesSleepMode(){

  const kiri = document.getElementById("bigMataKiri");
  const kanan = document.getElementById("bigMataKanan");

  if(!kiri || !kanan) return;

  kiri.setAttribute("ry","1");
  kanan.setAttribute("ry","1");
}

function eyesWakeMode(){

  const kiri = document.getElementById("bigMataKiri");
  const kanan = document.getElementById("bigMataKanan");

  if(!kiri || !kanan) return;

  kiri.setAttribute("ry","6");
  kanan.setAttribute("ry","6");
}

// ======================================================
// BLINK CORE
// ======================================================
function blinkPenguin(){

  if(isSleeping || isBlinkLocked) return;

  const kiri = document.getElementById("bigMataKiri");
  const kanan = document.getElementById("bigMataKanan");

  if(!kiri || !kanan) return;

  kiri.setAttribute("ry","1");
  kanan.setAttribute("ry","1");

  setTimeout(() => {

    if(isSleeping || isBlinkLocked) return;

    kiri.setAttribute("ry","6");
    kanan.setAttribute("ry","6");

  }, 150);
}

// ======================================================
// BLINK LOOP CONTROL
// ======================================================
function startBlink(){

  stopBlink();

  blinkInterval = setInterval(() => {

    if(isSleeping) return;

    if(Math.random() > 0.5){
      blinkPenguin();
    }

  }, 3000);
}

function stopBlink(){

  if(blinkInterval){
    clearInterval(blinkInterval);
    blinkInterval = null;
  }
}

// ======================================================
// SLEEP SYSTEM (MASTER CONTROL)
// ======================================================
function toggleSleepPenguin(){

  const room = document.querySelector(".penguin-room");

  isSleeping = !isSleeping;

  if(isSleeping){

    isBlinkLocked = true;

    room?.classList.add("sleep-mode");

    eyesSleepMode();

    stopBlink(); // STOP TOTAL BLINK

  } else {

    isBlinkLocked = false;

    room?.classList.remove("sleep-mode");

    eyesWakeMode();

    startBlink(); // START AGAIN
  }

  saveGame?.();
}

// optional alias
function sleepPenguin(){
  if(isSleeping) return;
  toggleSleepPenguin();
}

function wakePenguin(){
  if(!isSleeping) return;
  toggleSleepPenguin();
}

// ======================================================
// INIT SYSTEM (WAJIB DIPANGGIL SAAT GAME START)
// ======================================================
function initEyeSystem(){

  if(isSleeping){
    eyesSleepMode();
    isBlinkLocked = true;
    stopBlink();
  } else {
    eyesWakeMode();
    isBlinkLocked = false;
    startBlink();
  }
}

// ======================================================
// 10. AI SYSTEM
// ======================================================
let actionCooldown = false;
function runAction(action){

  if(actionCooldown) return;

  actionCooldown = true;

  setTimeout(() => {
    actionCooldown = false;
  }, 3000);

  switch(action){

    case "seekFood":
      penguinState.lapar += 10;
      break;

    case "sleep":
      if(!isSleeping) toggleSleepPenguin();
      break;

    case "bath":
      if(!isBathing) bathPenguin();
      break;

    case "play":
      penguinState.mood += 10;
      break;
  }

  clampStats();
}

function penguinBrain(){

  const {lapar,mood,energi,bersih} = penguinState;

  let state = "happy";
  let action = "idle";

  if(lapar < 25){
    state = "hungry";
    action = "seekFood";
  }
  else if(energi < 25){
    state = "sleepy";
    action = "sleep";
  }
  else if(bersih < 25){
    state = "dirty";
    action = "bath";
  }
  else if(mood < 40){
    state = "bored";
    action = "play";
  }

  penguinAIState.mood = state;

  if(penguinAIState.lastAction !== action){
    penguinAIState.lastAction = action;
    runAction(action);
  }


  updateStatusUI();
}

// ======================================================
// 11. LOOPS
// ======================================================
setInterval(() => {

  if(!isLoaded) return;

  if(isSleeping){

    // 💤 SLEEP MODE (pelan + seimbang)
    penguinState.energi += 1.5;   // naik
    penguinState.lapar -= 0.3;     // turun pelan
    penguinState.mood -= 0.1;      // turun sangat pelan
    penguinState.bersih -= 0.05;   // hampir gak kerasa

  } else {

    // 🔥 NORMAL MODE
    penguinState.lapar -= 2;
    penguinState.mood -= 0.3;
    penguinState.energi -= 0.2;
    penguinState.bersih -= 0.1;
  }

  clampStats();
 updateStatusUI();
}, 3000);

setInterval(() => {

  if(!isLoaded) return;

  if(!isSleeping){
    penguinBrain();
  }

  updateMudState();

}, 1500);

setInterval(() => {

  if(!isLoaded) return;

  // simpan hanya kalau ada perubahan penting
  saveGame();

}, 8000);

function getPenguinRect(){
  const el = document.getElementById("bigPenguin");
  return el ? el.getBoundingClientRect() : null;
}


function spawnBubble(){

  const container = document.getElementById("bubbleContainer");
  if(!container) return;

  const bubble = document.createElement("div");
  bubble.classList.add("bubble");

  const size = 8 + Math.random() * 20;
  bubble.style.width = size + "px";
  bubble.style.height = size + "px";

  let x = Math.random() * window.innerWidth;
  let y = window.innerHeight;

  bubble.style.left = x + "px";
  bubble.style.bottom = "0px";

  container.appendChild(bubble);

  const penguin = document.getElementById("bigPenguin");

  let interval = setInterval(() => {

    y += 2;
    bubble.style.transform = `translateY(-${y}px)`;

    const pRect = getPenguinRect();
    const bRect = bubble.getBoundingClientRect();

    if(pRect && bRect){

      const dx = Math.abs((bRect.left + bRect.width/2) - (pRect.left + pRect.width/2));
      const dy = Math.abs((bRect.top + bRect.height/2) - (pRect.top + pRect.height/2));

      // 🎯 kalau kena penguin
      if(dx < 40 && dy < 40){

        clearInterval(interval);

        bubble.classList.add("pop");

        setTimeout(() => {
          bubble.remove();
        }, 200);
      }
    }

    // hapus kalau keluar layar
    if(y > window.innerHeight + 200){
      clearInterval(interval);
      bubble.remove();
    }

  }, 30);
}


// ======================================================
// 12. GLOBAL BUTTON ACCESS
// ======================================================
window.feedPenguin = feedPenguin;
window.petPenguin = petPenguin;
window.toggleSleepPenguin = toggleSleepPenguin;
window.sleepPenguin = sleepPenguin;
window.wakePenguin = wakePenguin;

window.bathPenguin = bathPenguin;

function initGame(){
  loadGame();        // ambil data dulu

  clampStats();      // rapihin angka

  updateCoinUI();
  updateStatusUI();
  initEyeSystem();

  applySleepVisual?.();

  // 🔥 WAJIB sync visual sleep
  if(isSleeping){
    document.querySelector(".penguin-room")?.classList.add("sleep-mode");
    eyesSleepMode();
  } else {
    document.querySelector(".penguin-room")?.classList.remove("sleep-mode");
    eyesWakeMode();
  }

  updateMudState?.();
  updateHungerExpression?.();

  isLoaded = true; // 🔥 INI PENTING BANGET
}

initGame();