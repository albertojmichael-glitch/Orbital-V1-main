// game.js
import { 
    agencyFunds, catalog, contracts, 
    selectedEngine, selectedTank, selectedFuel, selectedBooster, selectedContract, contractCompleted, 
    addFunds, setContractCompleted, setSelectedParts 
} from './data.js';

import {
    PHYSICS_DT, G, EARTH_MASS, EARTH_RADIUS, ATMOSPHERE_HEIGHT, EARTH_X, EARTH_Y, MOON_MASS, MOON_RADIUS, MOON_ORBIT_DISTANCE, MOON_ORBIT_SPEED, MOON_SOI, SUBSTEPS, INITIAL_ORBIT_RADIUS, INITIAL_ORBIT_SPEED, applyPhysics
} from './physics.js';

// Importa TODA a interface do ui.js
import * as UI from './ui.js';

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });

document.body.style.backgroundColor = "#0b0c10";
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.body.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

const bgLaunch = new Image(); bgLaunch.src = 'images/atmosferaterra1.png';
const bgLanding = new Image(); bgLanding.src = 'images/luapouso1.png';

let gameState = "MENU"; 
let launchAlt = 0, launchX = 0, launchVx = 0, launchVy = 0, launchAngle = 0, launchFuel = 0;
let isBurningPrograde = false, isBurningRetrograde = false, isMovingNodeFwd = false, isMovingNodeBwd = false;
let cameraZoom = 1.0, cameraTarget = "EARTH", isPaused = false, plannedDeltaV = 0, maneuverTime = 0; 
let moonAngle = 0, currentMoonX = 0, currentMoonY = 0;
let rocket = { x: 0, y: 0, vx: 0, vy: 0, maxFuel: 0, currentFuel: 0, angle: -Math.PI/2 };

const stars = [];
for (let i = 0; i < 800; i++) { stars.push({ x: (Math.random() - 0.5) * 8000, y: (Math.random() - 0.5) * 8000, radius: Math.random() * 2.0 + 0.5, alpha: Math.random() * 0.7 + 0.3 }); }
const clouds = [];
for(let i=0; i<30; i++) { clouds.push({ x: Math.random() * 2000 - 500, y: Math.random() * 3500, w: 100 + Math.random() * 150 }); }

const keys = { ArrowUp: false, ArrowLeft: false, ArrowRight: false };
window.addEventListener('keydown', (e) => { 
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true; 
    
    // SISTEMA DE DESACOPLAMENTO (ESTÁGIOS)
    if (e.code === 'Space' && hasBooster && (gameState === 'LAUNCH' || gameState === 'VOO')) {
        hasBooster = false; // Ejeta os Boosters!
        // Efeito visual de fumaça da ejeção
        ctx.fillStyle = "white"; ctx.fillRect(canvas.width/2 - 50, canvas.height/2 - 50, 100, 100);
    }
});
window.addEventListener('keyup', (e) => { if (keys.hasOwnProperty(e.code)) keys[e.code] = false; });

// Novas Variáveis de Estágio (Adicione junto com as outras variáveis let lá no topo)
let hasBooster = false;
let boosterFuel = 0;

// ============================================================
// LÓGICA DE EVENTOS (CONECTANDO COM A UI)
// ============================================================
UI.btnStart?.addEventListener('click', () => { UI.menuScreen.style.display = "none"; UI.assemblyScreen.style.display = "flex"; updateAssemblyUI(); });

function updateAssemblyUI() {
    setSelectedParts(
        catalog.engines[parseInt(UI.engineSelect.value)], 
        catalog.tanks[parseInt(UI.tankSelect.value)], 
        catalog.fuels[parseInt(UI.fuelSelect.value)], 
        catalog.boosters[parseInt(UI.boosterSelect.value)], // NOVO
        contracts[parseInt(UI.contractSelect.value)]
    );
    const rocketCost = selectedEngine.cost + selectedTank.cost + selectedFuel.cost + selectedBooster.cost; 
    const finalCost = rocketCost - selectedContract.advance; 
    
    if (UI.contractDesc) UI.contractDesc.innerHTML = `<strong>Objetivo:</strong> ${selectedContract.desc}<br><span style="color:#a2d149;">Adiantamento: R$ ${selectedContract.advance.toLocaleString()}</span> | <span style="color:#f6a84b;">Prêmio: R$ ${selectedContract.reward.toLocaleString()}</span>`;
    if (UI.assemblyFundsDiv) UI.assemblyFundsDiv.innerText = `Caixa: R$ ${agencyFunds.toLocaleString()}`;
    if (UI.totalCostDiv) { UI.totalCostDiv.innerHTML = `Custo do Foguete: R$ ${rocketCost.toLocaleString()}<br>Gasto Efetivo: <strong>R$ ${finalCost.toLocaleString()}</strong>`; UI.totalCostDiv.style.color = finalCost > agencyFunds ? "#e7471d" : "#ffffff"; }
}

