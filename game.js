// game.js
import { 
    agencyFunds, catalog, contracts, 
    selectedEngine, selectedTank, selectedFuel, selectedContract, contractCompleted, 
    addFunds, setContractCompleted, setSelectedParts 
} from './data.js';

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

// ============================================================
// CARREGAMENTO DE IMAGENS DE FUNDO
// ============================================================
const bgLaunch = new Image();
bgLaunch.src = 'images/atmosferaterra1.png';

const bgLanding = new Image();
bgLanding.src = 'images/luapouso1.png';

// ============================================================
// VARIÁVEIS GLOBAIS DE CONTROLE RESTAURADAS
// ============================================================
let gameState = "MENU"; // "MENU", "MONTAGEM", "LAUNCH", "VOO", "LANDING", "RESULT"
let launchAlt = 0, launchX = 0, launchVx = 0, launchVy = 0, launchAngle = 0, launchFuel = 0;
let isBurningPrograde = false, isBurningRetrograde = false, isMovingNodeFwd = false, isMovingNodeBwd = false;
let cameraZoom = 1.0, cameraTarget = "EARTH", isPaused = false, plannedDeltaV = 0, maneuverTime = 0; 

// ============================================================
// SISTEMA DE PARTÍCULAS E AMBIENTE
// ============================================================
const stars = [];
for (let i = 0; i < 800; i++) {
    stars.push({ x: (Math.random() - 0.5) * 8000, y: (Math.random() - 0.5) * 8000, radius: Math.random() * 2.0 + 0.5, alpha: Math.random() * 0.7 + 0.3 });
}

const clouds = [];
for(let i=0; i<30; i++) {
    clouds.push({ x: Math.random() * 2000 - 500, y: Math.random() * 3500, w: 100 + Math.random() * 150 });
}

const keys = { ArrowUp: false, ArrowLeft: false, ArrowRight: false };
window.addEventListener('keydown', (e) => { if (keys.hasOwnProperty(e.code)) keys[e.code] = true; });
window.addEventListener('keyup', (e) => { if (keys.hasOwnProperty(e.code)) keys[e.code] = false; });

// ============================================================
// FÍSICA E CONSTANTES
// ============================================================
const PHYSICS_DT = 0.02; const G = 0.5;
const EARTH_MASS = 8000; const EARTH_RADIUS = 40; const ATMOSPHERE_HEIGHT = 15; const EARTH_X = 0; const EARTH_Y = 0;
const MOON_MASS = 150; const MOON_RADIUS = 15; const MOON_ORBIT_DISTANCE = 1200; 
const MOON_ORBIT_SPEED = Math.sqrt((G * EARTH_MASS) / Math.pow(MOON_ORBIT_DISTANCE, 3)); 
const MOON_SOI = 250; 

let moonAngle = 0; let currentMoonX = 0; let currentMoonY = 0;
const SUBSTEPS = 10;
const INITIAL_ORBIT_RADIUS = 120; const INITIAL_ORBIT_SPEED = Math.sqrt(G * EARTH_MASS / INITIAL_ORBIT_RADIUS);
let rocket = { x: 0, y: 0, vx: 0, vy: 0, maxFuel: 0, currentFuel: 0, angle: -Math.PI/2 };

// ============================================================
// INTERFACE DOM (TELAS HTML)
// ============================================================
const menuScreen = document.createElement('div');
menuScreen.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; background:rgba(11,12,16,0.8); color:white; z-index:100;";
menuScreen.innerHTML = `<h1 style="font-size: 60px; margin-bottom: 10px; color: #4b7cf6;">ORBITAL</h1><p style="font-size: 20px; margin-bottom: 40px; color: #aaaaaa;">Comandante de Missão</p><button id="btnStart" style="padding: 15px 40px; font-size: 20px; font-weight: bold; cursor: pointer; border-radius: 8px; border: none; background: #a2d149; color: white;">ENTRAR NO HANGAR</button>`;
document.body.appendChild(menuScreen);

