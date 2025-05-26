/**
 * GameEngine World Module - World generation and fleet management
 */
class GameEngineWorld {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
    }

    // WORLD GENERATION
    generateWorld() {
        this.gameEngine.planets = [];
        const capacities = [...CONFIG.PLANET.CAPACITIES];
        Utils.shuffle(capacities);
        
        while (capacities.length < CONFIG.PLANET.COUNT) {
            capacities.push(...CONFIG.PLANET.CAPACITIES);
        }
        
        const positions = this.generatePlanetPositions(CONFIG.PLANET.COUNT);
        
        for (let i = 0; i < CONFIG.PLANET.COUNT; i++) {
            const capacity = capacities[i];
            const position = positions[i];
            
            let owner = 'neutral';
            let ships = 0;
            
            if (i === 0) {
                owner = 'player';
                ships = CONFIG.SHIP.INITIAL_COUNT;
            } else if (i === 1) {
                owner = 'ai';
                ships = CONFIG.SHIP.INITIAL_COUNT;
            }
            
            const planet = new Planet(position.x, position.y, capacity, owner);
            planet.ships = ships;
            planet.updateShipText();
            
            this.gameEngine.planets.push(planet);
        }
    }

    generatePlanetPositions(count) {
        const positions = [];
        const margin = CONFIG.PLANET.MARGIN;
        const minDistance = CONFIG.PLANET.MIN_DISTANCE;
        
        for (let i = 0; i < count; i++) {
            let position = null;
            let attempts = 0;
            
            while (!position && attempts < 1000) {
                const x = Utils.random(margin, this.gameEngine.canvasWidth - margin);
                const y = Utils.random(margin + 70, this.gameEngine.canvasHeight - margin);
                
                let validPosition = true;
                for (const existingPos of positions) {
                    if (Utils.distance(x, y, existingPos.x, existingPos.y) < minDistance) {
                        validPosition = false;
                        break;
                    }
                }
                
                if (validPosition) {
                    position = { x, y };
                }
                attempts++;
            }
            
            if (!position) {
                position = {
                    x: margin + (i % 3) * (this.gameEngine.canvasWidth - 2 * margin) / 3,
                    y: margin + 70 + Math.floor(i / 3) * (this.gameEngine.canvasHeight - margin - 70) / Math.ceil(count / 3)
                };
            }
            
            positions.push(position);
        }
        
        return positions;
    }

    // FLEET LAUNCHING AND MANAGEMENT
    handleFleetLaunch(source, target) {
        if (source.owner !== 'player' || source.ships === 0) return;
        
        let shipsToSend;
        
        if (target.owner === 'neutral') {
            shipsToSend = Math.min(1, source.ships);
        } else if (target.owner === 'ai') {
            shipsToSend = Math.min(target.ships + 1, source.ships);
        } else {
            const availableSpace = target.capacity - target.ships;
            shipsToSend = Math.min(availableSpace, source.ships - 1);
        }
        
        if (shipsToSend > 0) {
            this.sendFleet(source, target, shipsToSend, 'player');
            this.gameEngine.uiController.showNotification(
                `${shipsToSend} naves enviadas de ${source.getLetter()} a ${target.getLetter()}`,
                'success', 2000
            );
        }
    }

    sendFleet(source, target, ships, owner) {
        if (!source.canSendShips(ships)) return;
        
        const actualShips = source.removeShips(ships);
        const fleet = new Fleet(source, target, actualShips, owner);
        this.gameEngine.fleets.push(fleet);
        this.gameEngine.gameStats.fleetsLaunched++;
    }

    // PLANET INTERACTION HANDLERS
    onPlanetClick(planet, event) {
        if (this.gameEngine.gameState !== 'playing') return;
        
        // Only handle keyboard interactions through clicks
        if (this.gameEngine.inputHandler.keyboardState.awaitingTarget) {
            this.gameEngine.inputHandler.executeKeyboardAttack(planet);
        } else if (planet.owner === 'player' && planet.ships > 0) {
            this.gameEngine.inputHandler.selectPlanetKeyboard(planet);
        }
    }

    onPlanetMouseDown(planet, event) {
        // RTS-style dragging is handled in input module
        // This method exists for compatibility
    }
}

window.GameEngineWorld = GameEngineWorld;