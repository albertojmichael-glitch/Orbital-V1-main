const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });

document.body.style.backgroundColor = "#0b0c10";
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.body.style.position = "relative";
document.body.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

// ============================================================
// ESTRELAS (STARFIELD COM PARALLAX)
// ============================================================
const stars: {x: number, y: number, radius: number, alpha: number}[] = [];
for (let i = 0; i < 800; i++) {
    stars.push({
        x: (Math.random() - 0.5) * 8000,
        y: (Math.random() - 0.5) * 8000,
        radius: Math.random() * 2.0 + 0.5, 
        alpha: Math.random() * 0.7 + 0.3
    });
}

// ============================================================
// DADOS DA AGÊNCIA, LOJA E CONTRATOS
// ============================================================
let agencyFunds = 100000; 
let gameState = "MENU"; 

const catalog = {
    engines: [
        { name: "Motor Básico", thrust: 0.10, cost: 40000 },
        { name: "Motor Titã", thrust: 0.25, cost: 120000 }
    ],
    tanks: [
        { name: "Tanque Pequeno (500kg)", fuel: 500, cost: 15000 },
        { name: "Tanque Médio (1500kg)", fuel: 1500, cost: 50000 }
    ],
    fuels: [
        { name: "Querosene (Barato)", efficiency: 1.0, cost: 5000 },
        { name: "Hidrogênio (Eficiente)", efficiency: 0.4, cost: 25000 }
    ]
};

const contracts = [
    { id: "NONE", name: "Voo de Teste (Sem Contrato)", advance: 0, reward: 0, desc: "Voo livre. A agência não pagará adiantamento." },
    { id: "ORBIT", name: "Sair da Atmosfera", advance: 20000, reward: 50000, desc: "Voe até uma altitude de 400km de distância da Terra." },
    { id: "FLYBY", name: "Sobrevoo Lunar (Fly-by)", advance: 50000, reward: 120000, desc: "Entre na esfera de influência gravitacional da Lua." },
    { id: "LAND", name: "Pouso Lunar", advance: 120000, reward: 350000, desc: "Pouse suavemente na superfície da Lua (Velocidade < 1.0 m/s)." }
];

let selectedEngine = catalog.engines[0]!;
let selectedTank = catalog.tanks[0]!;
let selectedFuel = catalog.fuels[0]!;
let selectedContract = contracts[0]!;
let contractCompleted = false;

// ============================================================
// CRIAÇÃO DAS TELAS
// ============================================================
const menuScreen = document.createElement('div');
menuScreen.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; background:rgba(11,12,16,0.8); color:white; z-index:100;";
menuScreen.innerHTML = `
    <h1 style="font-size: 60px; margin-bottom: 10px; color: #4b7cf6;">ORBITAL</h1>
    <p style="font-size: 20px; margin-bottom: 40px; color: #aaaaaa;">Modo Carreira</p>
    <button id="btnStart" style="padding: 15px 40px; font-size: 20px; font-weight: bold; cursor: pointer; border-radius: 8px; border: none; background: #a2d149; color: white;">ENTRAR NO HANGAR</button>
`;
document.body.appendChild(menuScreen);