UI.boosterSelect.addEventListener('change', updateAssemblyUI); // NOVO
UI.engineSelect.addEventListener('change', updateAssemblyUI); UI.tankSelect.addEventListener('change', updateAssemblyUI); UI.fuelSelect.addEventListener('change', updateAssemblyUI); UI.contractSelect.addEventListener('change', updateAssemblyUI);

UI.btnLaunch?.addEventListener('click', () => {
    const finalCost = (selectedEngine.cost + selectedTank.cost + selectedFuel.cost + selectedBooster.cost) - selectedContract.advance;
    if (agencyFunds >= finalCost) {
        addFunds(-finalCost); 
        
        // Inicializa o Foguete com ou sem estágios
        hasBooster = selectedBooster.name !== "Nenhum (0kg)";
        boosterFuel = selectedBooster.fuel;
        
        launchAlt = 0; launchX = 0; launchVx = 0; launchVy = 0; launchAngle = -Math.PI / 2; launchFuel = selectedTank.fuel;
        rocket.maxFuel = selectedTank.fuel; setContractCompleted(false);
        UI.assemblyScreen.style.display = "none"; gameState = "LAUNCH";
    } else alert("Sem fundos suficientes!");
});

UI.btnReturn.addEventListener('click', () => { UI.resultScreen.style.display = "none"; UI.assemblyScreen.style.display = "flex"; updateAssemblyUI(); gameState = "MONTAGEM"; keys.ArrowUp = false; keys.ArrowLeft = false; keys.ArrowRight = false; });

function completeContract() { setContractCompleted(true); addFunds(selectedContract.reward); UI.missionText.innerHTML = `✅ <strong>Missão Concluída!</strong> (+ R$ ${selectedContract.reward.toLocaleString()})`; UI.missionText.style.color = "#a2d149"; }

function endMission(target, impactSpeed, isMinigame = false) {
    gameState = "RESULT"; UI.hudContainer.style.display = "none"; UI.uiContainer.style.display = "none"; UI.resultScreen.style.display = "flex";
    isBurningPrograde = false; isBurningRetrograde = false; isPaused = false;
    let limit = isMinigame ? 2.5 : 2.0;

    if (impactSpeed <= limit) {
        UI.resultTitle.innerText = "POUSO PERFEITO! 🏆"; UI.resultTitle.style.color = "#a2d149";
        if (target.includes("LUA") && selectedContract.id === "LAND" && !contractCompleted) { completeContract(); }
        let recov = target.includes("LUA") ? 0 : 15000; if(recov > 0) addFunds(recov);
        UI.resultMessage.innerHTML = `Aeronave intacta em: ${target} a ${impactSpeed.toFixed(2)} m/s.<br>`;
        if (recov > 0) UI.resultMessage.innerHTML += `Peças Recuperadas: +R$ ${recov.toLocaleString()}<br>`;
        if (contractCompleted) UI.resultMessage.innerHTML += `<br><span style="color:#a2d149;">Contrato Cumprido: +R$ ${selectedContract.reward.toLocaleString()}</span>`;
    } else {
        UI.resultTitle.innerText = "Missão Fracassada! 💥"; UI.resultTitle.style.color = "#e7471d";
        UI.resultMessage.innerText = `Você bateu a ${impactSpeed.toFixed(2)} m/s.\nO limite de segurança era ${limit.toFixed(2)} m/s.`;
    }
}

UI.btnPause.addEventListener('click', () => {
    isPaused = !isPaused;
    if (isPaused) { UI.btnPause.innerText = "▶️ Retomar"; UI.btnPause.style.backgroundColor = "#4b7cf6"; UI.btnExecute.style.display = "block"; UI.btnNodePrev.style.display = "block"; UI.btnNodeNext.style.display = "block"; UI.planText.style.display = "block"; plannedDeltaV = 0; maneuverTime = 0; } 
    else { UI.btnPause.innerText = "⏸️ Planejar"; UI.btnPause.style.backgroundColor = "#3a4a5c"; UI.btnExecute.style.display = "none"; UI.btnNodePrev.style.display = "none"; UI.btnNodeNext.style.display = "none"; UI.planText.style.display = "none"; plannedDeltaV = 0; maneuverTime = 0; }
});

