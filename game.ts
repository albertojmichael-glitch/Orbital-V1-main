const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d')!;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

document.body.style.backgroundColor = "#0b0c10";
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.body.style.position = "relative";
document.body.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

// ============================================================
// DADOS DA AGÊNCIA E ESTADO DO JOGO
// ============================================================
let agencyFunds = 300000; // 300 mil para começar
let gameState = "MENU"; // Estados: MENU, MONTAGEM, VOO

// Peças da Loja
const catalog = {
    engines: [
        { name: "Motor Básico (ISP Baixo)", thrust: 0.10, cost: 40000 },
        { name: "Motor Titã (ISP Alto)", thrust: 0.25, cost: 120000 }
    ],
    tanks: [
        { name: "Tanque Pequeno (500kg)", fuel: 500, cost: 15000 },
        { name: "Tanque Médio (1500kg)", fuel: 1500, cost: 50000 }
    ]
};

let selectedEngine = catalog.engines[0]!;
let selectedTank = catalog.tanks[0]!;

const FUEL_CONSUMPTION_RATE = 2.5;

// ============================================================
// CRIAÇÃO DAS TELAS (HTML via TypeScript)
// ============================================================

// 1. TELA INICIAL
const menuScreen = document.createElement('div');
menuScreen.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; background:rgba(11,12,16,0.8); color:white; z-index:100;";
menuScreen.innerHTML = `
    <h1 style="font-size: 60px; margin-bottom: 10px; color: #4b7cf6;">ORBITAL</h1>
    <p style="font-size: 20px; margin-bottom: 40px; color: #aaaaaa;">Simulador de Agência Espacial</p>
    <button id="btnStart" style="padding: 15px 40px; font-size: 20px; font-weight: bold; cursor: pointer; border-radius: 8px; border: none; background: #a2d149; color: white;">ENTRAR NO HANGAR</button>
`;
document.body.appendChild(menuScreen);

// 2. TELA DE MONTAGEM (HANGAR)
const assemblyScreen = document.createElement('div');
assemblyScreen.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; display:none; flex-direction:column; justify-content:center; align-items:center; background:rgba(11,12,16,0.9); color:white; z-index:100;";
assemblyScreen.innerHTML = `
    <h2 style="font-size: 35px; margin-bottom: 20px;">Hangar de Montagem</h2>
    <div id="assemblyFunds" style="font-size: 22px; color: #a2d149; margin-bottom: 30px; font-weight:bold;">Orçamento: R$ 300.000</div>
    
    <div style="display:flex; gap: 40px; margin-bottom: 40px;">
        <!-- Escolha de Motor -->
        <div style="background:#1c202a; padding: 20px; border-radius: 10px; text-align:center;">
            <h3>Selecione o Motor</h3>
            <select id="engineSelect" style="padding: 10px; font-size: 16px; margin-top: 10px; border-radius: 5px;">
                <option value="0">${catalog.engines[0]!.name} - R$ ${catalog.engines[0]!.cost}</option>
                <option value="1">${catalog.engines[1]!.name} - R$ ${catalog.engines[1]!.cost}</option>
            </select>
        </div>
        
        <!-- Escolha de Tanque -->
        <div style="background:#1c202a; padding: 20px; border-radius: 10px; text-align:center;">
            <h3>Selecione o Tanque</h3>
            <select id="tankSelect" style="padding: 10px; font-size: 16px; margin-top: 10px; border-radius: 5px;">
                <option value="0">${catalog.tanks[0]!.name} - R$ ${catalog.tanks[0]!.cost}</option>
                <option value="1">${catalog.tanks[1]!.name} - R$ ${catalog.tanks[1]!.cost}</option>
            </select>
        </div>
    </div>

    <div id="totalCost" style="font-size: 20px; margin-bottom: 20px; color: #f6a84b;">Custo do Lançamento: R$ 55.000</div>
    <button id="btnLaunch" style="padding: 15px 40px; font-size: 20px; font-weight: bold; cursor: pointer; border-radius: 8px; border: none; background: #e7471d; color: white;">🚀 LANÇAR FOGUETE</button>
`;
document.body.appendChild(assemblyScreen);

// 3. HUD DE VOO E CONTROLES (Escondidos no começo)
const hudContainer = document.createElement('div');
hudContainer.style.cssText = "position:absolute; top:20px; left:20px; color:white; font-size:18px; background:rgba(0,0,0,0.6); padding:15px; border-radius:8px; border:1px solid #3a4a5c; display:none;";
const fundsText = document.createElement('div');
const fuelText = document.createElement('div');
hudContainer.appendChild(fundsText);
hudContainer.appendChild(fuelText);
document.body.appendChild(hudContainer);