const assemblyScreen = document.createElement('div');
assemblyScreen.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; display:none; flex-direction:column; justify-content:center; align-items:center; background:rgba(11,12,16,0.95); color:white; z-index:100;";
assemblyScreen.innerHTML = `
    <h2 style="font-size: 35px; margin-bottom: 10px;">Hangar de Montagem</h2>
    <div id="assemblyFunds" style="font-size: 22px; color: #a2d149; margin-bottom: 20px; font-weight:bold;">Caixa da Agência: R$ 100.000</div>
    
    <div style="background:#13161d; padding: 20px; border-radius: 10px; text-align:center; width: 80%; max-width: 700px; margin-bottom: 20px; border: 1px solid #4b7cf6;">
        <h3 style="color: #4b7cf6; margin-top:0;">📋 Quadro de Contratos</h3>
        <select id="contractSelect" style="padding: 10px; font-size: 16px; margin-top: 10px; border-radius: 5px; width: 80%; background: #0b0c10; color: white; border: 1px solid #3a4a5c;">
            ${contracts.map((c, i) => `<option value="${i}">${c.name}</option>`).join('')}
        </select>
        <p id="contractDesc" style="color:#aaaaaa; margin-top: 15px; font-size: 15px;"></p>
    </div>

    <div style="display:flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; justify-content: center;">
        <div style="background:#1c202a; padding: 15px; border-radius: 10px; text-align:center;">
            <h3>Motor</h3>
            <select id="engineSelect" style="padding: 8px; font-size: 14px; margin-top: 5px; border-radius: 5px;">
                ${catalog.engines.map((e, i) => `<option value="${i}">${e.name} - R$ ${e.cost}</option>`).join('')}
            </select>
        </div>
        <div style="background:#1c202a; padding: 15px; border-radius: 10px; text-align:center;">
            <h3>Tanque</h3>
            <select id="tankSelect" style="padding: 8px; font-size: 14px; margin-top: 5px; border-radius: 5px;">
                ${catalog.tanks.map((t, i) => `<option value="${i}">${t.name} - R$ ${t.cost}</option>`).join('')}
            </select>
        </div>
        <div style="background:#1c202a; padding: 15px; border-radius: 10px; text-align:center;">
            <h3>Combustível</h3>
            <select id="fuelSelect" style="padding: 8px; font-size: 14px; margin-top: 5px; border-radius: 5px;">
                ${catalog.fuels.map((f, i) => `<option value="${i}">${f.name} - R$ ${f.cost}</option>`).join('')}
            </select>
        </div>
    </div>
    
    <div id="totalCost" style="font-size: 20px; margin-bottom: 20px; color: #f6a84b; background:#1c202a; padding: 15px; border-radius: 10px;">Cálculo do Lançamento...</div>
    <button id="btnLaunch" style="padding: 15px 40px; font-size: 20px; font-weight: bold; cursor: pointer; border-radius: 8px; border: none; background: #e7471d; color: white;">🚀 LANÇAR FOGUETE</button>
`;
document.body.appendChild(assemblyScreen);

// ============================================================
// HUD DE VOO
// ============================================================
const hudContainer = document.createElement('div');
hudContainer.style.cssText = "position:absolute; top:20px; left:20px; color:white; font-size:16px; background:rgba(0,0,0,0.7); padding:15px; border-radius:8px; border:1px solid #3a4a5c; display:none;";
const fundsText = document.createElement('div');
const fuelText = document.createElement('div');
const missionText = document.createElement('div'); missionText.style.cssText = "margin-top: 10px; padding-top: 10px; border-top: 1px solid #3a4a5c; color: #aaaaaa;";
const planText = document.createElement('div'); planText.style.cssText = "color: #f6a84b; margin-top: 10px; font-weight: bold; display:none;";
hudContainer.append(fundsText, fuelText, missionText, planText);
document.body.appendChild(hudContainer);

const uiContainer = document.createElement('div');
uiContainer.style.cssText = "position:absolute; bottom:30px; width:100%; display:none; justify-content:center; gap:10px; flex-wrap: wrap;";
document.body.appendChild(uiContainer);

function createButton(text: string, color: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.innerText = text;
    btn.style.padding = "15px 20px";
    btn.style.fontSize = "14px";
    btn.style.fontWeight = "bold";
    btn.style.color = "#fff";
    btn.style.backgroundColor = color;
    btn.style.border = "none";
    btn.style.borderRadius = "8px";
    btn.style.cursor = "pointer";
    uiContainer.appendChild(btn);
    return btn;
}

const btnNodePrev = createButton("⏪ Voltar Nó", "#6c7a89");
const btnRetrograde = createButton("🛑 Retrógrado", "#e7471d");
const btnPrograde = createButton("🚀 Prógrado", "#a2d149");
const btnNodeNext = createButton("Avançar Nó ⏩", "#6c7a89");
const btnPause = createButton("⏸️ Planejar Manobra", "#3a4a5c");
const btnExecute = createButton("✔️ Executar Queima", "#f6a84b");
const btnFocus = createButton("📷 Foco: Terra", "#3a4a5c");

btnNodePrev.style.display = "none"; btnNodeNext.style.display = "none"; btnExecute.style.display = "none"; 

// ============================================================
// LÓGICA DE MENUS E CONTRATOS
// ============================================================
document.getElementById('btnStart')?.addEventListener('click', () => {
    menuScreen.style.display = "none"; assemblyScreen.style.display = "flex"; updateAssemblyUI();
});