UI.btnExecute.addEventListener('click', () => {
    if (rocket.currentFuel <= 0) return;
    const PREDICT_DT = PHYSICS_DT * 6; let crashed = false;
    for (let i = 0; i < maneuverTime; i++) {
        moonAngle += MOON_ORBIT_SPEED * PREDICT_DT;
        const simMoonX = EARTH_X + Math.cos(moonAngle) * MOON_ORBIT_DISTANCE; const simMoonY = EARTH_Y + Math.sin(moonAngle) * MOON_ORBIT_DISTANCE;
        const result = applyPhysics(rocket.x, rocket.y, rocket.vx, rocket.vy, simMoonX, simMoonY, PREDICT_DT); rocket.x = result.x; rocket.y = result.y; rocket.vx = result.vx; rocket.vy = result.vy;
        
        let mVx = -Math.sin(moonAngle) * MOON_ORBIT_DISTANCE * MOON_ORBIT_SPEED; let mVy = Math.cos(moonAngle) * MOON_ORBIT_DISTANCE * MOON_ORBIT_SPEED;
        if (Math.sqrt((rocket.x - EARTH_X)**2 + (rocket.y - EARTH_Y)**2) <= EARTH_RADIUS) { endMission("TERRA", Math.sqrt(rocket.vx**2 + rocket.vy**2)); crashed = true; break; }
        if (Math.sqrt((rocket.x - simMoonX)**2 + (rocket.y - simMoonY)**2) <= MOON_RADIUS) { startLandingMinigame(); crashed = true; break; }
    }
    if (!crashed) {
        const speed = Math.sqrt(rocket.vx**2 + rocket.vy**2);
        if (speed > 0) { rocket.vx += (rocket.vx / speed) * plannedDeltaV; rocket.vy += (rocket.vy / speed) * plannedDeltaV; }
        rocket.currentFuel -= Math.abs(plannedDeltaV) * 50 * selectedFuel.efficiency; if (rocket.currentFuel < 0) rocket.currentFuel = 0;
        UI.btnPause.click(); 
    }
});

const startEv = (flagName) => (e) => { if (e) e.preventDefault(); eval(`${flagName} = true`); }
const stopEv = (flagName) => (e) => { if (e) e.preventDefault(); eval(`${flagName} = false`); }
UI.btnPrograde.addEventListener('mousedown', startEv('isBurningPrograde')); UI.btnPrograde.addEventListener('mouseup', stopEv('isBurningPrograde')); UI.btnPrograde.addEventListener('mouseleave', stopEv('isBurningPrograde'));
UI.btnRetrograde.addEventListener('mousedown', startEv('isBurningRetrograde')); UI.btnRetrograde.addEventListener('mouseup', stopEv('isBurningRetrograde')); UI.btnRetrograde.addEventListener('mouseleave', stopEv('isBurningRetrograde'));
UI.btnNodeNext.addEventListener('mousedown', startEv('isMovingNodeFwd')); UI.btnNodeNext.addEventListener('mouseup', stopEv('isMovingNodeFwd')); UI.btnNodeNext.addEventListener('mouseleave', stopEv('isMovingNodeFwd'));
UI.btnNodePrev.addEventListener('mousedown', startEv('isMovingNodeBwd')); UI.btnNodePrev.addEventListener('mouseup', stopEv('isMovingNodeBwd')); UI.btnNodePrev.addEventListener('mouseleave', stopEv('isMovingNodeBwd'));
window.addEventListener('wheel', (e) => { if(gameState !== "VOO") return; cameraZoom += e.deltaY * -0.001; cameraZoom = Math.min(Math.max(0.1, cameraZoom), 4.0); });
UI.btnFocus.addEventListener('click', () => {
    if (cameraTarget === "EARTH") { cameraTarget = "ROCKET"; UI.btnFocus.innerText = "📷 Foco: Foguete"; }
    else if (cameraTarget === "ROCKET") { cameraTarget = "MOON"; UI.btnFocus.innerText = "📷 Foco: Lua"; }
    else { cameraTarget = "EARTH"; UI.btnFocus.innerText = "📷 Foco: Terra"; }
});


function applyEngine(dt) {
    if (rocket.currentFuel <= 0 && (!hasBooster || boosterFuel <= 0)) return;
    
    // Calcula o Empuxo total (Motor principal + Booster)
    let activeThrust = selectedEngine.thrust;
    if (hasBooster) {
        if (boosterFuel > 0) activeThrust += selectedBooster.thrust; // Muita força!
        else activeThrust *= 0.3; // PESO MORTO! Perde 70% da eficiência se não ejetar!
    }

    if (isPaused) {
        if (isBurningPrograde) plannedDeltaV += activeThrust * dt * 0.05; 
        if (isBurningRetrograde) plannedDeltaV -= activeThrust * dt * 0.05;
        if (isMovingNodeFwd) maneuverTime = Math.min(4900, maneuverTime + 3.0); 
        if (isMovingNodeBwd) maneuverTime = Math.max(0, maneuverTime - 3.0);
        return; 
    }
    
    if (!isBurningPrograde && !isBurningRetrograde) return;
    const speed = Math.sqrt(rocket.vx**2 + rocket.vy**2); if (speed <= 0) return;
    const dirX = rocket.vx / speed, dirY = rocket.vy / speed;
    
    if (isBurningPrograde) { rocket.vx += dirX * activeThrust * dt; rocket.vy += dirY * activeThrust * dt; }
    if (isBurningRetrograde) { rocket.vx -= dirX * activeThrust * dt; rocket.vy -= dirY * activeThrust * dt; }
    
    // Queima o combustível correto
    if (hasBooster && boosterFuel > 0) {
        boosterFuel -= (selectedBooster.thrust / (9.81 * 250)) * 1000 * dt; 
        if (boosterFuel < 0) boosterFuel = 0;
    } else {
        const ispe = selectedEngine.name.includes("Titã") ? 350 : 300; 
        const massFlow = selectedEngine.thrust / (9.81 * ispe);
        rocket.currentFuel -= massFlow * selectedEngine.thrust * dt * 1000; 
        if (rocket.currentFuel < 0) rocket.currentFuel = 0;
    }
}