const assemblyScreen = document.createElement('div');
assemblyScreen.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; display:none; flex-direction:column; justify-content:center; align-items:center; background:rgba(11,12,16,0.95); color:white; z-index:100;";
assemblyScreen.innerHTML = `
    <h2 style="font-size: 35px; margin-bottom: 10px;">Hangar de Montagem</h2>
    <div id="assemblyFunds" style="font-size: 22px; color: #a2d149; margin-bottom: 20px; font-weight:bold;">Caixa: R$ 100.000</div>
    <div style="background:#13161d; padding: 20px; border-radius: 10px; text-align:center; width: 80%; max-width: 700px; margin-bottom: 20px; border: 1px solid #4b7cf6;">
        <h3 style="color: #4b7cf6; margin-top:0;">📋 Quadro de Contratos</h3>
        <select id="contractSelect" style="padding: 10px; font-size: 16px; margin-top: 10px; border-radius: 5px; width: 80%; background: #0b0c10; color: white; border: 1px solid #3a4a5c;">
            ${contracts.map((c, i) => `<option value="${i}">${c.name}</option>`).join('')}
        </select>
        <p id="contractDesc" style="color:#aaaaaa; margin-top: 15px; font-size: 15px;"></p>
    </div>
    <div style="display:flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; justify-content: center;">
        <div style="background:#1c202a; padding: 15px; border-radius: 10px; text-align:center;">
            <h3>Motor</h3><select id="engineSelect" style="padding: 8px; font-size: 14px; margin-top: 5px; border-radius: 5px;">${catalog.engines.map((e, i) => `<option value="${i}">${e.name} - R$ ${e.cost}</option>`).join('')}</select>
        </div>
        <div style="background:#1c202a; padding: 15px; border-radius: 10px; text-align:center;">
            <h3>Tanque</h3><select id="tankSelect" style="padding: 8px; font-size: 14px; margin-top: 5px; border-radius: 5px;">${catalog.tanks.map((t, i) => `<option value="${i}">${t.name} - R$ ${t.cost}</option>`).join('')}</select>
        </div>
        <div style="background:#1c202a; padding: 15px; border-radius: 10px; text-align:center;">
            <h3>Combust.</h3><select id="fuelSelect" style="padding: 8px; font-size: 14px; margin-top: 5px; border-radius: 5px;">${catalog.fuels.map((f, i) => `<option value="${i}">${f.name} - R$ ${f.cost}</option>`).join('')}</select>
        </div>
    </div>
    <div id="totalCost" style="font-size: 20px; margin-bottom: 20px; color: #f6a84b; background:#1c202a; padding: 15px; border-radius: 10px;">Cálculo...</div>
    <button id="btnLaunch" style="padding: 15px 40px; font-size: 20px; font-weight: bold; cursor: pointer; border-radius: 8px; border: none; background: #e7471d; color: white;">🚀 LANÇAR FOGUETE</button>
`;
document.body.appendChild(assemblyScreen);

const hudContainer = document.createElement('div');
hudContainer.style.cssText = "position:absolute; top:20px; left:20px; color:white; font-size:16px; background:rgba(0,0,0,0.7); padding:15px; border-radius:8px; border:1px solid #3a4a5c; display:none; pointer-events:none;";
const fundsText = document.createElement('div'); const fuelText = document.createElement('div'); const speedText = document.createElement('div'); speedText.style.cssText = "color: #f6a84b; margin-top: 5px; font-weight: bold;";
const missionText = document.createElement('div'); missionText.style.cssText = "margin-top: 10px; padding-top: 10px; border-top: 1px solid #3a4a5c; color: #aaaaaa;";
const planText = document.createElement('div'); planText.style.cssText = "color: #f6a84b; margin-top: 10px; font-weight: bold; display:none;";
hudContainer.append(fundsText, fuelText, speedText, missionText, planText); document.body.appendChild(hudContainer);

const uiContainer = document.createElement('div');
uiContainer.style.cssText = "position:absolute; bottom:30px; width:100%; display:none; justify-content:center; gap:10px; flex-wrap: wrap;";
document.body.appendChild(uiContainer);

function createBtn(text, color) {
    const btn = document.createElement('button'); btn.innerText = text;
    btn.style.cssText = `padding: 15px 20px; font-size: 14px; font-weight: bold; color: #fff; background-color: ${color}; border: none; border-radius: 8px; cursor: pointer;`;
    uiContainer.appendChild(btn); return btn;
}