const engineSelect = document.getElementById('engineSelect') as HTMLSelectElement;
const tankSelect = document.getElementById('tankSelect') as HTMLSelectElement;
const fuelSelect = document.getElementById('fuelSelect') as HTMLSelectElement;
const contractSelect = document.getElementById('contractSelect') as HTMLSelectElement;
const totalCostDiv = document.getElementById('totalCost');
const assemblyFundsDiv = document.getElementById('assemblyFunds');
const contractDesc = document.getElementById('contractDesc');

function updateAssemblyUI() {
    selectedEngine = catalog.engines[parseInt(engineSelect.value)]!;
    selectedTank = catalog.tanks[parseInt(tankSelect.value)]!;
    selectedFuel = catalog.fuels[parseInt(fuelSelect.value)]!;
    selectedContract = contracts[parseInt(contractSelect.value)]!;
    
    const rocketCost = selectedEngine.cost + selectedTank.cost + selectedFuel.cost;
    const finalCost = rocketCost - selectedContract.advance; 
    
    if (contractDesc) contractDesc.innerHTML = `<strong>Objetivo:</strong> ${selectedContract.desc}<br><br><span style="color:#a2d149;">Adiantamento: R$ ${selectedContract.advance.toLocaleString()}</span> | <span style="color:#f6a84b;">Prêmio: R$ ${selectedContract.reward.toLocaleString()}</span>`;
    
    if (assemblyFundsDiv) assemblyFundsDiv.innerText = `Caixa da Agência: R$ ${agencyFunds.toLocaleString()}`;
    if (totalCostDiv) {
        totalCostDiv.innerHTML = `Custo do Foguete: R$ ${rocketCost.toLocaleString()}<br>Gasto Efetivo (Com Adiantamento): <strong>R$ ${finalCost.toLocaleString()}</strong>`;
        totalCostDiv.style.color = finalCost > agencyFunds ? "#e7471d" : "#ffffff";
    }
}

engineSelect.addEventListener('change', updateAssemblyUI);
tankSelect.addEventListener('change', updateAssemblyUI);
fuelSelect.addEventListener('change', updateAssemblyUI);
contractSelect.addEventListener('change', updateAssemblyUI);

document.getElementById('btnLaunch')?.addEventListener('click', () => {
    const rocketCost = selectedEngine.cost + selectedTank.cost + selectedFuel.cost;
    const finalCost = rocketCost - selectedContract.advance;
    
    if (agencyFunds >= finalCost) {
        agencyFunds -= finalCost; 
        
        rocket.maxFuel = selectedTank.fuel; rocket.currentFuel = selectedTank.fuel;
        rocket.x = EARTH_X; rocket.y = EARTH_Y - INITIAL_ORBIT_RADIUS;
        rocket.vx = INITIAL_ORBIT_SPEED; rocket.vy = 0; rocket.angle = -Math.PI / 2; 
        
        contractCompleted = false;
        missionText.innerHTML = `📋 <strong>Missão:</strong> ${selectedContract.name}`;
        missionText.style.color = "#aaaaaa";
        
        assemblyScreen.style.display = "none"; hudContainer.style.display = "block"; uiContainer.style.display = "flex";
        gameState = "VOO";
    } else alert("A Agência não tem fundos suficientes para este lançamento!");
});

function completeContract() {
    contractCompleted = true;
    agencyFunds += selectedContract.reward;
    missionText.innerHTML = `✅ <strong>Missão Concluída!</strong> (+ R$ ${selectedContract.reward.toLocaleString()})`;
    missionText.style.color = "#a2d149";
}

// ============================================================
// SISTEMA DE PLANEJAMENTO
// ============================================================
let cameraZoom = 1.0; let cameraTarget = "EARTH"; let isPaused = false;
let plannedDeltaV = 0; let maneuverTime = 0; 

btnPause.addEventListener('click', () => {
    isPaused = !isPaused;
    if (isPaused) {
        btnPause.innerText = "▶️ Cancelar / Retomar"; btnPause.style.backgroundColor = "#4b7cf6";
        btnExecute.style.display = "block"; btnNodePrev.style.display = "block"; btnNodeNext.style.display = "block";
        planText.style.display = "block"; plannedDeltaV = 0; maneuverTime = 0; 
    } else {
        btnPause.innerText = "⏸️ Planejar Manobra"; btnPause.style.backgroundColor = "#3a4a5c";
        btnExecute.style.display = "none"; btnNodePrev.style.display = "none"; btnNodeNext.style.display = "none";
        planText.style.display = "none"; plannedDeltaV = 0; maneuverTime = 0;
    }
});