function drawTrajectory() {
    let simX = rocket.x, simY = rocket.y, simVx = rocket.vx, simVy = rocket.vy, simMoonAngle = moonAngle;
    const PREDICT_DT = PHYSICS_DT * 6; const PREDICT_LIMIT = 5000; 
    const currentMoonX = EARTH_X + Math.cos(moonAngle) * MOON_ORBIT_DISTANCE; const currentMoonY = EARTH_Y + Math.sin(moonAngle) * MOON_ORBIT_DISTANCE;

    ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255, 255, 255, 0.8)"; ctx.strokeStyle = "rgba(255, 255, 255, 0.7)"; ctx.lineWidth = 3 / cameraZoom; ctx.beginPath(); 
    let startDrawX = simX, startDrawY = simY;
    if (cameraTarget === "MOON") { startDrawX = currentMoonX + (simX - currentMoonX); startDrawY = currentMoonY + (simY - currentMoonY); }
    ctx.moveTo(startDrawX, startDrawY);

    for (let i = 0; i < maneuverTime; i++) {
        simMoonAngle += MOON_ORBIT_SPEED * PREDICT_DT; 
        const simMoonX = EARTH_X + Math.cos(simMoonAngle) * MOON_ORBIT_DISTANCE; const simMoonY = EARTH_Y + Math.sin(simMoonAngle) * MOON_ORBIT_DISTANCE;
        const result = applyPhysics(simX, simY, simVx, simVy, simMoonX, simMoonY, PREDICT_DT); simX = result.x; simY = result.y; simVx = result.vx; simVy = result.vy;
        if (i % 5 === 0) {
            let drawX = simX, drawY = simY;
            if (cameraTarget === "MOON") { drawX = currentMoonX + (simX - simMoonX); drawY = currentMoonY + (simY - simMoonY); }
            ctx.lineTo(drawX, drawY);
        }
    }
    ctx.stroke();

    if (isPaused) {
        ctx.shadowColor = "#f6a84b"; ctx.fillStyle = "#f6a84b"; ctx.beginPath(); 
        let nodeDrawX = simX, nodeDrawY = simY;
        if (cameraTarget === "MOON") {
            const simMoonX = EARTH_X + Math.cos(simMoonAngle) * MOON_ORBIT_DISTANCE; const simMoonY = EARTH_Y + Math.sin(simMoonAngle) * MOON_ORBIT_DISTANCE;
            nodeDrawX = currentMoonX + (simX - simMoonX); nodeDrawY = currentMoonY + (simY - simMoonY);
        }
        ctx.arc(nodeDrawX, nodeDrawY, 8 / cameraZoom, 0, Math.PI * 2); ctx.fill();
        const speed = Math.sqrt(simVx**2 + simVy**2);
        if (speed > 0) { simVx += (simVx / speed) * plannedDeltaV; simVy += (simVy / speed) * plannedDeltaV; }
    }

    ctx.beginPath(); ctx.shadowColor = isPaused ? "#f6a84b" : "rgba(255, 255, 255, 0.8)"; ctx.strokeStyle = isPaused ? "#f6a84b" : "rgba(255, 255, 255, 0.7)"; ctx.lineWidth = (isPaused ? 4 : 3) / cameraZoom; 
    let resumeDrawX = simX, resumeDrawY = simY;
    if (cameraTarget === "MOON") {
        const simMoonX = EARTH_X + Math.cos(simMoonAngle) * MOON_ORBIT_DISTANCE; const simMoonY = EARTH_Y + Math.sin(simMoonAngle) * MOON_ORBIT_DISTANCE;
        resumeDrawX = currentMoonX + (simX - simMoonX); resumeDrawY = currentMoonY + (simY - simMoonY);
    }
    ctx.moveTo(resumeDrawX, resumeDrawY);

    let periapsis = { d: Infinity, x: 0, y: 0 }; let apoapsis = { d: 0, x: 0, y: 0 }; let crashed = false; let crashX = 0, crashY = 0;

    for (let i = 0; i < PREDICT_LIMIT - maneuverTime; i++) {
        simMoonAngle += MOON_ORBIT_SPEED * PREDICT_DT; 
        const simMoonX = EARTH_X + Math.cos(simMoonAngle) * MOON_ORBIT_DISTANCE; const simMoonY = EARTH_Y + Math.sin(simMoonAngle) * MOON_ORBIT_DISTANCE;
        const result = applyPhysics(simX, simY, simVx, simVy, simMoonX, simMoonY, PREDICT_DT); simX = result.x; simY = result.y; simVx = result.vx; simVy = result.vy;
        
        let drawX = simX, drawY = simY; let focusDist = Math.sqrt((simX - EARTH_X)**2 + (simY - EARTH_Y)**2);
        if (cameraTarget === "MOON") { drawX = currentMoonX + (simX - simMoonX); drawY = currentMoonY + (simY - simMoonY); focusDist = Math.sqrt((simX - simMoonX)**2 + (simY - simMoonY)**2); }
        if (focusDist < periapsis.d) periapsis = { d: focusDist, x: drawX, y: drawY };
        if (focusDist > apoapsis.d && focusDist < MOON_SOI * 1.5) apoapsis = { d: focusDist, x: drawX, y: drawY };

        if (Math.sqrt((simX - EARTH_X)**2 + (simY - EARTH_Y)**2) <= EARTH_RADIUS || Math.sqrt((simX - simMoonX)**2 + (simY - simMoonY)**2) <= MOON_RADIUS) { crashed = true; crashX = drawX; crashY = drawY; break; }
        if (i % 5 === 0) ctx.lineTo(drawX, drawY);
    }
    
    if (crashed) { ctx.strokeStyle = "#e7471d"; ctx.shadowColor = "#e7471d"; }
    ctx.stroke();

    ctx.shadowBlur = 0; ctx.font = "bold " + (16/cameraZoom) + "px 'Segoe UI'"; ctx.textAlign = "center";
    if (crashed) { ctx.font = (24/cameraZoom) + "px Arial"; ctx.fillText("💥", crashX, crashY - 12/cameraZoom); } 
    else {
        if (periapsis.d !== Infinity) { ctx.fillStyle = "#a2d149"; ctx.fillText("Pe", periapsis.x, periapsis.y - 12/cameraZoom); }
        if (apoapsis.d > 0) { ctx.fillStyle = "#4b7cf6"; ctx.fillText("Ap", apoapsis.x, apoapsis.y - 12/cameraZoom); }
    }
    ctx.restore(); 
}