const uiContainer = document.createElement('div');
uiContainer.style.cssText = "position:absolute; bottom:30px; width:100%; display:none; justify-content:center; gap:20px;";
document.body.appendChild(uiContainer);

function createButton(text: string, color: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.innerText = text;
    btn.style.padding = "15px 30px";
    btn.style.fontSize = "16px";
    btn.style.fontWeight = "bold";
    btn.style.color = "#fff";
    btn.style.backgroundColor = color;
    btn.style.border = "none";
    btn.style.borderRadius = "8px";
    btn.style.cursor = "pointer";
    btn.style.userSelect = "none";
    uiContainer.appendChild(btn);
    return btn;
}

const btnRetrograde = createButton("🛑 Retrógrado", "#e7471d");
const btnPrograde = createButton("🚀 Prógrado", "#a2d149");
const btnFocus = createButton("📷 Foco: Terra", "#3a4a5c");

// ============================================================
// LÓGICA DE MENUS E ESTADOS
// ============================================================
document.getElementById('btnStart')?.addEventListener('click', () => {
    menuScreen.style.display = "none";
    assemblyScreen.style.display = "flex";
    updateAssemblyUI();
});

const engineSelect = document.getElementById('engineSelect') as HTMLSelectElement;
const tankSelect = document.getElementById('tankSelect') as HTMLSelectElement;
const totalCostDiv = document.getElementById('totalCost');
const assemblyFundsDiv = document.getElementById('assemblyFunds');

function updateAssemblyUI() {
    selectedEngine = catalog.engines[parseInt(engineSelect.value)]!;
    selectedTank = catalog.tanks[parseInt(tankSelect.value)]!;
    const cost = selectedEngine.cost + selectedTank.cost;
    
    if (assemblyFundsDiv) assemblyFundsDiv.innerText = `Orçamento: R$ ${agencyFunds.toLocaleString()}`;
    if (totalCostDiv) {
        totalCostDiv.innerText = `Custo do Lançamento: R$ ${cost.toLocaleString()}`;
        totalCostDiv.style.color = cost > agencyFunds ? "#e7471d" : "#f6a84b";
    }
}

engineSelect.addEventListener('change', updateAssemblyUI);
tankSelect.addEventListener('change', updateAssemblyUI);

document.getElementById('btnLaunch')?.addEventListener('click', () => {
    const cost = selectedEngine.cost + selectedTank.cost;
    if (agencyFunds >= cost) {
        agencyFunds -= cost;
        
        // Configura o foguete de acordo com as compras
        rocket.maxFuel = selectedTank.fuel;
        rocket.currentFuel = selectedTank.fuel;
        
        // Reseta a posição do foguete para a Terra
        rocket.x = EARTH_X;
        rocket.y = EARTH_Y - INITIAL_ORBIT_RADIUS;
        rocket.vx = INITIAL_ORBIT_SPEED;
        rocket.vy = 0;
        
        // Esconde montagem e mostra o jogo
        assemblyScreen.style.display = "none";
        hudContainer.style.display = "block";
        uiContainer.style.display = "flex";
        
        gameState = "VOO";
    } else {
        alert("Agência sem fundos suficientes para este lançamento!");
    }
});

// ============================================================
// CONTROLES DE VOO
// ============================================================
let cameraZoom = 1.0;
let cameraTarget = "EARTH";

window.addEventListener('wheel', (e) => {
    if(gameState !== "VOO") return;
    cameraZoom += e.deltaY * -0.001;
    cameraZoom = Math.min(Math.max(0.2, cameraZoom), 4.0);
});

btnFocus.addEventListener('click', () => {
    cameraTarget = cameraTarget === "EARTH" ? "ROCKET" : "EARTH";
    btnFocus.innerText = cameraTarget === "EARTH" ? "📷 Foco: Terra" : "📷 Foco: Foguete";
});

let isBurningPrograde = false;
let isBurningRetrograde = false;

const startBurnPrograde = (e?: Event) => { if (e) e.preventDefault(); isBurningPrograde = true; }
const stopBurnPrograde = (e?: Event) => { if (e) e.preventDefault(); isBurningPrograde = false; }
const startBurnRetrograde = (e?: Event) => { if (e) e.preventDefault(); isBurningRetrograde = true; }
const stopBurnRetrograde = (e?: Event) => { if (e) e.preventDefault(); isBurningRetrograde = false; }

btnPrograde.addEventListener('mousedown', startBurnPrograde); btnPrograde.addEventListener('mouseup', stopBurnPrograde); btnPrograde.addEventListener('mouseleave', stopBurnPrograde);
btnRetrograde.addEventListener('mousedown', startBurnRetrograde); btnRetrograde.addEventListener('mouseup', stopBurnRetrograde); btnRetrograde.addEventListener('mouseleave', stopBurnRetrograde);

