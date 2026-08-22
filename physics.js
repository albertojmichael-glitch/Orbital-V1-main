// physics.js

// ============================================================
// CONSTANTES DO UNIVERSO E FÍSICA
// ============================================================
export const PHYSICS_DT = 0.02; 
export const G = 0.5;

// Dados da Terra
export const EARTH_MASS = 8000; 
export const EARTH_RADIUS = 40; 
export const ATMOSPHERE_HEIGHT = 15; 
export const EARTH_X = 0; 
export const EARTH_Y = 0;

// Dados da Lua
export const MOON_MASS = 150; 
export const MOON_RADIUS = 15; 
export const MOON_ORBIT_DISTANCE = 1200; 
export const MOON_ORBIT_SPEED = Math.sqrt((G * EARTH_MASS) / Math.pow(MOON_ORBIT_DISTANCE, 3)); 
export const MOON_SOI = 250; 

// Dados de Órbita Inicial (Lançamento perfeito)
export const SUBSTEPS = 10;
export const INITIAL_ORBIT_RADIUS = 120; 
export const INITIAL_ORBIT_SPEED = Math.sqrt(G * EARTH_MASS / INITIAL_ORBIT_RADIUS);

// ============================================================
// CÁLCULO DE GRAVIDADE E ARRASTO
// ============================================================
export function applyPhysics(x, y, vx, vy, moonX, moonY, dt) {
    let ax = 0, ay = 0;
    
    // Gravidade da Terra
    const dxE = EARTH_X - x, dyE = EARTH_Y - y; 
    const distSqE = dxE * dxE + dyE * dyE; 
    const distE = Math.sqrt(distSqE);
    
    if (distE > EARTH_RADIUS) { 
        ax += (G * EARTH_MASS / distSqE) * (dxE / distE); 
        ay += (G * EARTH_MASS / distSqE) * (dyE / distE); 
    }
    
    // Arrasto da Atmosfera (Aerobraking)
    if (distE > EARTH_RADIUS && distE < EARTH_RADIUS + ATMOSPHERE_HEIGHT) {
        const altitude = distE - EARTH_RADIUS; 
        const rho = 1.225 * Math.exp(-altitude / 50); 
        const vSq = vx * vx + vy * vy; 
        const v = Math.sqrt(vSq);
        if (v > 0) { 
            const drag = 0.5 * rho * vSq * 0.25 * 5; 
            ax -= (vx / v) * drag; 
            ay -= (vy / v) * drag; 
        }
    }
    
    // Gravidade da Lua
    const dxM = moonX - x, dyM = moonY - y; 
    const distSqM = dxM * dxM + dyM * dyM; 
    const distM = Math.sqrt(distSqM);
    
    if (distM > MOON_RADIUS) { 
        ax += (G * MOON_MASS / distSqM) * (dxM / distM); 
        ay += (G * MOON_MASS / distSqM) * (dyM / distM); 
    }
    
    // Integrador (Calcula o próximo passo do movimento)
    const newVx = vx + ax * dt; 
    const newVy = vy + ay * dt;
    
    return { x: x + newVx * dt, y: y + newVy * dt, vx: newVx, vy: newVy };
}