btnExecute.addEventListener('click', () => {
    if (rocket.currentFuel <= 0) return;
    const PREDICT_DT = PHYSICS_DT * 6;
    let crashed = false;

    // WARP DE TEMPO COM CHECAGEM DE COLISÃO
    for (let i = 0; i < maneuverTime; i++) {
        moonAngle += MOON_ORBIT_SPEED * PREDICT_DT;
        const simMoonX = EARTH_X + Math.cos(moonAngle) * MOON_ORBIT_DISTANCE;
        const simMoonY = EARTH_Y + Math.sin(moonAngle) * MOON_ORBIT_DISTANCE;
        const result = applyGravity(rocket.x, rocket.y, rocket.vx, rocket.vy, simMoonX, simMoonY, PREDICT_DT);
        rocket.x = result.x; rocket.y = result.y; rocket.vx = result.vx; rocket.vy = result.vy;
        
        const speed = Math.sqrt(rocket.vx**2 + rocket.vy**2);
        if (Math.sqrt((rocket.x - EARTH_X)**2 + (rocket.y - EARTH_Y)**2) <= EARTH_RADIUS) {
            endMission("TERRA", speed); crashed = true; break;
        }
        if (Math.sqrt((rocket.x - simMoonX)**2 + (rocket.y - simMoonY)**2) <= MOON_RADIUS) {
            endMission("LUA", speed); crashed = true; break;
        }
    }
    
    if (!crashed) {
        const speed = Math.sqrt(rocket.vx**2 + rocket.vy**2);
        if (speed > 0) { rocket.vx += (rocket.vx / speed) * plannedDeltaV; rocket.vy += (rocket.vy / speed) * plannedDeltaV; }
        rocket.currentFuel -= Math.abs(plannedDeltaV) * 50 * selectedFuel.efficiency;
        if (rocket.currentFuel < 0) rocket.currentFuel = 0;
        btnPause.click(); 
    }
});

let isBurningPrograde = false; let isBurningRetrograde = false; let isMovingNodeFwd = false; let isMovingNodeBwd = false;
const startEv = (flagName: string) => (e?: Event) => { if (e) e.preventDefault(); eval(`${flagName} = true`); }
const stopEv = (flagName: string) => (e?: Event) => { if (e) e.preventDefault(); eval(`${flagName} = false`); }

btnPrograde.addEventListener('mousedown', startEv('isBurningPrograde')); btnPrograde.addEventListener('mouseup', stopEv('isBurningPrograde')); btnPrograde.addEventListener('mouseleave', stopEv('isBurningPrograde'));
btnRetrograde.addEventListener('mousedown', startEv('isBurningRetrograde')); btnRetrograde.addEventListener('mouseup', stopEv('isBurningRetrograde')); btnRetrograde.addEventListener('mouseleave', stopEv('isBurningRetrograde'));
btnNodeNext.addEventListener('mousedown', startEv('isMovingNodeFwd')); btnNodeNext.addEventListener('mouseup', stopEv('isMovingNodeFwd')); btnNodeNext.addEventListener('mouseleave', stopEv('isMovingNodeFwd'));
btnNodePrev.addEventListener('mousedown', startEv('isMovingNodeBwd')); btnNodePrev.addEventListener('mouseup', stopEv('isMovingNodeBwd')); btnNodePrev.addEventListener('mouseleave', stopEv('isMovingNodeBwd'));

window.addEventListener('wheel', (e) => { if(gameState !== "VOO") return; cameraZoom += e.deltaY * -0.001; cameraZoom = Math.min(Math.max(0.2, cameraZoom), 4.0); });
btnFocus.addEventListener('click', () => {
    if (cameraTarget === "EARTH") { cameraTarget = "ROCKET"; btnFocus.innerText = "📷 Foco: Foguete"; }
    else if (cameraTarget === "ROCKET") { cameraTarget = "MOON"; btnFocus.innerText = "📷 Foco: Lua"; }
    else { cameraTarget = "EARTH"; btnFocus.innerText = "📷 Foco: Terra"; }
});