// ============================================================
// RENDERIZADORES DOS MINIJOGOS
// ============================================================
let lander = { x: 0, y: 0, vx: 0, vy: 0, angle: -Math.PI/2, fuel: 0 };
let landingTerrain = []; let landingPad = { x: 0, w: 0, y: 0 };

function startLandingMinigame() {
    gameState = "LANDING"; UI.uiContainer.style.display = "none"; 
    lander = { x: canvas.width / 2, y: 50, vx: (Math.random() - 0.5) * 4, vy: 1.0, angle: -Math.PI/2, fuel: rocket.currentFuel };
    landingTerrain = []; const segments = 20; const segmentWidth = canvas.width / segments; landingPad.w = segmentWidth * 2;
    const padIndex = Math.floor(Math.random() * (segments - 6)) + 3; 
    for (let i = 0; i <= segments; i++) {
        if (i >= padIndex && i <= padIndex + 2) { landingTerrain.push({ x: i * segmentWidth, y: canvas.height - 80 }); if (i === padIndex) landingPad.x = i * segmentWidth; landingPad.y = canvas.height - 80; } 
        else { landingTerrain.push({ x: i * segmentWidth, y: canvas.height - 40 - Math.random() * 200 }); }
    }
}

function drawLaunchRocket(thrustMag) {
    // Foguete Principal
    ctx.fillStyle = "#cccccc"; ctx.fillRect(-8, -40, 16, 60); 
    ctx.beginPath(); ctx.moveTo(-8, -40); ctx.lineTo(0, -60); ctx.lineTo(8, -40); ctx.fill(); 
    ctx.fillStyle = "#888888";
    ctx.fillRect(-14, -10, 6, 30); ctx.beginPath(); ctx.moveTo(-14, -10); ctx.lineTo(-11, -20); ctx.lineTo(-8, -10); ctx.fill(); 
    ctx.fillRect(8, -10, 6, 30); ctx.beginPath(); ctx.moveTo(8, -10); ctx.lineTo(11, -20); ctx.lineTo(14, -10); ctx.fill(); 
    
    if (thrustMag > 0) { 
        ctx.fillStyle = "#f6a84b"; ctx.beginPath(); ctx.moveTo(-10, 20); ctx.lineTo(0, 50 + Math.random()*20); ctx.lineTo(10, 20); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.moveTo(-5, 20); ctx.lineTo(0, 30 + Math.random()*10); ctx.lineTo(5, 20); ctx.fill();
    }

    // DESENHAR ESTÁGIOS AUXILIARES (BOOSTERS)
    if (hasBooster) {
        ctx.fillStyle = "#eeeeee";
        ctx.fillRect(-22, -20, 8, 40); // Booster Esquerdo
        ctx.fillRect(14, -20, 8, 40);  // Booster Direito
        ctx.beginPath(); ctx.moveTo(-22, -20); ctx.lineTo(-18, -30); ctx.lineTo(-14, -20); ctx.fill(); // Bico
        ctx.beginPath(); ctx.moveTo(14, -20); ctx.lineTo(18, -30); ctx.lineTo(22, -20); ctx.fill();

        if (thrustMag > 0 && boosterFuel > 0) {
            ctx.fillStyle = "#f6a84b"; 
            ctx.beginPath(); ctx.moveTo(-20, 20); ctx.lineTo(-18, 50 + Math.random()*20); ctx.lineTo(-16, 20); ctx.fill();
            ctx.beginPath(); ctx.moveTo(16, 20); ctx.lineTo(18, 50 + Math.random()*20); ctx.lineTo(20, 20); ctx.fill();
        }
    }
}