const btnNodePrev = createBtn("⏪ Voltar Nó", "#6c7a89"); const btnRetrograde = createBtn("🛑 Retrógrado", "#e7471d");
const btnPrograde = createBtn("🚀 Prógrado", "#a2d149"); const btnNodeNext = createBtn("Avançar Nó ⏩", "#6c7a89");
const btnPause = createBtn("⏸️ Planejar", "#3a4a5c"); const btnExecute = createBtn("✔️ Executar", "#f6a84b"); const btnFocus = createBtn("📷 Foco: Terra", "#3a4a5c");
btnNodePrev.style.display = "none"; btnNodeNext.style.display = "none"; btnExecute.style.display = "none"; 

const resultScreen = document.createElement('div');
resultScreen.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; display:none; flex-direction:column; justify-content:center; align-items:center; background:rgba(11,12,16,0.95); color:white; z-index:200; text-align:center;";
const resultTitle = document.createElement('h1'); resultTitle.style.fontSize = "50px"; resultTitle.style.marginBottom = "10px";
const resultMessage = document.createElement('p'); resultMessage.style.fontSize = "22px"; resultMessage.style.marginBottom = "40px"; resultMessage.style.whiteSpace = "pre-line";
const btnReturn = document.createElement('button'); btnReturn.innerText = "VOLTAR AO HANGAR"; btnReturn.style.cssText = "padding: 15px 40px; font-size: 20px; font-weight: bold; cursor: pointer; border-radius: 8px; border: none; background: #3a4a5c; color: white;";
resultScreen.append(resultTitle, resultMessage, btnReturn); document.body.appendChild(resultScreen);

// ============================================================
// LÓGICA DE EVENTOS DA INTERFACE
// ============================================================
document.getElementById('btnStart')?.addEventListener('click', () => { menuScreen.style.display = "none"; assemblyScreen.style.display = "flex"; updateAssemblyUI(); });
const engineSelect = document.getElementById('engineSelect'); const tankSelect = document.getElementById('tankSelect'); const fuelSelect = document.getElementById('fuelSelect'); const contractSelect = document.getElementById('contractSelect');
const totalCostDiv = document.getElementById('totalCost'); const assemblyFundsDiv = document.getElementById('assemblyFunds'); const contractDesc = document.getElementById('contractDesc');

function updateAssemblyUI() {
    setSelectedParts(
        catalog.engines[parseInt(engineSelect.value)],
        catalog.tanks[parseInt(tankSelect.value)],
        catalog.fuels[parseInt(fuelSelect.value)],
        contracts[parseInt(contractSelect.value)]
    );
    const rocketCost = selectedEngine.cost + selectedTank.cost + selectedFuel.cost; 
    const finalCost = rocketCost - selectedContract.advance; 
    if (contractDesc) contractDesc.innerHTML = `<strong>Objetivo:</strong> ${selectedContract.desc}<br><span style="color:#a2d149;">Adiantamento: R$ ${selectedContract.advance.toLocaleString()}</span> | <span style="color:#f6a84b;">Prêmio: R$ ${selectedContract.reward.toLocaleString()}</span>`;
    if (assemblyFundsDiv) assemblyFundsDiv.innerText = `Caixa: R$ ${agencyFunds.toLocaleString()}`;
    if (totalCostDiv) { totalCostDiv.innerHTML = `Custo do Foguete: R$ ${rocketCost.toLocaleString()}<br>Gasto Efetivo: <strong>R$ ${finalCost.toLocaleString()}</strong>`; totalCostDiv.style.color = finalCost > agencyFunds ? "#e7471d" : "#ffffff"; }
}

engineSelect.addEventListener('change', updateAssemblyUI); tankSelect.addEventListener('change', updateAssemblyUI); fuelSelect.addEventListener('change', updateAssemblyUI); contractSelect.addEventListener('change', updateAssemblyUI);

document.getElementById('btnLaunch')?.addEventListener('click', () => {
    const finalCost = (selectedEngine.cost + selectedTank.cost + selectedFuel.cost) - selectedContract.advance;
    if (agencyFunds >= finalCost) {
        addFunds(-finalCost); 
        launchAlt = 0; launchX = 0; launchVx = 0; launchVy = 0; launchAngle = -Math.PI / 2; launchFuel = selectedTank.fuel;
        rocket.maxFuel = selectedTank.fuel;
        setContractCompleted(false);
        assemblyScreen.style.display = "none"; 
        gameState = "LAUNCH";
    } else alert("Sem fundos suficientes!");
});