// ============================================================
// FÍSICA E FIM DE MISSÃO
// ============================================================
const PHYSICS_DT = 0.02; const G = 0.5;
const EARTH_MASS = 10000; const EARTH_RADIUS = 40; const EARTH_X = 0; const EARTH_Y = 0;
const MOON_MASS = 350; const MOON_RADIUS = 15; const MOON_ORBIT_DISTANCE = 800; const MOON_ORBIT_SPEED = 0.001; const MOON_SOI = 150; 
let moonAngle = 0; const SUBSTEPS = 10;
const INITIAL_ORBIT_RADIUS = 150; const INITIAL_ORBIT_SPEED = Math.sqrt(G * EARTH_MASS / INITIAL_ORBIT_RADIUS);
let rocket = { x: 0, y: 0, vx: 0, vy: 0, maxFuel: 0, currentFuel: 0, angle: -Math.PI/2 };

const resultScreen = document.createElement('div');
resultScreen.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; display:none; flex-direction:column; justify-content:center; align-items:center; background:rgba(11,12,16,0.95); color:white; z-index:200; text-align:center;";
const resultTitle = document.createElement('h1'); resultTitle.style.fontSize = "50px"; resultTitle.style.marginBottom = "10px";
const resultMessage = document.createElement('p'); resultMessage.style.fontSize = "22px"; resultMessage.style.marginBottom = "40px"; resultMessage.style.whiteSpace = "pre-line";
const btnReturn = document.createElement('button'); btnReturn.innerText = "VOLTAR AO HANGAR"; btnReturn.style.cssText = "padding: 15px 40px; font-size: 20px; font-weight: bold; cursor: pointer; border-radius: 8px; border: none; background: #3a4a5c; color: white;";
resultScreen.append(resultTitle, resultMessage, btnReturn); document.body.appendChild(resultScreen);

btnReturn.addEventListener('click', () => { resultScreen.style.display = "none"; assemblyScreen.style.display = "flex"; updateAssemblyUI(); gameState = "MONTAGEM"; });

const MAX_SAFE_LANDING_SPEED = 1.0;
function endMission(target: string, impactSpeed: number) {
    gameState = "RESULT"; hudContainer.style.display = "none"; uiContainer.style.display = "none"; resultScreen.style.display = "flex";
    isBurningPrograde = false; isBurningRetrograde = false; isPaused = false;
    
    if (impactSpeed <= MAX_SAFE_LANDING_SPEED) {
        resultTitle.innerText = "POUSO BEM SUCEDIDO! 🏆"; resultTitle.style.color = "#a2d149";
        
        if (target === "LUA" && selectedContract.id === "LAND" && !contractCompleted) {
            completeContract();
        }

        let recov = target === "LUA" ? 0 : 15000;
        if(recov > 0) agencyFunds += recov;

        resultMessage.innerHTML = `Pouso suave na ${target} a ${impactSpeed.toFixed(2)} m/s.<br>`;
        if (recov > 0) resultMessage.innerHTML += `Recuperação de peças: +R$ ${recov.toLocaleString()}<br>`;
        if (contractCompleted) resultMessage.innerHTML += `<br><span style="color:#a2d149;">Contrato Cumprido: +R$ ${selectedContract.reward.toLocaleString()}</span>`;
        
    } else {
        resultTitle.innerText = "FOGUETE DESTRUÍDO! 💥"; resultTitle.style.color = "#e7471d";
        resultMessage.innerText = `Colisão com a ${target} a ${impactSpeed.toFixed(2)} m/s!\nO limite era ${MAX_SAFE_LANDING_SPEED.toFixed(2)} m/s.`;
    }
}

