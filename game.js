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
// DADOS DA AGÊNCIA E ESTADO DO JOGO
// ============================================================
let agencyFunds = 300000;
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
        { name: "Hidrogênio (Alta Eficiência)", efficiency: 0.4, cost: 25000 }
    ]
};
let selectedEngine = catalog.engines[0];
let selectedTank = catalog.tanks[0];
let selectedFuel = catalog.fuels[0];
// ============================================================
// CRIAÇÃO DAS TELAS
// ============================================================
const menuScreen = document.createElement('div');
menuScreen.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; background:rgba(11,12,16,0.8); color:white; z-index:100;";
menuScreen.innerHTML = `
    <h1 style="font-size: 60px; margin-bottom: 10px; color: #4b7cf6;">ORBITAL</h1>
    <p style="font-size: 20px; margin-bottom: 40px; color: #aaaaaa;">Diretor de Voo</p>
    <button id="btnStart" style="padding: 15px 40px; font-size: 20px; font-weight: bold; cursor: pointer; border-radius: 8px; border: none; background: #a2d149; color: white;">ENTRAR NO HANGAR</button>
`;
document.body.appendChild(menuScreen);
const assemblyScreen = document.createElement('div');
assemblyScreen.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; display:none; flex-direction:column; justify-content:center; align-items:center; background:rgba(11,12,16,0.9); color:white; z-index:100;";
assemblyScreen.innerHTML = `
    <h2 style="font-size: 35px; margin-bottom: 20px;">Hangar de Montagem</h2>
    <div id="assemblyFunds" style="font-size: 22px; color: #a2d149; margin-bottom: 30px; font-weight:bold;">Orçamento: R$ 300.000</div>
    
    <div style="display:flex; gap: 40px; margin-bottom: 40px;">
        <div style="background:#1c202a; padding: 20px; border-radius: 10px; text-align:center;">
            <h3>Motor</h3>
            <select id="engineSelect" style="padding: 10px; font-size: 16px; margin-top: 10px; border-radius: 5px;">
                <option value="0">${catalog.engines[0].name} - R$ ${catalog.engines[0].cost}</option>
                <option value="1">${catalog.engines[1].name} - R$ ${catalog.engines[1].cost}</option>
            </select>
        </div>
        <div style="background:#1c202a; padding: 20px; border-radius: 10px; text-align:center;">
            <h3>Tanque</h3>
            <select id="tankSelect" style="padding: 10px; font-size: 16px; margin-top: 10px; border-radius: 5px;">
                <option value="0">${catalog.tanks[0].name} - R$ ${catalog.tanks[0].cost}</option>
                <option value="1">${catalog.tanks[1].name} - R$ ${catalog.tanks[1].cost}</option>
            </select>
        </div>
        <div style="background:#1c202a; padding: 20px; border-radius: 10px; text-align:center;">
            <h3>Combustível</h3>
            <select id="fuelSelect" style="padding: 10px; font-size: 16px; margin-top: 10px; border-radius: 5px;">
                <option value="0">${catalog.fuels[0].name} - R$ ${catalog.fuels[0].cost}</option>
                <option value="1">${catalog.fuels[1].name} - R$ ${catalog.fuels[1].cost}</option>
            </select>
        </div>
    </div>
    <div id="totalCost" style="font-size: 20px; margin-bottom: 20px; color: #f6a84b;">Custo: R$ 60.000</div>
    <button id="btnLaunch" style="padding: 15px 40px; font-size: 20px; font-weight: bold; cursor: pointer; border-radius: 8px; border: none; background: #e7471d; color: white;">🚀 LANÇAR FOGUETE</button>
`;
document.body.appendChild(assemblyScreen);
// ============================================================
// HUD DE VOO E SISTEMA DE PLANEJAMENTO
// ============================================================
const hudContainer = document.createElement('div');
hudContainer.style.cssText = "position:absolute; top:20px; left:20px; color:white; font-size:18px; background:rgba(0,0,0,0.6); padding:15px; border-radius:8px; border:1px solid #3a4a5c; display:none;";
const fundsText = document.createElement('div');
const fuelText = document.createElement('div');
const planText = document.createElement('div');
planText.style.cssText = "color: #f6a84b; margin-top: 10px; font-weight: bold; display:none;";
hudContainer.append(fundsText, fuelText, planText);
document.body.appendChild(hudContainer);
const uiContainer = document.createElement('div');
uiContainer.style.cssText = "position:absolute; bottom:30px; width:100%; display:none; justify-content:center; gap:10px; flex-wrap: wrap;";
document.body.appendChild(uiContainer);
function createButton(text, color) {
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
const btnFocus = createButton("📷 Foco", "#3a4a5c");
btnNodePrev.style.display = "none";
btnNodeNext.style.display = "none";
btnExecute.style.display = "none";
// ============================================================
// LÓGICA DE MENUS
// ============================================================
document.getElementById('btnStart')?.addEventListener('click', () => {
    menuScreen.style.display = "none";
    assemblyScreen.style.display = "flex";
    updateAssemblyUI();
});
const engineSelect = document.getElementById('engineSelect');
const tankSelect = document.getElementById('tankSelect');
const fuelSelect = document.getElementById('fuelSelect');
const totalCostDiv = document.getElementById('totalCost');
const assemblyFundsDiv = document.getElementById('assemblyFunds');
function updateAssemblyUI() {
    selectedEngine = catalog.engines[parseInt(engineSelect.value)];
    selectedTank = catalog.tanks[parseInt(tankSelect.value)];
    selectedFuel = catalog.fuels[parseInt(fuelSelect.value)];
    const cost = selectedEngine.cost + selectedTank.cost + selectedFuel.cost;
    if (assemblyFundsDiv)
        assemblyFundsDiv.innerText = `Orçamento: R$ ${agencyFunds.toLocaleString()}`;
    if (totalCostDiv) {
        totalCostDiv.innerText = `Custo do Lançamento: R$ ${cost.toLocaleString()}`;
        totalCostDiv.style.color = cost > agencyFunds ? "#e7471d" : "#f6a84b";
    }
}
engineSelect.addEventListener('change', updateAssemblyUI);
tankSelect.addEventListener('change', updateAssemblyUI);
fuelSelect.addEventListener('change', updateAssemblyUI);
document.getElementById('btnLaunch')?.addEventListener('click', () => {
    const cost = selectedEngine.cost + selectedTank.cost + selectedFuel.cost;
    if (agencyFunds >= cost) {
        agencyFunds -= cost;
        rocket.maxFuel = selectedTank.fuel;
        rocket.currentFuel = selectedTank.fuel;
        rocket.x = EARTH_X;
        rocket.y = EARTH_Y - INITIAL_ORBIT_RADIUS;
        rocket.vx = INITIAL_ORBIT_SPEED;
        rocket.vy = 0;
        assemblyScreen.style.display = "none";
        hudContainer.style.display = "block";
        uiContainer.style.display = "flex";
        gameState = "VOO";
    }
    else
        alert("Sem fundos!");
});
// ============================================================
// SISTEMA DE PLANEJAMENTO (NÓ DE MANOBRA)
// ============================================================
let cameraZoom = 1.0;
let cameraTarget = "EARTH";
let isPaused = false;
// Variáveis do Nó
let plannedDeltaV = 0;
let maneuverTime = 0; // Quantos passos no futuro a manobra vai acontecer
btnPause.addEventListener('click', () => {
    isPaused = !isPaused;
    if (isPaused) {
        btnPause.innerText = "▶️ Cancelar / Retomar";
        btnPause.style.backgroundColor = "#4b7cf6";
        btnExecute.style.display = "block";
        btnNodePrev.style.display = "block";
        btnNodeNext.style.display = "block";
        planText.style.display = "block";
        plannedDeltaV = 0;
        maneuverTime = 0;
    }
    else {
        btnPause.innerText = "⏸️ Planejar Manobra";
        btnPause.style.backgroundColor = "#3a4a5c";
        btnExecute.style.display = "none";
        btnNodePrev.style.display = "none";
        btnNodeNext.style.display = "none";
        planText.style.display = "none";
        plannedDeltaV = 0;
        maneuverTime = 0;
    }
});
btnExecute.addEventListener('click', () => {
    if (rocket.currentFuel <= 0)
        return;
    // TIME WARP: Avança o jogo até o ponto do nó instantaneamente!
    const PREDICT_DT = PHYSICS_DT * 6;
    for (let i = 0; i < maneuverTime; i++) {
        moonAngle += MOON_ORBIT_SPEED * PREDICT_DT;
        const simMoonX = EARTH_X + Math.cos(moonAngle) * MOON_ORBIT_DISTANCE;
        const simMoonY = EARTH_Y + Math.sin(moonAngle) * MOON_ORBIT_DISTANCE;
        const result = applyGravity(rocket.x, rocket.y, rocket.vx, rocket.vy, simMoonX, simMoonY, PREDICT_DT);
        rocket.x = result.x;
        rocket.y = result.y;
        rocket.vx = result.vx;
        rocket.vy = result.vy;
    }
    // APLICA A QUEIMA
    const speed = Math.sqrt(rocket.vx ** 2 + rocket.vy ** 2);
    if (speed > 0) {
        rocket.vx += (rocket.vx / speed) * plannedDeltaV;
        rocket.vy += (rocket.vy / speed) * plannedDeltaV;
    }
    // Gasta Combustível
    const fuelCost = Math.abs(plannedDeltaV) * 50 * selectedFuel.efficiency;
    rocket.currentFuel -= fuelCost;
    if (rocket.currentFuel < 0)
        rocket.currentFuel = 0;
    btnPause.click(); // Despausa o jogo
});
// Controles de Segurar
let isBurningPrograde = false;
let isBurningRetrograde = false;
let isMovingNodeFwd = false;
let isMovingNodeBwd = false;
const startEv = (flagName) => (e) => { if (e)
    e.preventDefault(); eval(`${flagName} = true`); };
const stopEv = (flagName) => (e) => { if (e)
    e.preventDefault(); eval(`${flagName} = false`); };
btnPrograde.addEventListener('mousedown', startEv('isBurningPrograde'));
btnPrograde.addEventListener('mouseup', stopEv('isBurningPrograde'));
btnPrograde.addEventListener('mouseleave', stopEv('isBurningPrograde'));
btnRetrograde.addEventListener('mousedown', startEv('isBurningRetrograde'));
btnRetrograde.addEventListener('mouseup', stopEv('isBurningRetrograde'));
btnRetrograde.addEventListener('mouseleave', stopEv('isBurningRetrograde'));
btnNodeNext.addEventListener('mousedown', startEv('isMovingNodeFwd'));
btnNodeNext.addEventListener('mouseup', stopEv('isMovingNodeFwd'));
btnNodeNext.addEventListener('mouseleave', stopEv('isMovingNodeFwd'));
btnNodePrev.addEventListener('mousedown', startEv('isMovingNodeBwd'));
btnNodePrev.addEventListener('mouseup', stopEv('isMovingNodeBwd'));
btnNodePrev.addEventListener('mouseleave', stopEv('isMovingNodeBwd'));
window.addEventListener('wheel', (e) => {
    if (gameState !== "VOO")
        return;
    cameraZoom += e.deltaY * -0.001;
    cameraZoom = Math.min(Math.max(0.2, cameraZoom), 4.0);
});
btnFocus.addEventListener('click', () => {
    if (cameraTarget === "EARTH") {
        cameraTarget = "ROCKET";
        btnFocus.innerText = "📷 Foco: Foguete";
    }
    else if (cameraTarget === "ROCKET") {
        cameraTarget = "MOON";
        btnFocus.innerText = "📷 Foco: Lua";
    }
    else {
        cameraTarget = "EARTH";
        btnFocus.innerText = "📷 Foco: Terra";
    }
});
// ============================================================
// FÍSICA 
// ============================================================
const PHYSICS_DT = 0.02;
const G = 0.5;
const EARTH_MASS = 10000;
const EARTH_RADIUS = 40;
const EARTH_X = 0;
const EARTH_Y = 0;
const MOON_MASS = 350;
const MOON_RADIUS = 15;
const MOON_ORBIT_DISTANCE = 800;
const MOON_ORBIT_SPEED = 0.0001;
const MOON_SOI = 150;
let moonAngle = 0;
const SUBSTEPS = 10;
const INITIAL_ORBIT_RADIUS = 150;
const INITIAL_ORBIT_SPEED = Math.sqrt(G * EARTH_MASS / INITIAL_ORBIT_RADIUS);
let rocket = { x: 0, y: 0, vx: 0, vy: 0, maxFuel: 0, currentFuel: 0 };
const resultScreen = document.createElement('div');
resultScreen.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; display:none; flex-direction:column; justify-content:center; align-items:center; background:rgba(11,12,16,0.95); color:white; z-index:200; text-align:center;";
const resultTitle = document.createElement('h1');
resultTitle.style.fontSize = "50px";
resultTitle.style.marginBottom = "10px";
const resultMessage = document.createElement('p');
resultMessage.style.fontSize = "22px";
resultMessage.style.marginBottom = "40px";
resultMessage.style.whiteSpace = "pre-line";
const btnReturn = document.createElement('button');
btnReturn.innerText = "VOLTAR AO HANGAR";
btnReturn.style.cssText = "padding: 15px 40px; font-size: 20px; font-weight: bold; cursor: pointer; border-radius: 8px; border: none; background: #3a4a5c; color: white;";
resultScreen.append(resultTitle, resultMessage, btnReturn);
document.body.appendChild(resultScreen);
btnReturn.addEventListener('click', () => {
    resultScreen.style.display = "none";
    assemblyScreen.style.display = "flex";
    updateAssemblyUI();
    gameState = "MONTAGEM";
});
const MAX_SAFE_LANDING_SPEED = 1.0;
function endMission(target, impactSpeed) {
    gameState = "RESULT";
    hudContainer.style.display = "none";
    uiContainer.style.display = "none";
    resultScreen.style.display = "flex";
    isBurningPrograde = false;
    isBurningRetrograde = false;
    isPaused = false;
    if (impactSpeed <= MAX_SAFE_LANDING_SPEED) {
        resultTitle.innerText = "POUSO BEM SUCEDIDO! 🏆";
        resultTitle.style.color = "#a2d149";
        if (target === "LUA") {
            resultMessage.innerText = `Você pousou na Lua a ${impactSpeed.toFixed(2)} m/s.\nBônus: R$ 250.000`;
            agencyFunds += 250000;
        }
        else {
            resultMessage.innerText = `Retorno seguro à Terra a ${impactSpeed.toFixed(2)} m/s.\nRecuperação: R$ 15.000`;
            agencyFunds += 15000;
        }
    }
    else {
        resultTitle.innerText = "FOGUETE DESTRUÍDO! 💥";
        resultTitle.style.color = "#e7471d";
        resultMessage.innerText = `Colisão com a ${target} a ${impactSpeed.toFixed(2)} m/s!\nO limite era ${MAX_SAFE_LANDING_SPEED.toFixed(2)} m/s.`;
    }
}
function applyGravity(x, y, vx, vy, moonX, moonY, dt) {
    let ax = 0, ay = 0;
    const dxE = EARTH_X - x, dyE = EARTH_Y - y;
    const distSqE = dxE * dxE + dyE * dyE;
    const distE = Math.sqrt(distSqE);
    if (distE > EARTH_RADIUS) {
        ax += (G * EARTH_MASS / distSqE) * (dxE / distE);
        ay += (G * EARTH_MASS / distSqE) * (dyE / distE);
    }
    const dxM = moonX - x, dyM = moonY - y;
    const distSqM = dxM * dxM + dyM * dyM;
    const distM = Math.sqrt(distSqM);
    if (distM > MOON_RADIUS && distM < MOON_SOI) {
        ax += (G * MOON_MASS / distSqM) * (dxM / distM);
        ay += (G * MOON_MASS / distSqM) * (dyM / distM);
    }
    return { x: x + (vx + ax * dt) * dt, y: y + (vy + ay * dt) * dt, vx: vx + ax * dt, vy: vy + ay * dt };
}
function drawTrajectory() {
    let simX = rocket.x, simY = rocket.y, simVx = rocket.vx, simVy = rocket.vy, simMoonAngle = moonAngle;
    const PREDICT_DT = PHYSICS_DT * 6;
    // DESENHA A ÓRBITA ATUAL (ANTES DO NÓ)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1.5 / cameraZoom;
    ctx.beginPath();
    ctx.moveTo(simX, simY);
    for (let i = 0; i < maneuverTime; i++) {
        simMoonAngle += MOON_ORBIT_SPEED * PREDICT_DT;
        const simMoonX = EARTH_X + Math.cos(simMoonAngle) * MOON_ORBIT_DISTANCE;
        const simMoonY = EARTH_Y + Math.sin(simMoonAngle) * MOON_ORBIT_DISTANCE;
        const result = applyGravity(simX, simY, simVx, simVy, simMoonX, simMoonY, PREDICT_DT);
        simX = result.x;
        simY = result.y;
        simVx = result.vx;
        simVy = result.vy;
        if (i % 5 === 0)
            ctx.lineTo(simX, simY);
    }
    ctx.stroke();
    // DESENHA A BOLINHA DO NÓ
    if (isPaused) {
        ctx.fillStyle = "#f6a84b";
        ctx.beginPath();
        ctx.arc(simX, simY, 6 / cameraZoom, 0, Math.PI * 2);
        ctx.fill();
        // APLICA O PLANEJAMENTO NO VETOR SIMULADO
        const speed = Math.sqrt(simVx ** 2 + simVy ** 2);
        if (speed > 0) {
            simVx += (simVx / speed) * plannedDeltaV;
            simVy += (simVy / speed) * plannedDeltaV;
        }
    }
    // DESENHA A ÓRBITA PROJETADA (DEPOIS DO NÓ)
    ctx.strokeStyle = isPaused ? "#f6a84b" : "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = (isPaused ? 2.5 : 1.5) / cameraZoom;
    ctx.beginPath();
    ctx.moveTo(simX, simY);
    for (let i = 0; i < 4000 - maneuverTime; i++) {
        simMoonAngle += MOON_ORBIT_SPEED * PREDICT_DT;
        const simMoonX = EARTH_X + Math.cos(simMoonAngle) * MOON_ORBIT_DISTANCE;
        const simMoonY = EARTH_Y + Math.sin(simMoonAngle) * MOON_ORBIT_DISTANCE;
        const result = applyGravity(simX, simY, simVx, simVy, simMoonX, simMoonY, PREDICT_DT);
        simX = result.x;
        simY = result.y;
        simVx = result.vx;
        simVy = result.vy;
        if (Math.sqrt((simX - EARTH_X) ** 2 + (simY - EARTH_Y) ** 2) <= EARTH_RADIUS)
            break;
        if (Math.sqrt((simX - simMoonX) ** 2 + (simY - simMoonY) ** 2) <= MOON_RADIUS)
            break;
        if (i % 5 === 0)
            ctx.lineTo(simX, simY);
    }
    ctx.stroke();
}
function applyEngine(dt) {
    if (rocket.currentFuel <= 0)
        return;
    // SISTEMA DE NÓ DE MANOBRA (PAUSADO)
    if (isPaused) {
        // Reduzi o multiplicador de 0.8 para 0.2 para o Delta-V mudar mais devagar
        if (isBurningPrograde)
            plannedDeltaV += selectedEngine.thrust * dt * 0.2;
        if (isBurningRetrograde)
            plannedDeltaV -= selectedEngine.thrust * dt * 0.2;
        // Reduzi o pulo do nó de 15 para 2 (A bolinha vai deslizar suavemente agora!)
        if (isMovingNodeFwd)
            maneuverTime = Math.min(3900, maneuverTime + 2);
        if (isMovingNodeBwd)
            maneuverTime = Math.max(0, maneuverTime - 2);
        return;
    }
    // CONTROLE MANUAL ARCADE (TEMPO REAL)
    if (!isBurningPrograde && !isBurningRetrograde)
        return;
    const speed = Math.sqrt(rocket.vx ** 2 + rocket.vy ** 2);
    if (speed <= 0)
        return;
    const dirX = rocket.vx / speed, dirY = rocket.vy / speed;
    if (isBurningPrograde) {
        rocket.vx += dirX * selectedEngine.thrust * dt;
        rocket.vy += dirY * selectedEngine.thrust * dt;
        rocket.currentFuel -= 2.5 * selectedFuel.efficiency * dt;
    }
    if (isBurningRetrograde) {
        rocket.vx -= dirX * selectedEngine.thrust * dt;
        rocket.vy -= dirY * selectedEngine.thrust * dt;
        rocket.currentFuel -= 2.5 * selectedFuel.efficiency * dt;
    }
    if (rocket.currentFuel < 0)
        rocket.currentFuel = 0;
}
// ============================================================
// GAME LOOP PRINCIPAL
// ============================================================
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!isPaused)
        moonAngle += MOON_ORBIT_SPEED;
    const currentMoonX = EARTH_X + Math.cos(moonAngle) * MOON_ORBIT_DISTANCE;
    const currentMoonY = EARTH_Y + Math.sin(moonAngle) * MOON_ORBIT_DISTANCE;
    ctx.save();
    if (gameState === "VOO") {
        fundsText.innerHTML = `💰 <strong>Caixa:</strong> R$ ${agencyFunds.toLocaleString()}`;
        fuelText.innerHTML = `⛽ <strong>Combustível:</strong> <span style="color:${rocket.currentFuel < 200 ? "#e7471d" : "#a2d149"}">${Math.floor(rocket.currentFuel)}</span> / ${rocket.maxFuel} kg`;
        if (isPaused)
            planText.innerHTML = `⚙️ <strong>Planejado (ΔV):</strong> ${plannedDeltaV.toFixed(2)} m/s<br>⏱️ <strong>Tempo até Queima:</strong> +${Math.floor(maneuverTime / 10)}s`;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(cameraZoom, cameraZoom);
        let targetX = EARTH_X;
        let targetY = EARTH_Y;
        if (cameraTarget === "ROCKET") {
            targetX = rocket.x;
            targetY = rocket.y;
        }
        if (cameraTarget === "MOON") {
            targetX = currentMoonX;
            targetY = currentMoonY;
        }
        ctx.translate(-targetX, -targetY);
        drawTrajectory();
        for (let i = 0; i < SUBSTEPS; i++) {
            applyEngine(PHYSICS_DT);
            if (!isPaused) {
                const result = applyGravity(rocket.x, rocket.y, rocket.vx, rocket.vy, currentMoonX, currentMoonY, PHYSICS_DT);
                rocket.x = result.x;
                rocket.y = result.y;
                rocket.vx = result.vx;
                rocket.vy = result.vy;
                const distE = Math.sqrt((rocket.x - EARTH_X) ** 2 + (rocket.y - EARTH_Y) ** 2);
                if (distE <= EARTH_RADIUS) {
                    endMission("TERRA", Math.sqrt(rocket.vx ** 2 + rocket.vy ** 2));
                }
                const distM = Math.sqrt((rocket.x - currentMoonX) ** 2 + (rocket.y - currentMoonY) ** 2);
                if (distM <= MOON_RADIUS) {
                    endMission("LUA", Math.sqrt(rocket.vx ** 2 + rocket.vy ** 2));
                }
            }
        }
        if ((isBurningPrograde || isBurningRetrograde) && rocket.currentFuel > 0 && !isPaused) {
            ctx.fillStyle = isBurningPrograde ? "#a2d149" : "#e7471d";
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(rocket.x, rocket.y, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(rocket.x, rocket.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    else {
        ctx.translate(canvas.width / 2, canvas.height / 2);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.beginPath();
    ctx.arc(EARTH_X, EARTH_Y, MOON_ORBIT_DISTANCE, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(100,100,255,0.1)";
    ctx.beginPath();
    ctx.arc(currentMoonX, currentMoonY, MOON_SOI, 0, Math.PI * 2);
    ctx.stroke();
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#4b7cf6";
    const earthGradient = ctx.createRadialGradient(EARTH_X - EARTH_RADIUS * 0.3, EARTH_Y - EARTH_RADIUS * 0.3, EARTH_RADIUS * 0.1, EARTH_X, EARTH_Y, EARTH_RADIUS);
    earthGradient.addColorStop(0, "#85aaff");
    earthGradient.addColorStop(0.5, "#4b7cf6");
    earthGradient.addColorStop(1, "#0d1b3e");
    ctx.fillStyle = earthGradient;
    ctx.beginPath();
    ctx.arc(EARTH_X, EARTH_Y, EARTH_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    const moonGradient = ctx.createRadialGradient(currentMoonX - MOON_RADIUS * 0.3, currentMoonY - MOON_RADIUS * 0.3, MOON_RADIUS * 0.1, currentMoonX, currentMoonY, MOON_RADIUS);
    moonGradient.addColorStop(0, "#ffffff");
    moonGradient.addColorStop(0.4, "#aaaaaa");
    moonGradient.addColorStop(1, "#222222");
    ctx.fillStyle = moonGradient;
    ctx.beginPath();
    ctx.arc(currentMoonX, currentMoonY, MOON_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();
    requestAnimationFrame(gameLoop);
}
gameLoop();
export {};
//# sourceMappingURL=game.js.map