function drawLanderModule(isThrusting, isRcsLeft, isRcsRight) {
    ctx.strokeStyle = "#888"; ctx.lineWidth = 3; 
    ctx.beginPath(); ctx.moveTo(-12, 5); ctx.lineTo(-20, 20); ctx.lineTo(-25, 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, 5); ctx.lineTo(20, 20); ctx.lineTo(25, 20); ctx.stroke();
    ctx.fillStyle = "#DAA520"; 
    ctx.beginPath(); ctx.moveTo(-15, -5); ctx.lineTo(15, -5); ctx.lineTo(10, 10); ctx.lineTo(-10, 10); ctx.fill();
    ctx.fillStyle = "#cccccc"; 
    ctx.beginPath(); ctx.arc(0, -5, 12, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#85aaff"; 
    ctx.beginPath(); ctx.arc(0, -10, 4, 0, Math.PI*2); ctx.fill();
    if (isThrusting) { ctx.fillStyle = "#4b7cf6"; ctx.beginPath(); ctx.moveTo(-4, 10); ctx.lineTo(0, 25 + Math.random()*15); ctx.lineTo(4, 10); ctx.fill(); }
    if (isRcsLeft) { ctx.fillStyle = "#f6a84b"; ctx.beginPath(); ctx.arc(-15, -5, 3, 0, Math.PI*2); ctx.fill(); }
    if (isRcsRight) { ctx.fillStyle = "#f6a84b"; ctx.beginPath(); ctx.arc(15, -5, 3, 0, Math.PI*2); ctx.fill(); }
}

// ============================================================
// GAME LOOP PRINCIPAL
// ============================================================
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // =======================================================
    // FASE 1: MINIJOGO DE LANÇAMENTO
    // =======================================================
    if (gameState === "LAUNCH") {
        if (bgLaunch.complete) { ctx.drawImage(bgLaunch, 0, 0, canvas.width, canvas.height); }
        
        // CÉU ESCURECENDO (AGORA ATÉ 60.000 METROS)
        let spaceRatio = Math.min(launchAlt / 60000, 1); 
        ctx.fillStyle = `rgba(11, 12, 16, ${spaceRatio})`; ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (spaceRatio > 0.3) {
            ctx.save(); ctx.globalAlpha = (spaceRatio - 0.3) / 0.7;
            stars.forEach(s => { ctx.fillStyle = `rgba(255,255,255,${s.alpha})`; ctx.beginPath(); ctx.arc(s.x + canvas.width/2, s.y + canvas.height/2, s.radius, 0, Math.PI*2); ctx.fill(); });
            ctx.restore();
        }

        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        clouds.forEach(c => { let cy = canvas.height - (c.y - launchAlt); if (cy > -100 && cy < canvas.height + 100) { ctx.beginPath(); ctx.arc(c.x, cy, c.w/4, 0, Math.PI*2); ctx.arc(c.x+30, cy-10, c.w/3, 0, Math.PI*2); ctx.arc(c.x+60, cy, c.w/4, 0, Math.PI*2); ctx.fill(); } });

        // ==========================================================
        // CÁLCULO DOS BOOSTERS E FÍSICA AQUI
        // ==========================================================
        if (keys.ArrowLeft) launchAngle -= 0.02; 
        if (keys.ArrowRight) launchAngle += 0.02;
        
        let activeThrust = selectedEngine.thrust;
        if (hasBooster) {
            if (boosterFuel > 0) activeThrust += selectedBooster.thrust;
            else activeThrust *= 0.3; // Peso morto!
        }

        let thrustMag = 0;
        if (keys.ArrowUp && (launchFuel > 0 || (hasBooster && boosterFuel > 0))) { 
            thrustMag = activeThrust * 0.1; 
            
            if (hasBooster && boosterFuel > 0) {
                boosterFuel -= (selectedBooster.thrust / (9.81 * 250)) * 1000 * 0.02;
            } else {
                let ispe = selectedEngine.name.includes("Titã") ? 350 : 300;
                launchFuel -= (selectedEngine.thrust / (9.81 * ispe)) * 1000 * 0.02;
            }
        }
        
        launchVx += Math.cos(launchAngle) * thrustMag; 
        launchVy += Math.sin(launchAngle) * thrustMag; 
        launchVy += 0.05; 
        launchAlt -= launchVy; 
        launchX += launchVx;
        // ==========================================================

        if (launchAlt <= 0) { launchAlt = 0; if (launchVy > 2.0) { endMission("TERRA (Falha no Lançamento)", Math.abs(launchVy), true); return; } launchVy = 0; launchVx *= 0.9; }

        // MUDAMOS PARA 60.000 METROS
        if (launchAlt > 60000 && launchVx > 4.0) {
            if (selectedContract.id === "ORBIT" && !contractCompleted) { setContractCompleted(true); addFunds(selectedContract.reward); }
            rocket.currentFuel = launchFuel; rocket.x = EARTH_X; rocket.y = EARTH_Y - INITIAL_ORBIT_RADIUS; rocket.vx = INITIAL_ORBIT_SPEED; rocket.vy = 0; rocket.angle = 0; 
            gameState = "VOO"; UI.hudContainer.style.display = "block"; UI.uiContainer.style.display = "flex";
            UI.missionText.innerHTML = `📋 <strong>Missão:</strong> ${selectedContract.name}`; UI.missionText.style.color = "#aaaaaa";
            requestAnimationFrame(gameLoop); return; 
        }

        let groundY = canvas.height/2 + 200 + launchAlt;
        if (groundY < canvas.height) { ctx.fillStyle = "#2a2e35"; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY); ctx.fillStyle = "#555"; ctx.fillRect(canvas.width/2 - 40 - launchX, groundY - 20, 80, 20); }

        ctx.save(); ctx.translate(canvas.width/2, canvas.height/2 + 180); ctx.rotate(launchAngle + Math.PI/2);
        drawLaunchRocket(thrustMag); ctx.restore();

        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0,0, canvas.width, 70); ctx.fillStyle = "white"; ctx.font = "bold 20px 'Segoe UI'"; ctx.textAlign = "center"; ctx.fillText("LANÇAMENTO: Pressione ⬆️ para subir e deite ➡️ para Orbitar!", canvas.width/2, 30);
        ctx.textAlign = "left"; ctx.font = "18px 'Segoe UI'"; 
        
        // MUDAMOS O HUD PARA REFLETIR 60.000 METROS
        ctx.fillStyle = launchAlt > 60000 ? "#a2d149" : "white"; ctx.fillText(`Altitude: ${Math.floor(launchAlt)} / 60000 m`, 20, 110); 
        ctx.fillStyle = launchVx > 4.0 ? "#a2d149" : "white"; ctx.fillText(`Vel. Horizontal: ${launchVx.toFixed(2)} / 4.0 m/s`, 20, 140); 
        ctx.fillStyle = launchFuel > 0 ? "white" : "#e7471d"; ctx.fillText(`Combustível: ${Math.floor(launchFuel)} kg`, 20, 170);
        
        requestAnimationFrame(gameLoop); return;
    }


    if (gameState === "MENU" || (gameState === "VOO" && !isPaused)) moonAngle += MOON_ORBIT_SPEED * PHYSICS_DT * SUBSTEPS;
    currentMoonX = EARTH_X + Math.cos(moonAngle) * MOON_ORBIT_DISTANCE; currentMoonY = EARTH_Y + Math.sin(moonAngle) * MOON_ORBIT_DISTANCE;

    ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2); 
    let targetX = EARTH_X; let targetY = EARTH_Y;
    if (cameraTarget === "ROCKET") { targetX = rocket.x; targetY = rocket.y; } 
    if (cameraTarget === "MOON") { targetX = currentMoonX; targetY = currentMoonY; }
    
    ctx.save(); ctx.translate(-targetX * 0.02, -targetY * 0.02); 
    stars.forEach(star => { ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`; ctx.beginPath(); ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2); ctx.fill(); });
    ctx.restore();

    ctx.scale(cameraZoom, cameraZoom); ctx.translate(-targetX, -targetY);

    if (gameState === "VOO") {
        let mVx = -Math.sin(moonAngle) * MOON_ORBIT_DISTANCE * MOON_ORBIT_SPEED; let mVy = Math.cos(moonAngle) * MOON_ORBIT_DISTANCE * MOON_ORBIT_SPEED; let displaySpeed = 0;
        if (cameraTarget === "MOON") { displaySpeed = Math.sqrt((rocket.vx - mVx)**2 + (rocket.vy - mVy)**2); UI.speedText.innerHTML = `🛰️ <strong>Vel. Relativa (Lua):</strong> <span style="color:${displaySpeed < 2.0 ? '#a2d149' : '#e7471d'}">${displaySpeed.toFixed(2)} m/s</span>`; } 
        else { displaySpeed = Math.sqrt(rocket.vx**2 + rocket.vy**2); UI.speedText.innerHTML = `🛰️ <strong>Velocidade (Terra):</strong> ${displaySpeed.toFixed(2)} m/s`; }
        
        // ==========================================
        // STATUS DO BOOSTER AQUI!
        // ==========================================
        UI.boosterText.innerHTML = hasBooster ? `🚀 <strong>Estágio 1:</strong> <span style="color:${boosterFuel > 0 ? '#f6a84b' : '#e7471d'}">${Math.floor(boosterFuel)} kg</span> (Aperte ESPAÇO para ejetar!)` : "";
        UI.boosterText.style.display = hasBooster ? "block" : "none";
        // ==========================================

        UI.fundsText.innerHTML = `💰 <strong>Caixa:</strong> R$ ${agencyFunds.toLocaleString()}`; UI.fuelText.innerHTML = `⛽ <strong>Combustível:</strong> <span style="color:${rocket.currentFuel < 200 ? "#e7471d" : "#a2d149"}">${Math.floor(rocket.currentFuel)}</span> / ${rocket.maxFuel} kg`;
        if (isPaused) UI.planText.innerHTML = `⚙️ <strong>Planejado (ΔV):</strong> ${plannedDeltaV.toFixed(2)} m/s<br>⏱️ <strong>Tempo:</strong> +${Math.floor(maneuverTime / 10)}s`;

        drawTrajectory();

        for (let i = 0; i < SUBSTEPS; i++) {
            applyEngine(PHYSICS_DT);
            if (!isPaused) {
                const result = applyPhysics(rocket.x, rocket.y, rocket.vx, rocket.vy, currentMoonX, currentMoonY, PHYSICS_DT);
                rocket.x = result.x; rocket.y = result.y; rocket.vx = result.vx; rocket.vy = result.vy;
                const speed = Math.sqrt(rocket.vx**2 + rocket.vy**2); if (speed > 0.05) rocket.angle = Math.atan2(rocket.vy, rocket.vx);

                if (!contractCompleted) {
                    const distEarth = Math.sqrt((rocket.x - EARTH_X)**2 + (rocket.y - EARTH_Y)**2); const distMoon = Math.sqrt((rocket.x - currentMoonX)**2 + (rocket.y - currentMoonY)**2);
                    if (selectedContract.id === "ORBIT" && distEarth > 400) { setContractCompleted(true); addFunds(selectedContract.reward); }
                    if (selectedContract.id === "FLYBY" && distMoon < MOON_SOI) { setContractCompleted(true); addFunds(selectedContract.reward); }
                }

                const distE = Math.sqrt((rocket.x - EARTH_X)**2 + (rocket.y - EARTH_Y)**2);
                if (distE <= EARTH_RADIUS) { endMission("TERRA", speed); break; } 
                
                const distM = Math.sqrt((rocket.x - currentMoonX)**2 + (rocket.y - currentMoonY)**2);
                if (distM <= MOON_RADIUS + 5) { startLandingMinigame(); break; }
            }
        }
        
        ctx.save(); ctx.translate(rocket.x, rocket.y); ctx.rotate(rocket.angle);
        if ((isBurningPrograde || isBurningRetrograde) && rocket.currentFuel > 0 && !isPaused) { ctx.fillStyle = isBurningPrograde ? "#a2d149" : "#e7471d"; ctx.beginPath(); if (isBurningPrograde) { ctx.moveTo(-6, -3); ctx.lineTo(-15, 0); ctx.lineTo(-6, 3); } else { ctx.moveTo(6, -3); ctx.lineTo(15, 0); ctx.lineTo(6, 3); } ctx.fill(); }
        ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, -4); ctx.lineTo(-4, 0); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill(); ctx.restore();
    } 

    ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.beginPath(); ctx.arc(EARTH_X, EARTH_Y, MOON_ORBIT_DISTANCE, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(100,100,255,0.1)"; ctx.beginPath(); ctx.arc(currentMoonX, currentMoonY, MOON_SOI, 0, Math.PI * 2); ctx.stroke();
    
    ctx.save(); ctx.shadowBlur = 20; ctx.shadowColor = "#4b7cf6"; const earthGradient = ctx.createRadialGradient(EARTH_X - EARTH_RADIUS*0.3, EARTH_Y - EARTH_RADIUS*0.3, EARTH_RADIUS*0.1, EARTH_X, EARTH_Y, EARTH_RADIUS);
    earthGradient.addColorStop(0, "#85aaff"); earthGradient.addColorStop(0.5, "#4b7cf6"); earthGradient.addColorStop(1, "#0d1b3e"); ctx.fillStyle = earthGradient; ctx.beginPath(); ctx.arc(EARTH_X, EARTH_Y, EARTH_RADIUS, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = "rgba(133, 170, 255, 0.15)"; ctx.beginPath(); ctx.arc(EARTH_X, EARTH_Y, EARTH_RADIUS + ATMOSPHERE_HEIGHT, 0, Math.PI * 2); ctx.fill();

    ctx.save(); const moonGradient = ctx.createRadialGradient(currentMoonX - MOON_RADIUS*0.3, currentMoonY - MOON_RADIUS*0.3, MOON_RADIUS*0.1, currentMoonX, currentMoonY, MOON_RADIUS);
    moonGradient.addColorStop(0, "#ffffff"); moonGradient.addColorStop(0.4, "#aaaaaa"); moonGradient.addColorStop(1, "#222222"); ctx.fillStyle = moonGradient; ctx.beginPath(); ctx.arc(currentMoonX, currentMoonY, MOON_RADIUS, 0, Math.PI * 2); ctx.fill(); ctx.restore();

    ctx.restore(); requestAnimationFrame(gameLoop);
}
gameLoop();