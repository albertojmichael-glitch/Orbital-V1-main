// data.js
export let agencyFunds = 100000; 

export const catalog = {
    engines: [ { name: "Motor Básico", thrust: 0.8, cost: 40000 }, { name: "Motor Titã", thrust: 2.5, cost: 120000 } ],
    tanks: [ { name: "Tanque Pequeno", fuel: 500, cost: 15000 }, { name: "Tanque Médio", fuel: 1500, cost: 50000 } ],
    fuels: [ { name: "Querosene", efficiency: 1.0, cost: 5000 }, { name: "Hidrogênio", efficiency: 0.4, cost: 25000 } ]
};

export const contracts = [
    { id: "NONE", name: "Voo de Teste", advance: 0, reward: 0, desc: "Voo livre." },
    { id: "ORBIT", name: "Sair da Atmosfera", advance: 20000, reward: 50000, desc: "Alcance a órbita na fase de lançamento!" },
    { id: "FLYBY", name: "Sobrevoo Lunar", advance: 50000, reward: 120000, desc: "Entre na esfera da Lua." },
    { id: "LAND", name: "Pouso Lunar (Minijogo)", advance: 120000, reward: 450000, desc: "Pouse manualmente e sobreviva!" }
];

export let selectedEngine = catalog.engines[0]; 
export let selectedTank = catalog.tanks[0]; 
export let selectedFuel = catalog.fuels[0]; 
export let selectedContract = contracts[0]; 
export let contractCompleted = false;

// Funções para alterar os dados (Setters)
export function addFunds(amount) {
    agencyFunds += amount;
}

export function setContractCompleted(status) {
    contractCompleted = status;
}

// Funções para salvar as escolhas do jogador no Hangar
export function setSelectedParts(engine, tank, fuel, contract) {
    selectedEngine = engine;
    selectedTank = tank;
    selectedFuel = fuel;
    selectedContract = contract;
}