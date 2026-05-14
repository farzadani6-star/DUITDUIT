import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";

import {
  getFirestore,
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

// ======================================================
// 1. FIREBASE REF
// ======================================================
const penguinDocRef = fb.doc(db, "game", "penguin");

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
let isSleeping = false;
let isBlinkLocked = false;
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

  const set = (id,val)=>{
    const el = document.getElementById(id);
    if(el){
      el.setAttribute("height", val * 0.18); // scale kecil
      el.setAttribute("y", 46 - (val * 0.18));
    }
  };

  set("laparBar", penguinState.lapar);
  set("moodBar", penguinState.mood);
  set("energiBar", penguinState.energi);
  set("bersihBar", penguinState.bersih);
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
function saveToFirebase(){
  fb.setDoc(penguinDocRef, {
    ...penguinState,
    coin: penguinCoin,
    lastTime: Date.now(),
    sleeping: isSleeping
  });
}

fb.onSnapshot(penguinDocRef, (snap) => {

  if (!snap.exists()) return;

  const data = snap.data();

  // =========================
  // LOAD SLEEP STATE (FIXED)
  // =========================
  isSleeping = data.sleeping || false;

  const now = Date.now();
  const last = data.lastTime || now;

  const diffMinutes = Math.floor((now - last) / 60000);

  // =========================
  // LOAD DATA
  // =========================
  penguinCoin = data.coin || 0;

  penguinState.lapar = data.lapar ?? 100;
  penguinState.mood = data.mood ?? 100;
  penguinState.energi = data.energi ?? 100;
  penguinState.bersih = data.bersih ?? 100;

  // =========================
  // OFFLINE EFFECT
  // =========================
if (diffMinutes > 0) {

  const decay = diffMinutes;

  penguinState.lapar -= decay * 2;
  penguinState.mood -= decay;
  penguinState.bersih -= decay * 3;

  if (data.sleeping) {

    // 💤 sleep reduce decay + regen energi
    penguinState.energi += decay * 2;

    // bonus: decay lebih ringan saat tidur
    penguinState.lapar += decay * 1; // offset sedikit
    penguinState.mood += decay * 0.5;
  } 
  else {

    // 🔥 normal offline decay
    penguinState.energi -= decay * 1;
  }
}

  clampStats();
  updateMudState();
  isLoaded = true;

  updateStatusUI();
  updateCoinUI();


  // =========================
  // EYE STATE SYNC
  // =========================
  const room = document.querySelector(".penguin-room");

  if (isSleeping) {
    if (room) room.classList.add("sleep-mode");
    eyesSleepMode();
  } else {
    if (room) room.classList.remove("sleep-mode");
    eyesWakeMode();
  }

});

// ======================================================
// 6. ACTION SYSTEM
// ======================================================

// 🍖 makan
function feedPenguin(){

  if (penguinCoin < 2) return;

  penguinCoin -= 2;

  penguinState.lapar += 10;
  penguinState.mood += 2;

  clampStats();

  updateCoinUI();
  updateStatusUI();

  // animasi
  setEatingAnimation();
  chewBeak();
}
function setEatingAnimation(){

  const penguin = document.getElementById("bigPenguin");
  if(!penguin) return;

  penguin.classList.add("eating");

  setTimeout(() => {
    penguin.classList.remove("eating");
  }, 1200);
}
function chewBeak(){

  const top = document.getElementById("beakTop");
  const bottom = document.getElementById("beakBottom");
  const throat = document.getElementById("throat");

  let i = 0;

  const interval = setInterval(() => {

    if(i % 2 === 0){

      top.setAttribute("transform", "translate(0,-1)");
      bottom.setAttribute("transform", "translate(0,2)");

      if(throat){
        throat.setAttribute("ry", "6"); // mulut lebih kebuka
      }

    } else {

      top.setAttribute("transform", "translate(0,0)");
      bottom.setAttribute("transform", "translate(0,0)");

      if(throat){
        throat.setAttribute("ry", "5"); // normal
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
    }

  }, 120);
}


// ❤️ elus
function petPenguin(){

  penguinState.mood += 5;
  clampStats();
  updateStatusUI();

  // 🚫 lock blink
  isBlinkLocked = true;

  setPetReaction();
  blushCheeks();

  // unlock setelah animasi selesai
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

  saveToFirebase?.();
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
function toggleSleepPenguin(){

  const room = document.querySelector(".penguin-room");

  if(!isSleeping){

    // ======================
    // SLEEP ON
    // ======================
    isSleeping = true;

    if(room) room.classList.add("sleep-mode");

    eyesSleepMode();

    if(sleepInterval) clearInterval(sleepInterval);

    sleepInterval = setInterval(() => {
      penguinState.energi += 2;
      clampStats();
      updateStatusUI();
    }, 5000);

  } else {

    // ======================
    // WAKE UP
    // ======================
    isSleeping = false;

    if(room) room.classList.remove("sleep-mode");

    eyesWakeMode();

    if(sleepInterval){
      clearInterval(sleepInterval);
      sleepInterval = null;
    }
  }

  saveToFirebase();
}


// ======================
// OPTIONAL (KEEP ONLY IF YOU STILL CALL IT)
// ======================
function sleepPenguin(){
  if(isSleeping) return;
  toggleSleepPenguin();
}

function wakePenguin(){
  if(!isSleeping) return;
  toggleSleepPenguin();
}



// ======================================================
// 8. BLINK SYSTEM
// ======================================================
function blinkPenguin(){

  if(isSleeping) return;
  if(isBlinkLocked) return;
  const kiri = document.getElementById("bigMataKiri");
  const kanan = document.getElementById("bigMataKanan");

  if(!kiri || !kanan) return;

  kiri.setAttribute("ry","1");
  kanan.setAttribute("ry","1");

  setTimeout(()=>{
    kiri.setAttribute("ry","6");
    kanan.setAttribute("ry","6");
  },150);
}

setInterval(()=>{
  if(!isSleeping && Math.random() > 0.5){
    blinkPenguin();
  }
},3000);

// ======================================================
// 9. EYE MODE
// ======================================================
function eyesSleepMode(){
  const kiri = document.getElementById("bigMataKiri");
  const kanan = document.getElementById("bigMataKanan");

  if(kiri && kanan){
    kiri.setAttribute("ry","1");
    kanan.setAttribute("ry","1");
  }
}

function eyesWakeMode(){
  const kiri = document.getElementById("bigMataKiri");
  const kanan = document.getElementById("bigMataKanan");

  if(kiri && kanan){
    kiri.setAttribute("ry","6");
    kanan.setAttribute("ry","6");
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
setInterval(()=>{

if(!isLoaded) return;

if(isSleeping){

  // 💤 sleep mode (regen)
  penguinState.energi += 2;
  penguinState.lapar -= 0.5;
  penguinState.mood -= 0.2;

} else {

  // 🔥 normal decay
  penguinState.lapar -= 3;
  penguinState.mood -= 1;
  penguinState.energi -= 1;
  penguinState.bersih -= 2;
}

clampStats();

},30000);

setInterval(()=>{

  if(!isLoaded || isSleeping) return;

  penguinBrain();
  updateMudState();
},1500);

setInterval(()=>{

  if(!isLoaded) return;

  saveToFirebase();

},2000);

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
window.wakePenguin = wakePenguin;
window.bathPenguin = bathPenguin;