btnReturn.addEventListener('click', () => { resultScreen.style.display = "none"; assemblyScreen.style.display = "flex"; updateAssemblyUI(); gameState = "MONTAGEM"; keys.ArrowUp = false; keys.ArrowLeft = false; keys.ArrowRight = false; });

function endMission(target, impactSpeed, isMinigame = false) {
    gameState = "RESULT"; hudContainer.style.display = "none"; uiContainer.style.display = "none"; resultScreen.style.display = "flex";
    isBurningPrograde = false; isBurningRetrograde = false; isPaused = false;
    let limit = isMinigame ? 2.5 : 2.0;

    if (impactSpeed <= limit) {
        resultTitle.innerText = "POUSO PERFEITO! 🏆"; resultTitle.style.color = "#a2d149";
        if (target.includes("LUA") && selectedContract.id === "LAND" && !contractCompleted) {
            setContractCompleted(true);
            addFunds(selectedContract.reward);
        }
        let recov = target.includes("LUA") ? 0 : 15000; if(recov > 0) addFunds(recov);
        resultMessage.innerHTML = `Aeronave intacta em: ${target} a ${impactSpeed.toFixed(2)} m/s.<br>`;
        if (recov > 0) resultMessage.innerHTML += `Peças Recuperadas: +R$ ${recov.toLocaleString()}<br>`;
        if (contractCompleted) resultMessage.innerHTML += `<br><span style="color:#a2d149;">Contrato Cumprido: +R$ ${selectedContract.reward.toLocaleString()}</span>`;
    } else {
        resultTitle.innerText = "Missão Fracassada! 💥"; resultTitle.style.color = "#e7471d";
        resultMessage.innerText = `Você bateu a ${impactSpeed.toFixed(2)} m/s.\nO limite de segurança era ${limit.toFixed(2)} m/s.`;
    }
}

btnPause.addEventListener('click', () => {
    isPaused = !isPaused;
    if (isPaused) { btnPause.innerText = "▶️ Retomar"; btnPause.style.backgroundColor = "#4b7cf6"; btnExecute.style.display = "block"; btnNodePrev.style.display = "block"; btnNodeNext.style.display = "block"; planText.style.display = "block"; plannedDeltaV = 0; maneuverTime = 0; } 
    else { btnPause.innerText = "⏸️ Planejar"; btnPause.style.backgroundColor = "#3a4a5c"; btnExecute.style.display = "none"; btnNodePrev.style.display = "none"; btnNodeNext.style.display = "none"; planText.style.display = "none"; plannedDeltaV = 0; maneuverTime = 0; }
});

btnExecute.addEventListener('click', () => {
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
        btnPause.click(); 
    }
});

const startEv = (flagName) => (e) => { if (e) e.preventDefault(); eval(`${flagName} = true`); }
const stopEv = (flagName) => (e) => { if (e) e.preventDefault(); eval(`${flagName} = false`); }
btnPrograde.addEventListener('mousedown', startEv('isBurningPrograde')); btnPrograde.addEventListener('mouseup', stopEv('isBurningPrograde')); btnPrograde.addEventListener('mouseleave', stopEv('isBurningPrograde'));
btnRetrograde.addEventListener('mousedown', startEv('isBurningRetrograde')); btnRetrograde.addEventListener('mouseup', stopEv('isBurningRetrograde')); btnRetrograde.addEventListener('mouseleave', stopEv('isBurningRetrograde'));
btnNodeNext.addEventListener('mousedown', startEv('isMovingNodeFwd')); btnNodeNext.addEventListener('mouseup', stopEv('isMovingNodeFwd')); btnNodeNext.addEventListener('mouseleave', stopEv('isMovingNodeFwd'));
btnNodePrev.addEventListener('mousedown', startEv('isMovingNodeBwd')); btnNodePrev.addEventListener('mouseup', stopEv('isMovingNodeBwd')); btnNodePrev.addEventListener('mouseleave', stopEv('isMovingNodeBwd'));
window.addEventListener('wheel', (e) => { if(gameState !== "VOO") return; cameraZoom += e.deltaY * -0.001; cameraZoom = Math.min(Math.max(0.1, cameraZoom), 4.0); });
btnFocus.addEventListener('click', () => {
    if (cameraTarget === "EARTH") { cameraTarget = "ROCKET"; btnFocus.innerText = "📷 Foco: Foguete"; }
    else if (cameraTarget === "ROCKET") { cameraTarget = "MOON"; btnFocus.innerText = "📷 Foco: Lua"; }
    else { cameraTarget = "EARTH"; btnFocus.innerText = "📷 Foco: Terra"; }
});

