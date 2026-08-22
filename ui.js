// ui.js
import { catalog, contracts } from './data.js';

export const menuScreen = document.createElement('div');
menuScreen.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; background:rgba(11,12,16,0.8); color:white; z-index:100;";
menuScreen.innerHTML = `<h1 style="font-size: 60px; margin-bottom: 10px; color: #4b7cf6;">ORBITAL</h1><p style="font-size: 20px; margin-bottom: 40px; color: #aaaaaa;">Comandante de Missão</p><button id="btnStart" style="padding: 15px 40px; font-size: 20px; font-weight: bold; cursor: pointer; border-radius: 8px; border: none; background: #a2d149; color: white;">ENTRAR NO HANGAR</button>`;
document.body.appendChild(menuScreen);
export const btnStart = document.getElementById('btnStart');

export const assemblyScreen = document.createElement('div');
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
    <div style="display:flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; justify-content: center;">
        <div style="background:#1c202a; padding: 15px; border-radius: 10px; text-align:center;">
            <h3>Motor</h3><select id="engineSelect" style="padding: 8px; font-size: 14px; margin-top: 5px; border-radius: 5px;">${catalog.engines.map((e, i) => `<option value="${i}">${e.name} - R$ ${e.cost}</option>`).join('')}</select>
        </div>
        <div style="background:#1c202a; padding: 15px; border-radius: 10px; text-align:center;">
            <h3>Tanque</h3><select id="tankSelect" style="padding: 8px; font-size: 14px; margin-top: 5px; border-radius: 5px;">${catalog.tanks.map((t, i) => `<option value="${i}">${t.name} - R$ ${t.cost}</option>`).join('')}</select>
        </div>
        <div style="background:#1c202a; padding: 15px; border-radius: 10px; text-align:center;">
            <h3>Combust.</h3><select id="fuelSelect" style="padding: 8px; font-size: 14px; margin-top: 5px; border-radius: 5px;">${catalog.fuels.map((f, i) => `<option value="${i}">${f.name} - R$ ${f.cost}</option>`).join('')}</select>
        </div>
        <div style="background:#1c202a; padding: 15px; border-radius: 10px; text-align:center; border: 1px solid #f6a84b;">
            <h3 style="color:#f6a84b;">Boosters (Opção)</h3><select id="boosterSelect" style="padding: 8px; font-size: 14px; margin-top: 5px; border-radius: 5px;">${catalog.boosters.map((b, i) => `<option value="${i}">${b.name} - R$ ${b.cost}</option>`).join('')}</select>
        </div>
    </div>
    <div id="totalCost" style="font-size: 20px; margin-bottom: 20px; color: #f6a84b; background:#1c202a; padding: 15px; border-radius: 10px;">Cálculo...</div>
    <button id="btnLaunch" style="padding: 15px 40px; font-size: 20px; font-weight: bold; cursor: pointer; border-radius: 8px; border: none; background: #e7471d; color: white;">🚀 LANÇAR FOGUETE</button>
`;
document.body.appendChild(assemblyScreen);

export const engineSelect = document.getElementById('engineSelect'); 
export const tankSelect = document.getElementById('tankSelect'); 
export const fuelSelect = document.getElementById('fuelSelect'); 
export const boosterSelect = document.getElementById('boosterSelect'); // NOVO
export const contractSelect = document.getElementById('contractSelect');
export const totalCostDiv = document.getElementById('totalCost'); 
export const assemblyFundsDiv = document.getElementById('assemblyFunds'); 
export const contractDesc = document.getElementById('contractDesc');
export const btnLaunch = document.getElementById('btnLaunch');

export const hudContainer = document.createElement('div');
hudContainer.style.cssText = "position:absolute; top:20px; left:20px; color:white; font-size:16px; background:rgba(0,0,0,0.7); padding:15px; border-radius:8px; border:1px solid #3a4a5c; display:none; pointer-events:none;";
export const fundsText = document.createElement('div'); 
export const fuelText = document.createElement('div'); 
export const boosterText = document.createElement('div'); boosterText.style.cssText = "color: #f6a84b; font-weight: bold; margin-bottom: 5px; display:none;"; // NOVO
export const speedText = document.createElement('div'); speedText.style.cssText = "color: #f6a84b; margin-top: 5px; font-weight: bold;";
export const missionText = document.createElement('div'); missionText.style.cssText = "margin-top: 10px; padding-top: 10px; border-top: 1px solid #3a4a5c; color: #aaaaaa;";
export const planText = document.createElement('div'); planText.style.cssText = "color: #f6a84b; margin-top: 10px; font-weight: bold; display:none;";
hudContainer.append(boosterText, fundsText, fuelText, speedText, missionText, planText); 
document.body.appendChild(hudContainer);

export const uiContainer = document.createElement('div');
uiContainer.style.cssText = "position:absolute; bottom:30px; width:100%; display:none; justify-content:center; gap:10px; flex-wrap: wrap;";
document.body.appendChild(uiContainer);
function createBtn(text, color) { const btn = document.createElement('button'); btn.innerText = text; btn.style.cssText = `padding: 15px 20px; font-size: 14px; font-weight: bold; color: #fff; background-color: ${color}; border: none; border-radius: 8px; cursor: pointer;`; uiContainer.appendChild(btn); return btn; }

export const btnNodePrev = createBtn("⏪ Voltar Nó", "#6c7a89"); export const btnRetrograde = createBtn("🛑 Retrógrado", "#e7471d");
export const btnPrograde = createBtn("🚀 Prógrado", "#a2d149"); export const btnNodeNext = createBtn("Avançar Nó ⏩", "#6c7a89");
export const btnPause = createBtn("⏸️ Planejar", "#3a4a5c"); export const btnExecute = createBtn("✔️ Executar", "#f6a84b"); export const btnFocus = createBtn("📷 Foco: Terra", "#3a4a5c");
btnNodePrev.style.display = "none"; btnNodeNext.style.display = "none"; btnExecute.style.display = "none"; 

export const resultScreen = document.createElement('div');
resultScreen.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; display:none; flex-direction:column; justify-content:center; align-items:center; background:rgba(11,12,16,0.95); color:white; z-index:200; text-align:center;";
export const resultTitle = document.createElement('h1'); resultTitle.style.fontSize = "50px"; resultTitle.style.marginBottom = "10px";
export const resultMessage = document.createElement('p'); resultMessage.style.fontSize = "22px"; resultMessage.style.marginBottom = "40px"; resultMessage.style.whiteSpace = "pre-line";
export const btnReturn = document.createElement('button'); btnReturn.innerText = "VOLTAR AO HANGAR"; btnReturn.style.cssText = "padding: 15px 40px; font-size: 20px; font-weight: bold; cursor: pointer; border-radius: 8px; border: none; background: #3a4a5c; color: white;";
resultScreen.append(resultTitle, resultMessage, btnReturn); document.body.appendChild(resultScreen);