function applyGravity(x: number, y: number, vx: number, vy: number, moonX: number, moonY: number, dt: number) {
    let ax = 0, ay = 0;
    const dxE = EARTH_X - x, dyE = EARTH_Y - y; const distSqE = dxE * dxE + dyE * dyE; const distE = Math.sqrt(distSqE);
    if (distE > EARTH_RADIUS) { ax += (G * EARTH_MASS / distSqE) * (dxE / distE); ay += (G * EARTH_MASS / distSqE) * (dyE / distE); }
    const dxM = moonX - x, dyM = moonY - y; const distSqM = dxM * dxM + dyM * dyM; const distM = Math.sqrt(distSqM);
    if (distM > MOON_RADIUS && distM < MOON_SOI) { ax += (G * MOON_MASS / distSqM) * (dxM / distM); ay += (G * MOON_MASS / distSqM) * (dyM / distM); }
    return { x: x + (vx + ax * dt) * dt, y: y + (vy + ay * dt) * dt, vx: vx + ax * dt, vy: vy + ay * dt };
}

// ============================================================
// O SEGREDO DA LINHA DE TRAJETÓRIA (COM FOCO RELATIVO NA LUA)
// ============================================================
function drawTrajectory() {
    let simX = rocket.x, simY = rocket.y, simVx = rocket.vx, simVy = rocket.vy, simMoonAngle = moonAngle;
    const PREDICT_DT = PHYSICS_DT * 6;

    const currentMoonX = EARTH_X + Math.cos(moonAngle) * MOON_ORBIT_DISTANCE;
    const currentMoonY = EARTH_Y + Math.sin(moonAngle) * MOON_ORBIT_DISTANCE;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)"; ctx.lineWidth = 1.5 / cameraZoom; ctx.beginPath(); 
    
    let startDrawX = simX, startDrawY = simY;
    if (cameraTarget === "MOON") {
        startDrawX = currentMoonX + (simX - currentMoonX);
        startDrawY = currentMoonY + (simY - currentMoonY);
    }
    ctx.moveTo(startDrawX, startDrawY);

    for (let i = 0; i < maneuverTime; i++) {
        simMoonAngle += MOON_ORBIT_SPEED * PREDICT_DT; 
        const simMoonX = EARTH_X + Math.cos(simMoonAngle) * MOON_ORBIT_DISTANCE; 
        const simMoonY = EARTH_Y + Math.sin(simMoonAngle) * MOON_ORBIT_DISTANCE;
        
        const result = applyGravity(simX, simY, simVx, simVy, simMoonX, simMoonY, PREDICT_DT); 
        simX = result.x; simY = result.y; simVx = result.vx; simVy = result.vy;
        
        if (i % 5 === 0) {
            let drawX = simX, drawY = simY;
            if (cameraTarget === "MOON") {
                drawX = currentMoonX + (simX - simMoonX);
                drawY = currentMoonY + (simY - simMoonY);
            }
            ctx.lineTo(drawX, drawY);
        }
    }
    ctx.stroke();

    if (isPaused) {
        ctx.fillStyle = "#f6a84b"; ctx.beginPath(); 
        let nodeDrawX = simX, nodeDrawY = simY;
        
        if (cameraTarget === "MOON") {
            const simMoonX = EARTH_X + Math.cos(simMoonAngle) * MOON_ORBIT_DISTANCE;
            const simMoonY = EARTH_Y + Math.sin(simMoonAngle) * MOON_ORBIT_DISTANCE;
            nodeDrawX = currentMoonX + (simX - simMoonX);
            nodeDrawY = currentMoonY + (simY - simMoonY);
        }
        
        ctx.arc(nodeDrawX, nodeDrawY, 6 / cameraZoom, 0, Math.PI * 2); ctx.fill();
        const speed = Math.sqrt(simVx**2 + simVy**2);
        if (speed > 0) { simVx += (simVx / speed) * plannedDeltaV; simVy += (simVy / speed) * plannedDeltaV; }
    }

    ctx.strokeStyle = isPaused ? "#f6a84b" : "rgba(255, 255, 255, 0.4)"; ctx.lineWidth = (isPaused ? 2.5 : 1.5) / cameraZoom; ctx.beginPath(); 
    
    let resumeDrawX = simX, resumeDrawY = simY;
    if (cameraTarget === "MOON") {
        const simMoonX = EARTH_X + Math.cos(simMoonAngle) * MOON_ORBIT_DISTANCE;
        const simMoonY = EARTH_Y + Math.sin(simMoonAngle) * MOON_ORBIT_DISTANCE;
        resumeDrawX = currentMoonX + (simX - simMoonX);
        resumeDrawY = currentMoonY + (simY - simMoonY);
    }
    ctx.moveTo(resumeDrawX, resumeDrawY);

    for (let i = 0; i < 4000 - maneuverTime; i++) {
        simMoonAngle += MOON_ORBIT_SPEED * PREDICT_DT; 
        const simMoonX = EARTH_X + Math.cos(simMoonAngle) * MOON_ORBIT_DISTANCE; 
        const simMoonY = EARTH_Y + Math.sin(simMoonAngle) * MOON_ORBIT_DISTANCE;
        
        const result = applyGravity(simX, simY, simVx, simVy, simMoonX, simMoonY, PREDICT_DT); 
        simX = result.x; simY = result.y; simVx = result.vx; simVy = result.vy;
        
        if (Math.sqrt((simX - EARTH_X)**2 + (simY - EARTH_Y)**2) <= EARTH_RADIUS) break; 
        if (Math.sqrt((simX - simMoonX)**2 + (simY - simMoonY)**2) <= MOON_RADIUS) break;
        
        if (i % 5 === 0) {
            let drawX = simX, drawY = simY;
            if (cameraTarget === "MOON") {
                drawX = currentMoonX + (simX - simMoonX);
                drawY = currentMoonY + (simY - simMoonY);
            }
            ctx.lineTo(drawX, drawY);
        }
    }
    ctx.stroke();
}