// ============================================================
// FÍSICA E CÁLCULOS ORBITAIS
// ============================================================
function applyPhysics(x, y, vx, vy, moonX, moonY, dt) {
    let ax = 0, ay = 0;
    const dxE = EARTH_X - x, dyE = EARTH_Y - y; const distSqE = dxE * dxE + dyE * dyE; const distE = Math.sqrt(distSqE);
    if (distE > EARTH_RADIUS) { ax += (G * EARTH_MASS / distSqE) * (dxE / distE); ay += (G * EARTH_MASS / distSqE) * (dyE / distE); }
    if (distE > EARTH_RADIUS && distE < EARTH_RADIUS + ATMOSPHERE_HEIGHT) {
        const altitude = distE - EARTH_RADIUS; const rho = 1.225 * Math.exp(-altitude / 50); const vSq = vx * vx + vy * vy; const v = Math.sqrt(vSq);
        if (v > 0) { const drag = 0.5 * rho * vSq * 0.25 * 5; ax -= (vx / v) * drag; ay -= (vy / v) * drag; }
    }
    const dxM = moonX - x, dyM = moonY - y; const distSqM = dxM * dxM + dyM * dyM; const distM = Math.sqrt(distSqM);
    if (distM > MOON_RADIUS) { ax += (G * MOON_MASS / distSqM) * (dxM / distM); ay += (G * MOON_MASS / distSqM) * (dyM / distM); }
    const newVx = vx + ax * dt; const newVy = vy + ay * dt;
    return { x: x + newVx * dt, y: y + newVy * dt, vx: newVx, vy: newVy };
}