// ============================================================
// PARÂMETROS DO UNIVERSO E FOGUETE
// ============================================================
const G = 0.5;
const EARTH_MASS = 10000;
const EARTH_RADIUS = 40;
const EARTH_X = 0; 
const EARTH_Y = 0;

const MOON_MASS = 350; 
const MOON_RADIUS = 15;
const MOON_ORBIT_DISTANCE = 800; 
const MOON_ORBIT_SPEED = 0.001;
const MOON_SOI = 150; 

let moonAngle = 0;

const PHYSICS_DT = 0.1;
const SUBSTEPS = 10;
const INITIAL_ORBIT_RADIUS = 150;
const INITIAL_ORBIT_SPEED = Math.sqrt(G * EARTH_MASS / INITIAL_ORBIT_RADIUS);

let rocket = { x: 0, y: 0, vx: 0, vy: 0, maxFuel: 0, currentFuel: 0 };

// ============================================================
// FÍSICA E GRAVIDADE
// ============================================================
function applyGravity(x: number, y: number, vx: number, vy: number, moonX: number, moonY: number, dt: number) {
    let ax = 0, ay = 0;

    const dxE = EARTH_X - x, dyE = EARTH_Y - y;
    const distSqE = dxE * dxE + dyE * dyE;
    const distE = Math.sqrt(distSqE);

    if (distE > EARTH_RADIUS) {
        const accE = (G * EARTH_MASS) / distSqE;
        ax += accE * (dxE / distE); ay += accE * (dyE / distE);
    }

    const dxM = moonX - x, dyM = moonY - y;
    const distSqM = dxM * dxM + dyM * dyM;
    const distM = Math.sqrt(distSqM);

    if (distM > MOON_RADIUS && distM < MOON_SOI) {
        const accM = (G * MOON_MASS) / distSqM;
        ax += accM * (dxM / distM); ay += accM * (dyM / distM);
    }

    return { x: x + (vx + ax * dt) * dt, y: y + (vy + ay * dt) * dt, vx: vx + ax * dt, vy: vy + ay * dt };
}

function drawTrajectory() {
    let simX = rocket.x, simY = rocket.y, simVx = rocket.vx, simVy = rocket.vy, simMoonAngle = moonAngle;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1.5 / cameraZoom; 
    ctx.beginPath(); ctx.moveTo(simX, simY);

    for (let i = 0; i < 3500; i++) {
        simMoonAngle += MOON_ORBIT_SPEED * PHYSICS_DT;
        const simMoonX = EARTH_X + Math.cos(simMoonAngle) * MOON_ORBIT_DISTANCE;
        const simMoonY = EARTH_Y + Math.sin(simMoonAngle) * MOON_ORBIT_DISTANCE;

        const result = applyGravity(simX, simY, simVx, simVy, simMoonX, simMoonY, PHYSICS_DT);
        simX = result.x; simY = result.y; simVx = result.vx; simVy = result.vy;

        if (Math.sqrt((simX - EARTH_X)**2 + (simY - EARTH_Y)**2) <= EARTH_RADIUS) break;
        if (Math.sqrt((simX - simMoonX)**2 + (simY - simMoonY)**2) <= MOON_RADIUS) break;

        if (i % 8 === 0) ctx.lineTo(simX, simY);
    }
    ctx.stroke();
}

function applyEngine(dt: number) {
    if (rocket.currentFuel <= 0 || (!isBurningPrograde && !isBurningRetrograde)) return;

    const speed = Math.sqrt(rocket.vx * rocket.vx + rocket.vy * rocket.vy);
    if (speed <= 0) return;

    const dirX = rocket.vx / speed, dirY = rocket.vy / speed;
    const thrust = selectedEngine.thrust; // Usa o poder do motor comprado!

    if (isBurningPrograde) {
        rocket.vx += dirX * thrust * dt; rocket.vy += dirY * thrust * dt;
        rocket.currentFuel -= FUEL_CONSUMPTION_RATE * dt;
    }
    if (isBurningRetrograde) {
        rocket.vx -= dirX * thrust * dt; rocket.vy -= dirY * thrust * dt;
        rocket.currentFuel -= FUEL_CONSUMPTION_RATE * dt;
    }
    if (rocket.currentFuel < 0) rocket.currentFuel = 0;
}