function applyEngine(dt: number) {
    if (rocket.currentFuel <= 0) return;
    if (isPaused) {
        if (isBurningPrograde) plannedDeltaV += selectedEngine.thrust * dt * 0.2; 
        if (isBurningRetrograde) plannedDeltaV -= selectedEngine.thrust * dt * 0.2;
        if (isMovingNodeFwd) maneuverTime = Math.min(3900, maneuverTime + 0.5); 
        if (isMovingNodeBwd) maneuverTime = Math.max(0, maneuverTime - 0.5);
        return; 
    }
    if (!isBurningPrograde && !isBurningRetrograde) return;
    const speed = Math.sqrt(rocket.vx**2 + rocket.vy**2); if (speed <= 0) return;
    const dirX = rocket.vx / speed, dirY = rocket.vy / speed;
    if (isBurningPrograde) { rocket.vx += dirX * selectedEngine.thrust * dt; rocket.vy += dirY * selectedEngine.thrust * dt; rocket.currentFuel -= 2.5 * selectedFuel.efficiency * dt; }
    if (isBurningRetrograde) { rocket.vx -= dirX * selectedEngine.thrust * dt; rocket.vy -= dirY * selectedEngine.thrust * dt; rocket.currentFuel -= 2.5 * selectedFuel.efficiency * dt; }
    if (rocket.currentFuel < 0) rocket.currentFuel = 0;
}