function applyEngine(dt) {
    if (rocket.currentFuel <= 0) return;
    const ispe = selectedEngine.name.includes("Titã") ? 350 : 300; const massFlow = selectedEngine.thrust / (9.81 * ispe); 
    if (isPaused) {
        if (isBurningPrograde) plannedDeltaV += selectedEngine.thrust * dt * 0.05; if (isBurningRetrograde) plannedDeltaV -= selectedEngine.thrust * dt * 0.05;
        if (isMovingNodeFwd) maneuverTime = Math.min(4900, maneuverTime + 3.0); if (isMovingNodeBwd) maneuverTime = Math.max(0, maneuverTime - 3.0);
        return; 
    }
    if (!isBurningPrograde && !isBurningRetrograde) return;
    const speed = Math.sqrt(rocket.vx**2 + rocket.vy**2); if (speed <= 0) return;
    const dirX = rocket.vx / speed, dirY = rocket.vy / speed;
    if (isBurningPrograde) { rocket.vx += dirX * selectedEngine.thrust * dt; rocket.vy += dirY * selectedEngine.thrust * dt; }
    if (isBurningRetrograde) { rocket.vx -= dirX * selectedEngine.thrust * dt; rocket.vy -= dirY * selectedEngine.thrust * dt; }
    rocket.currentFuel -= massFlow * selectedEngine.thrust * dt * 1000; if (rocket.currentFuel < 0) rocket.currentFuel = 0;
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
// RENDERIZADORES DOS MINIJOGOS (GRÁFICOS MELHORADOS)
// ============================================================
let lander = { x: 0, y: 0, vx: 0, vy: 0, angle: -Math.PI/2, fuel: 0 };
let landingTerrain = []; let landingPad = { x: 0, w: 0, y: 0 };

function startLandingMinigame() {
    gameState = "LANDING"; uiContainer.style.display = "none"; 
    lander = { x: canvas.width / 2, y: 50, vx: (Math.random() - 0.5) * 4, vy: 1.0, angle: -Math.PI/2, fuel: rocket.currentFuel };
    landingTerrain = []; const segments = 20; const segmentWidth = canvas.width / segments; landingPad.w = segmentWidth * 2;
    const padIndex = Math.floor(Math.random() * (segments - 6)) + 3; 
    for (let i = 0; i <= segments; i++) {
        if (i >= padIndex && i <= padIndex + 2) { landingTerrain.push({ x: i * segmentWidth, y: canvas.height - 80 }); if (i === padIndex) landingPad.x = i * segmentWidth; landingPad.y = canvas.height - 80; } 
        else { landingTerrain.push({ x: i * segmentWidth, y: canvas.height - 40 - Math.random() * 200 }); }
    }
}

function drawLaunchRocket(thrustMag) {
    ctx.fillStyle = "#cccccc"; ctx.fillRect(-8, -40, 16, 60); 
    ctx.beginPath(); ctx.moveTo(-8, -40); ctx.lineTo(0, -60); ctx.lineTo(8, -40); ctx.fill(); 
    ctx.fillStyle = "#888888";
    ctx.fillRect(-14, -10, 6, 30); ctx.beginPath(); ctx.moveTo(-14, -10); ctx.lineTo(-11, -20); ctx.lineTo(-8, -10); ctx.fill(); 
    ctx.fillRect(8, -10, 6, 30); ctx.beginPath(); ctx.moveTo(8, -10); ctx.lineTo(11, -20); ctx.lineTo(14, -10); ctx.fill(); 
    if (thrustMag > 0) { 
        ctx.fillStyle = "#f6a84b"; ctx.beginPath(); ctx.moveTo(-10, 20); ctx.lineTo(0, 50 + Math.random()*20); ctx.lineTo(10, 20); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.moveTo(-5, 20); ctx.lineTo(0, 30 + Math.random()*10); ctx.lineTo(5, 20); ctx.fill();
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
        if (bgLaunch.complete) {
            ctx.drawImage(bgLaunch, 0, 0, canvas.width, canvas.height);
        }
        
        let spaceRatio = Math.min(launchAlt / 4000, 1); 
        ctx.fillStyle = `rgba(11, 12, 16, ${spaceRatio})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (spaceRatio > 0.3) {
            ctx.save(); ctx.globalAlpha = (spaceRatio - 0.3) / 0.7;
            stars.forEach(s => { ctx.fillStyle = `rgba(255,255,255,${s.alpha})`; ctx.beginPath(); ctx.arc(s.x + canvas.width/2, s.y + canvas.height/2, s.radius, 0, Math.PI*2); ctx.fill(); });
            ctx.restore();
        }

        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        clouds.forEach(c => {
            let cy = canvas.height - (c.y - launchAlt);
            if (cy > -100 && cy < canvas.height + 100) { ctx.beginPath(); ctx.arc(c.x, cy, c.w/4, 0, Math.PI*2); ctx.arc(c.x+30, cy-10, c.w/3, 0, Math.PI*2); ctx.arc(c.x+60, cy, c.w/4, 0, Math.PI*2); ctx.fill(); }
        });

        if (keys.ArrowLeft) launchAngle -= 0.02; if (keys.ArrowRight) launchAngle += 0.02;
        let ispe = selectedEngine.name.includes("Titã") ? 350 : 300; let thrustMag = 0;
        if (keys.ArrowUp && launchFuel > 0) { thrustMag = selectedEngine.thrust * 0.1; launchFuel -= (selectedEngine.thrust / (9.81 * ispe)) * 1000 * 0.02; }
        launchVx += Math.cos(launchAngle) * thrustMag; launchVy += Math.sin(launchAngle) * thrustMag; launchVy += 0.05; 
        launchAlt -= launchVy; launchX += launchVx;

        if (launchAlt <= 0) { launchAlt = 0; if (launchVy > 2.0) { endMission("TERRA (Falha no Lançamento)", Math.abs(launchVy), true); return; } launchVy = 0; launchVx *= 0.9; }

        if (launchAlt > 4000 && launchVx > 4.0) {
            if (selectedContract.id === "ORBIT" && !contractCompleted) {
                setContractCompleted(true);
                addFunds(selectedContract.reward);
            }
            rocket.currentFuel = launchFuel; rocket.x = EARTH_X; rocket.y = EARTH_Y - INITIAL_ORBIT_RADIUS; rocket.vx = INITIAL_ORBIT_SPEED; rocket.vy = 0; rocket.angle = 0; 
            gameState = "VOO"; hudContainer.style.display = "block"; uiContainer.style.display = "flex";
            missionText.innerHTML = `📋 <strong>Missão:</strong> ${selectedContract.name}`; missionText.style.color = "#aaaaaa";
            requestAnimationFrame(gameLoop); return; 
        }

        let groundY = canvas.height/2 + 200 + launchAlt;
        if (groundY < canvas.height) {
            ctx.fillStyle = "#2a2e35"; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.fillStyle = "#555"; ctx.fillRect(canvas.width/2 - 40 - launchX, groundY - 20, 80, 20); 
        }

        ctx.save(); ctx.translate(canvas.width/2, canvas.height/2 + 180); ctx.rotate(launchAngle + Math.PI/2);
        drawLaunchRocket(thrustMag); ctx.restore();

        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0,0, canvas.width, 70); ctx.fillStyle = "white"; ctx.font = "bold 20px 'Segoe UI'"; ctx.textAlign = "center";
        ctx.fillText("LANÇAMENTO: Pressione ⬆️ para subir e deite ➡️ para Orbitar!", canvas.width/2, 30);
        ctx.textAlign = "left"; ctx.font = "18px 'Segoe UI'";
        ctx.fillStyle = launchAlt > 4000 ? "#a2d149" : "white"; ctx.fillText(`Altitude: ${Math.floor(launchAlt)} / 4000 m`, 20, 110);
        ctx.fillStyle = launchVx > 4.0 ? "#a2d149" : "white"; ctx.fillText(`Vel. Horizontal: ${launchVx.toFixed(2)} / 4.0 m/s`, 20, 140);
        ctx.fillStyle = launchFuel > 0 ? "white" : "#e7471d"; ctx.fillText(`Combustível: ${Math.floor(launchFuel)} kg`, 20, 170);
        
        requestAnimationFrame(gameLoop); return;
    }

    // =======================================================
    // FASE 3: MINIJOGO DE POUSO LUNAR
    // =======================================================
    if (gameState === "LANDING") {
        if (bgLanding.complete) {
            ctx.drawImage(bgLanding, 0, 0, canvas.width, canvas.height);
        }

        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0,0, canvas.width, 60); ctx.fillStyle = "white"; ctx.font = "bold 20px Arial"; ctx.textAlign = "center"; ctx.fillText("USE AS SETAS DO TECLADO (⬅️ ⬆️ ➡️) PARA POUSAR NA BASE!", canvas.width/2, 35);
        ctx.textAlign = "left"; ctx.font = "18px Arial"; ctx.fillStyle = Math.abs(lander.vy) > 2.5 ? "#e7471d" : "#a2d149"; ctx.fillText(`Queda Vertical: ${lander.vy.toFixed(2)} m/s`, 20, 100); ctx.fillStyle = Math.abs(lander.vx) > 1.0 ? "#e7471d" : "#a2d149"; ctx.fillText(`Mov. Lateral: ${lander.vx.toFixed(2)} m/s`, 20, 130); ctx.fillStyle = "white"; ctx.fillText(`Combustível: ${Math.floor(lander.fuel)} kg`, 20, 160);

        if (keys.ArrowLeft) lander.angle -= 0.05; if (keys.ArrowRight) lander.angle += 0.05;
        let isThrusting = false;
        if (keys.ArrowUp && lander.fuel > 0) { lander.vx += Math.cos(lander.angle) * 0.15; lander.vy += Math.sin(lander.angle) * 0.15; lander.fuel -= 1.0; isThrusting = true; }
        lander.vy += 0.05; lander.x += lander.vx; lander.y += lander.vy;
        if (lander.x < 0) lander.x = canvas.width; if (lander.x > canvas.width) lander.x = 0;

        ctx.fillStyle = "#222222"; ctx.beginPath(); ctx.moveTo(landingTerrain[0].x, canvas.height);
        for(let i=0; i<landingTerrain.length; i++) ctx.lineTo(landingTerrain[i].x, landingTerrain[i].y);
        ctx.lineTo(landingTerrain[landingTerrain.length-1].x, canvas.height); ctx.fill();

        ctx.strokeStyle = "#444444"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(landingTerrain[0].x, landingTerrain[0].y);
        for(let i=1; i<landingTerrain.length; i++) ctx.lineTo(landingTerrain[i].x, landingTerrain[i].y); ctx.stroke();
        
        ctx.fillStyle = "rgba(162, 209, 73, 0.3)"; ctx.fillRect(landingPad.x, landingPad.y, landingPad.w, canvas.height); ctx.strokeStyle = "#a2d149"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(landingPad.x, landingPad.y); ctx.lineTo(landingPad.x + landingPad.w, landingPad.y); ctx.stroke();

        let segmentIndex = Math.floor((lander.x / canvas.width) * (landingTerrain.length - 1)); let p1 = landingTerrain[segmentIndex]; let p2 = landingTerrain[segmentIndex+1];
        if (p1 && p2) {
            let t = (lander.x - p1.x) / (p2.x - p1.x); let groundY = p1.y + t * (p2.y - p1.y);
            if (lander.y + 15 >= groundY) { 
                let isUpright = Math.abs(lander.angle - (-Math.PI/2)) < 0.3; let onPad = lander.x > landingPad.x && lander.x < landingPad.x + landingPad.w; let impactSpeed = Math.abs(lander.vy) + Math.abs(lander.vx);
                if (onPad && isUpright && Math.abs(lander.vy) <= 2.5 && Math.abs(lander.vx) <= 1.0) { endMission("LUA (Pouso Manual)", impactSpeed, true); } 
                else { endMission("LUA (Destruído na Superfície)", Math.max(impactSpeed, 5.0), true); }
            }
        }

        ctx.save(); ctx.translate(lander.x, lander.y); ctx.rotate(lander.angle + Math.PI/2); 
        drawLanderModule(isThrusting, keys.ArrowLeft && lander.fuel > 0, keys.ArrowRight && lander.fuel > 0);
        ctx.restore();
        
        requestAnimationFrame(gameLoop); return; 
    }

    // =======================================================
    // FASE 2: TELA DE VOO ORBITAL
    // =======================================================
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
        if (cameraTarget === "MOON") { displaySpeed = Math.sqrt((rocket.vx - mVx)**2 + (rocket.vy - mVy)**2); speedText.innerHTML = `🛰️ <strong>Vel. Relativa (Lua):</strong> <span style="color:${displaySpeed < 2.0 ? '#a2d149' : '#e7471d'}">${displaySpeed.toFixed(2)} m/s</span>`; } 
        else { displaySpeed = Math.sqrt(rocket.vx**2 + rocket.vy**2); speedText.innerHTML = `🛰️ <strong>Velocidade (Terra):</strong> ${displaySpeed.toFixed(2)} m/s`; }
        fundsText.innerHTML = `💰 <strong>Caixa:</strong> R$ ${agencyFunds.toLocaleString()}`; fuelText.innerHTML = `⛽ <strong>Combustível:</strong> <span style="color:${rocket.currentFuel < 200 ? "#e7471d" : "#a2d149"}">${Math.floor(rocket.currentFuel)}</span> / ${rocket.maxFuel} kg`;
        if (isPaused) planText.innerHTML = `⚙️ <strong>Planejado (ΔV):</strong> ${plannedDeltaV.toFixed(2)} m/s<br>⏱️ <strong>Tempo:</strong> +${Math.floor(maneuverTime / 10)}s`;
        
        drawTrajectory();

        for (let i = 0; i < SUBSTEPS; i++) {
            applyEngine(PHYSICS_DT);
            if (!isPaused) {
                const result = applyPhysics(rocket.x, rocket.y, rocket.vx, rocket.vy, currentMoonX, currentMoonY, PHYSICS_DT);
                rocket.x = result.x; rocket.y = result.y; rocket.vx = result.vx; rocket.vy = result.vy;
                const speed = Math.sqrt(rocket.vx**2 + rocket.vy**2); if (speed > 0.05) rocket.angle = Math.atan2(rocket.vy, rocket.vx);

                if (!contractCompleted) {
                    const distEarth = Math.sqrt((rocket.x - EARTH_X)**2 + (rocket.y - EARTH_Y)**2); const distMoon = Math.sqrt((rocket.x - currentMoonX)**2 + (rocket.y - currentMoonY)**2);
                    if (selectedContract.id === "ORBIT" && distEarth > 400) {
                        setContractCompleted(true);
                        addFunds(selectedContract.reward);
                    }
                    if (selectedContract.id === "FLYBY" && distMoon < MOON_SOI) {
                        setContractCompleted(true);
                        addFunds(selectedContract.reward);
                    }
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