// ============================================================
// GAME LOOP PRINCIPAL
// ============================================================
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // O fundo do Universo continua rodando mesmo no Menu!
    moonAngle += MOON_ORBIT_SPEED;
    const currentMoonX = EARTH_X + Math.cos(moonAngle) * MOON_ORBIT_DISTANCE;
    const currentMoonY = EARTH_Y + Math.sin(moonAngle) * MOON_ORBIT_DISTANCE;

    ctx.save();
    
    if (gameState === "VOO") {
        fundsText.innerHTML = `💰 <strong>Caixa:</strong> R$ ${agencyFunds.toLocaleString()}`;
        fuelText.innerHTML = `⛽ <strong>Combustível:</strong> <span style="color:${rocket.currentFuel < 200 ? "#e7471d" : "#a2d149"}">${Math.floor(rocket.currentFuel)}</span> / ${rocket.maxFuel} kg`;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(cameraZoom, cameraZoom);
        ctx.translate(-(cameraTarget === "EARTH" ? EARTH_X : rocket.x), -(cameraTarget === "EARTH" ? EARTH_Y : rocket.y));
        
        drawTrajectory();

        for (let i = 0; i < SUBSTEPS; i++) {
            applyEngine(PHYSICS_DT);
            const result = applyGravity(rocket.x, rocket.y, rocket.vx, rocket.vy, currentMoonX, currentMoonY, PHYSICS_DT);
            rocket.x = result.x; rocket.y = result.y; rocket.vx = result.vx; rocket.vy = result.vy;

            // --- COLISÃO COM A TERRA ---
            const distE = Math.sqrt((rocket.x - EARTH_X)**2 + (rocket.y - EARTH_Y)**2);
            if (distE <= EARTH_RADIUS) {
                // Joga o foguete um pixel para fora da Terra para não afundar
                const dx = rocket.x - EARTH_X;
                const dy = rocket.y - EARTH_Y;
                rocket.x = EARTH_X + (dx / distE) * (EARTH_RADIUS + 1);
                rocket.y = EARTH_Y + (dy / distE) * (EARTH_RADIUS + 1);
                
                // Zera a velocidade e desliga o motor
                rocket.vx = 0; rocket.vy = 0;
                isBurningPrograde = false; isBurningRetrograde = false;
            }

            // --- COLISÃO COM A LUA ---
            const distM = Math.sqrt((rocket.x - currentMoonX)**2 + (rocket.y - currentMoonY)**2);
            if (distM <= MOON_RADIUS) {
                // O mesmo para a lua
                const dx = rocket.x - currentMoonX;
                const dy = rocket.y - currentMoonY;
                rocket.x = currentMoonX + (dx / distM) * (MOON_RADIUS + 1);
                rocket.y = currentMoonY + (dy / distM) * (MOON_RADIUS + 1);
                
                rocket.vx = 0; rocket.vy = 0;
                isBurningPrograde = false; isBurningRetrograde = false;
            }
        }
        
        // Desenha o Foguete
        if ((isBurningPrograde || isBurningRetrograde) && rocket.currentFuel > 0) {
            ctx.fillStyle = isBurningPrograde ? "#a2d149" : "#e7471d";
            ctx.globalAlpha = 0.5;
            ctx.beginPath(); ctx.arc(rocket.x, rocket.y, 7, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }
        ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(rocket.x, rocket.y, 4, 0, Math.PI * 2); ctx.fill();
    } else {
        // Se estiver no menu, a câmera fica fixa na Terra de fundo
        ctx.translate(canvas.width / 2, canvas.height / 2);
    }

    // Órbitas e Planetas (Sempre visíveis)
    ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.beginPath(); ctx.arc(EARTH_X, EARTH_Y, MOON_ORBIT_DISTANCE, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(100,100,255,0.1)"; ctx.beginPath(); ctx.arc(currentMoonX, currentMoonY, MOON_SOI, 0, Math.PI * 2); ctx.stroke();
    
    // Terra 3D
    ctx.save();
    ctx.shadowBlur = 20; ctx.shadowColor = "#4b7cf6";
    const earthGradient = ctx.createRadialGradient(EARTH_X - EARTH_RADIUS*0.3, EARTH_Y - EARTH_RADIUS*0.3, EARTH_RADIUS*0.1, EARTH_X, EARTH_Y, EARTH_RADIUS);
    earthGradient.addColorStop(0, "#85aaff"); earthGradient.addColorStop(0.5, "#4b7cf6"); earthGradient.addColorStop(1, "#0d1b3e");
    ctx.fillStyle = earthGradient; ctx.beginPath(); ctx.arc(EARTH_X, EARTH_Y, EARTH_RADIUS, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Lua 3D
    ctx.save();
    const moonGradient = ctx.createRadialGradient(currentMoonX - MOON_RADIUS*0.3, currentMoonY - MOON_RADIUS*0.3, MOON_RADIUS*0.1, currentMoonX, currentMoonY, MOON_RADIUS);
    moonGradient.addColorStop(0, "#ffffff"); moonGradient.addColorStop(0.4, "#aaaaaa"); moonGradient.addColorStop(1, "#222222");
    ctx.fillStyle = moonGradient; ctx.beginPath(); ctx.arc(currentMoonX, currentMoonY, MOON_RADIUS, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.restore();
    requestAnimationFrame(gameLoop);
}

gameLoop();