// ============================================================
// GAME LOOP PRINCIPAL
// ============================================================
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isPaused) moonAngle += MOON_ORBIT_SPEED; 
    const currentMoonX = EARTH_X + Math.cos(moonAngle) * MOON_ORBIT_DISTANCE;
    const currentMoonY = EARTH_Y + Math.sin(moonAngle) * MOON_ORBIT_DISTANCE;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2); 
    
    // EFEITO PARALLAX NAS ESTRELAS
    let targetX = EARTH_X; let targetY = EARTH_Y;
    if (cameraTarget === "ROCKET") { targetX = rocket.x; targetY = rocket.y; } 
    if (cameraTarget === "MOON") { targetX = currentMoonX; targetY = currentMoonY; }
    
    ctx.save();
    ctx.translate(-targetX * 0.02, -targetY * 0.02); 
    stars.forEach(star => { 
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`; 
        ctx.beginPath(); 
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2); 
        ctx.fill(); 
    });
    ctx.restore();

    ctx.scale(cameraZoom, cameraZoom);
    ctx.translate(-targetX, -targetY);

    if (gameState === "VOO") {
        fundsText.innerHTML = `💰 <strong>Caixa:</strong> R$ ${agencyFunds.toLocaleString()}`;
        fuelText.innerHTML = `⛽ <strong>Combustível:</strong> <span style="color:${rocket.currentFuel < 200 ? "#e7471d" : "#a2d149"}">${Math.floor(rocket.currentFuel)}</span> / ${rocket.maxFuel} kg`;
        if (isPaused) planText.innerHTML = `⚙️ <strong>Planejado (ΔV):</strong> ${plannedDeltaV.toFixed(2)} m/s<br>⏱️ <strong>Tempo:</strong> +${Math.floor(maneuverTime / 10)}s`;
        
        drawTrajectory();

        for (let i = 0; i < SUBSTEPS; i++) {
            applyEngine(PHYSICS_DT);
            if (!isPaused) {
                const result = applyGravity(rocket.x, rocket.y, rocket.vx, rocket.vy, currentMoonX, currentMoonY, PHYSICS_DT);
                rocket.x = result.x; rocket.y = result.y; rocket.vx = result.vx; rocket.vy = result.vy;
                
                const speed = Math.sqrt(rocket.vx**2 + rocket.vy**2);
                if (speed > 0.05) rocket.angle = Math.atan2(rocket.vy, rocket.vx);

                if (!contractCompleted) {
                    const distEarth = Math.sqrt((rocket.x - EARTH_X)**2 + (rocket.y - EARTH_Y)**2);
                    const distMoon = Math.sqrt((rocket.x - currentMoonX)**2 + (rocket.y - currentMoonY)**2);
                    
                    if (selectedContract.id === "ORBIT" && distEarth > 400) completeContract();
                    if (selectedContract.id === "FLYBY" && distMoon < MOON_SOI) completeContract();
                }

                const distE = Math.sqrt((rocket.x - EARTH_X)**2 + (rocket.y - EARTH_Y)**2);
                if (distE <= EARTH_RADIUS) { endMission("TERRA", speed); break; } 
                
                const distM = Math.sqrt((rocket.x - currentMoonX)**2 + (rocket.y - currentMoonY)**2);
                if (distM <= MOON_RADIUS) { endMission("LUA", speed); break; }
            }
        }
        
        
        ctx.save();
        ctx.translate(rocket.x, rocket.y); ctx.rotate(rocket.angle);
        if ((isBurningPrograde || isBurningRetrograde) && rocket.currentFuel > 0 && !isPaused) {
            ctx.fillStyle = isBurningPrograde ? "#a2d149" : "#e7471d"; ctx.beginPath();
            if (isBurningPrograde) { ctx.moveTo(-6, -3); ctx.lineTo(-15, 0); ctx.lineTo(-6, 3); } 
            else { ctx.moveTo(6, -3); ctx.lineTo(15, 0); ctx.lineTo(6, 3); }
            ctx.fill();
        }
        ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, -4); ctx.lineTo(-4, 0); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill();
        ctx.restore();
    } 

    ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.beginPath(); ctx.arc(EARTH_X, EARTH_Y, MOON_ORBIT_DISTANCE, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(100,100,255,0.1)"; ctx.beginPath(); ctx.arc(currentMoonX, currentMoonY, MOON_SOI, 0, Math.PI * 2); ctx.stroke();
    
    ctx.save(); ctx.shadowBlur = 20; ctx.shadowColor = "#4b7cf6";
    const earthGradient = ctx.createRadialGradient(EARTH_X - EARTH_RADIUS*0.3, EARTH_Y - EARTH_RADIUS*0.3, EARTH_RADIUS*0.1, EARTH_X, EARTH_Y, EARTH_RADIUS);
    earthGradient.addColorStop(0, "#85aaff"); earthGradient.addColorStop(0.5, "#4b7cf6"); earthGradient.addColorStop(1, "#0d1b3e");
    ctx.fillStyle = earthGradient; ctx.beginPath(); ctx.arc(EARTH_X, EARTH_Y, EARTH_RADIUS, 0, Math.PI * 2); ctx.fill(); ctx.restore();

    ctx.save(); const moonGradient = ctx.createRadialGradient(currentMoonX - MOON_RADIUS*0.3, currentMoonY - MOON_RADIUS*0.3, MOON_RADIUS*0.1, currentMoonX, currentMoonY, MOON_RADIUS);
    moonGradient.addColorStop(0, "#ffffff"); moonGradient.addColorStop(0.4, "#aaaaaa"); moonGradient.addColorStop(1, "#222222");
    ctx.fillStyle = moonGradient; ctx.beginPath(); ctx.arc(currentMoonX, currentMoonY, MOON_RADIUS, 0, Math.PI * 2); ctx.fill(); ctx.restore();

    ctx.restore(); requestAnimationFrame(gameLoop);
}
gameLoop();