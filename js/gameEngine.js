/**
 * ====================================
 * SPACE CONQUEST - GAME ENGINE (REFACTORED)
 * ====================================
 * 
 * Main game engine - streamlined and focused on core functionality
 */

class GameEngine {
    constructor() {
        // Core game state
        this.gameState = 'initializing';
        this.gameStartTime = 0;
        this.lastUpdateTime = 0;
        this.isRunning = false;
        this.gameLoopId = null;
        
        // Game objects
        this.planets = [];
        this.fleets = [];
        
        // Controllers
        this.aiController = null;
        this.uiController = null;
        
        // Input handling - FIXED VERSION
        this.inputState = {
            mouseDown: false,
            dragStart: null,
            dragCurrent: null,
            selectedPlanet: null,
            dragThreshold: 5,
            dragLine: null,
            isDragging: false
        };
        
        // Keyboard system
        this.keyboardState = {
            selectedPlanet: null,
            awaitingTarget: false,
            planetMap: new Map()
        };
        
        // Game statistics
        this.gameStats = {
            gameStartTime: 0,
            gameDuration: 0,
            playerPlanets: 0,
            playerShips: 0,
            aiPlanets: 0,
            aiShips: 0,
            planetsConquered: 0,
            fleetsLaunched: 0,
            shipsProduced: 0
        };
        
        this.initialize();
    }

    initialize() {
        Utils.debugLog('GAME_INIT', 'Initializing game engine...');
        
        // Initialize controllers
        this.uiController = new UIController(this);
        this.aiController = new AIController(this);
        
        // Setup canvas
        this.setupCanvas();
        
        // Setup input handlers - IMPROVED VERSION
        this.setupInputHandlers();
        
        // Generate world
        this.generateWorld();
        this.setupKeyboardMappings();
        
        // Start game
        this.startGame();
        
        Utils.debugLog('GAME_INIT', 'Game engine initialized successfully');
    }

    setupCanvas() {
        const canvas = Utils.getElementById('gameCanvas');
        if (!canvas) throw new Error('Game canvas not found');
        
        this.canvas = canvas;
        const rect = canvas.parentElement.getBoundingClientRect();
        this.canvasWidth = rect.width;
        this.canvasHeight = rect.height - 70;
        
        canvas.setAttribute('width', this.canvasWidth);
        canvas.setAttribute('height', this.canvasHeight);
        canvas.setAttribute('viewBox', `0 0 ${this.canvasWidth} ${this.canvasHeight}`);
    }

    // FIXED INPUT HANDLERS - This solves the vibration and selection bugs
    setupInputHandlers() {
        if (!this.canvas) return;
        
        // Mouse events with proper event handling
        this.canvas.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.onMouseDown(e);
        }, { passive: false });
        
        this.canvas.addEventListener('mousemove', (e) => {
            e.preventDefault();
            this.onMouseMove(e);
        }, { passive: false });
        
        this.canvas.addEventListener('mouseup', (e) => {
            e.preventDefault();
            this.onMouseUp(e);
        }, { passive: false });
        
        this.canvas.addEventListener('mouseleave', (e) => {
            this.onMouseLeave(e);
        });
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        
        // Global deselection
        document.addEventListener('click', (e) => {
            if (!this.canvas.contains(e.target)) {
                this.clearAllSelections();
            }
        });
        
        // Context menu disable
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // FIXED MOUSE HANDLERS - This solves the selection problems
    onMouseDown(event) {
        if (this.gameState !== 'playing') return;
        
        const pos = Utils.getMousePosition(event, this.canvas);
        const planet = this.getPlanetAtPosition(pos.x, pos.y);
        
        Utils.debugLog('MOUSE_DOWN', `Mouse down at ${pos.x}, ${pos.y}, planet: ${planet ? planet.getLetter() + ' (' + planet.owner + ', ships: ' + planet.ships + ')' : 'none'}`);
        
        // Clear any existing selections first
        this.clearAllSelections();
        
        this.inputState.mouseDown = true;
        this.inputState.dragStart = pos;
        this.inputState.dragCurrent = null;
        this.inputState.isDragging = false;
        this.inputState.selectedPlanet = null;
        
        // FIXED: Only select valid planets
        if (planet && planet.owner === 'player' && planet.ships > 0) {
            this.inputState.selectedPlanet = planet;
            planet.select();
            Utils.debugLog('DRAG_START', `Valid planet selected: ${planet.getLetter()}`);
        } else {
            Utils.debugLog('DRAG_INVALID', planet ? `Invalid planet: ${planet.getLetter()} (owner: ${planet.owner}, ships: ${planet.ships})` : 'No planet at position');
        }
    }

    onMouseMove(event) {
        if (this.gameState !== 'playing' || !this.inputState.mouseDown) return;
        
        const pos = Utils.getMousePosition(event, this.canvas);
        this.inputState.dragCurrent = pos;
        
        if (this.inputState.selectedPlanet && this.inputState.dragStart) {
            const dragDistance = Utils.distance(
                this.inputState.dragStart.x, this.inputState.dragStart.y,
                pos.x, pos.y
            );
            
            if (dragDistance > this.inputState.dragThreshold) {
                this.inputState.isDragging = true;
                this.updateDragLine();
            }
        }
    }

    onMouseUp(event) {
        if (this.gameState !== 'playing') return;
        
        const pos = Utils.getMousePosition(event, this.canvas);
        
        // FIXED: Only process drag if we have a valid selection and are dragging
        if (this.inputState.selectedPlanet && this.inputState.isDragging) {
            const targetPlanet = this.getPlanetAtPosition(pos.x, pos.y);
            
            if (targetPlanet && targetPlanet !== this.inputState.selectedPlanet) {
                this.handleFleetLaunch(this.inputState.selectedPlanet, targetPlanet);
            }
        }
        
        // Reset input state
        this.resetInputState();
    }

    onMouseLeave(event) {
        this.resetInputState();
    }

    // FIXED: Improved planet detection
    getPlanetAtPosition(x, y) {
        for (let i = this.planets.length - 1; i >= 0; i--) {
            const planet = this.planets[i];
            const distance = Utils.distance(x, y, planet.x, planet.y);
            
            // Slightly larger hit area for better usability
            if (distance <= planet.radius + 8) {
                return planet;
            }
        }
        return null;
    }

    updateDragLine() {
        if (!this.inputState.selectedPlanet || !this.inputState.dragCurrent) return;
        
        // Remove existing line
        if (this.inputState.dragLine) {
            this.inputState.dragLine.remove();
        }
        
        // Create new drag line
        this.inputState.dragLine = Utils.createSVGElement('line', {
            x1: this.inputState.selectedPlanet.x,
            y1: this.inputState.selectedPlanet.y,
            x2: this.inputState.dragCurrent.x,
            y2: this.inputState.dragCurrent.y,
            'class': 'drag-line'
        });
        
        this.canvas.appendChild(this.inputState.dragLine);
    }

    resetInputState() {
        // Deselect planet if selected via mouse
        if (this.inputState.selectedPlanet && !this.keyboardState.selectedPlanet) {
            this.inputState.selectedPlanet.deselect();
        }
        
        // Remove drag line
        if (this.inputState.dragLine) {
            this.inputState.dragLine.remove();
            this.inputState.dragLine = null;
        }
        
        // Reset state
        this.inputState.mouseDown = false;
        this.inputState.dragStart = null;
        this.inputState.dragCurrent = null;
        this.inputState.selectedPlanet = null;
        this.inputState.isDragging = false;
    }

    // KEYBOARD HANDLERS
    onKeyDown(event) {
        if (this.gameState !== 'playing') return;
        
        const key = event.key.toLowerCase();
        
        if (this.keyboardState.planetMap.has(key)) {
            const planet = this.keyboardState.planetMap.get(key);
            
            if (this.keyboardState.awaitingTarget) {
                this.executeKeyboardAttack(planet);
            } else {
                this.selectPlanetKeyboard(planet);
            }
            
            event.preventDefault();
            return;
        }
        
        if (key === 'escape' || key === ' ') {
            this.clearAllSelections();
            event.preventDefault();
        }
    }

    selectPlanetKeyboard(planet) {
        // FIXED: Proper validation messages
        if (planet.owner !== 'player') {
            this.uiController.showNotification(
                `El planeta ${planet.getLetter()} no es tuyo`,
                'warning', 2000
            );
            return;
        }
        
        if (planet.ships === 0) {
            this.uiController.showNotification(
                `El planeta ${planet.getLetter()} no tiene naves`,
                'warning', 2000
            );
            return;
        }
        
        this.clearAllSelections();
        this.keyboardState.selectedPlanet = planet;
        this.keyboardState.awaitingTarget = true;
        planet.select();
        
        this.uiController.showNotification(
            `Planeta ${planet.getLetter()} seleccionado. Presiona otra tecla para atacar.`,
            'info', 3000
        );
    }

    executeKeyboardAttack(targetPlanet) {
        const sourcePlanet = this.keyboardState.selectedPlanet;
        if (!sourcePlanet || sourcePlanet === targetPlanet) return;
        
        this.handleFleetLaunch(sourcePlanet, targetPlanet);
        this.clearAllSelections();
    }

    clearAllSelections() {
        if (this.keyboardState.selectedPlanet) {
            this.keyboardState.selectedPlanet.deselect();
        }
        this.keyboardState.selectedPlanet = null;
        this.keyboardState.awaitingTarget = false;
        
        this.resetInputState();
    }

    // PLANET INTERACTION FROM PLANET CLASS
    onPlanetClick(planet, event) {
        if (this.gameState !== 'playing') return;
        
        if (this.keyboardState.awaitingTarget) {
            this.executeKeyboardAttack(planet);
        } else if (planet.owner === 'player' && planet.ships > 0) {
            this.selectPlanetKeyboard(planet);
        }
    }

    onPlanetMouseDown(planet, event) {
        // This is handled in main mouse down handler
        Utils.debugLog('PLANET_MOUSE_DOWN', `Planet ${planet.getLetter()} mouse down handled`);
    }

    // FLEET LAUNCHING
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
            this.uiController.showNotification(
                `${shipsToSend} naves enviadas de ${source.getLetter()} a ${target.getLetter()}`,
                'success', 2000
            );
        }
    }

    sendFleet(source, target, ships, owner) {
        if (!source.canSendShips(ships)) return;
        
        const actualShips = source.removeShips(ships);
        const fleet = new Fleet(source, target, actualShips, owner);
        this.fleets.push(fleet);
        this.gameStats.fleetsLaunched++;
    }

    // WORLD GENERATION
    generateWorld() {
        this.planets = [];
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
            
            this.planets.push(planet);
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
                const x = Utils.random(margin, this.canvasWidth - margin);
                const y = Utils.random(margin + 70, this.canvasHeight - margin);
                
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
                    x: margin + (i % 3) * (this.canvasWidth - 2 * margin) / 3,
                    y: margin + 70 + Math.floor(i / 3) * (this.canvasHeight - margin - 70) / Math.ceil(count / 3)
                };
            }
            
            positions.push(position);
        }
        
        return positions;
    }

    setupKeyboardMappings() {
        this.keyboardState.planetMap.clear();
        this.planets.forEach(planet => {
            this.keyboardState.planetMap.set(planet.getLetter().toLowerCase(), planet);
        });
    }

    // GAME LOOP
    startGame() {
        this.gameState = 'playing';
        this.gameStartTime = performance.now();
        this.gameStats.gameStartTime = this.gameStartTime;
        this.isRunning = true;
        
        this.gameLoopId = requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
        
        if (this.uiController) {
            this.uiController.showNotification(
                'Arrastra desde tus planetas verdes o usa las teclas para seleccionar',
                'info', 4000
            );
        }
    }

    gameLoop(timestamp) {
        if (!this.isRunning) return;
        
        const deltaTime = this.lastUpdateTime === 0 ? 0 : timestamp - this.lastUpdateTime;
        this.lastUpdateTime = timestamp;
        const clampedDeltaTime = Math.min(deltaTime, 100);
        
        this.update(clampedDeltaTime);
        Utils.Performance.update();
        
        this.gameLoopId = requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        // Update game systems
        this.planets.forEach(planet => planet.update(deltaTime));
        
        for (let i = this.fleets.length - 1; i >= 0; i--) {
            const fleet = this.fleets[i];
            if (fleet.update(deltaTime)) {
                fleet.destroy();
                this.fleets.splice(i, 1);
            }
        }
        
        this.aiController.update(deltaTime);
        this.uiController.update(deltaTime);
        this.updateGameStats(deltaTime);
        this.checkGameEnd();
    }

    updateGameStats(deltaTime) {
        this.gameStats.gameDuration = performance.now() - this.gameStartTime;
        
        let playerPlanets = 0, playerShips = 0, aiPlanets = 0, aiShips = 0;
        
        this.planets.forEach(planet => {
            if (planet.owner === 'player') {
                playerPlanets++;
                playerShips += planet.ships;
            } else if (planet.owner === 'ai') {
                aiPlanets++;
                aiShips += planet.ships;
            }
        });
        
        this.gameStats.playerPlanets = playerPlanets;
        this.gameStats.playerShips = playerShips;
        this.gameStats.aiPlanets = aiPlanets;
        this.gameStats.aiShips = aiShips;
    }

    checkGameEnd() {
        const playerPlanets = this.planets.filter(p => p.owner === 'player').length;
        const aiPlanets = this.planets.filter(p => p.owner === 'ai').length;
        
        if (playerPlanets === 0) {
            this.endGame('defeat');
        } else if (aiPlanets === 0) {
            this.endGame('victory');
        }
    }

    endGame(result) {
        this.gameState = result;
        this.isRunning = false;
        
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
        
        this.clearAllSelections();
        this.uiController.showGameOverModal(result, this.gameStats);
    }

    // UTILITY METHODS
    getGameState() {
        return this.gameState;
    }

    getGameStats() {
        return { ...this.gameStats };
    }

    pause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
        }
    }

    resume() {
        if (this.gameState === 'paused') {
            this.gameState = 'playing';
        }
    }

    restart() {
        this.isRunning = false;
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
        }
        
        this.fleets.forEach(fleet => fleet.destroy());
        this.planets.forEach(planet => planet.destroy());
        this.fleets = [];
        this.planets = [];
        
        this.aiController.reset();
        this.uiController.reset();
        this.resetInputState();
        this.clearAllSelections();
        
        this.gameState = 'initializing';
        this.lastUpdateTime = 0;
        
        this.gameStats = {
            gameStartTime: 0,
            gameDuration: 0,
            playerPlanets: 0,
            playerShips: 0,
            aiPlanets: 0,
            aiShips: 0,
            planetsConquered: 0,
            fleetsLaunched: 0,
            shipsProduced: 0
        };
        
        this.generateWorld();
        this.setupKeyboardMappings();
        this.startGame();
    }

    getDebugInfo() {
        return {
            gameState: this.gameState,
            planetsCount: this.planets.length,
            fleetsCount: this.fleets.length,
            gameStats: this.gameStats,
            inputState: this.inputState,
            keyboardState: {
                selectedPlanet: this.keyboardState.selectedPlanet ? this.keyboardState.selectedPlanet.getLetter() : null,
                awaitingTarget: this.keyboardState.awaitingTarget
            }
        };
    }

    destroy() {
        this.isRunning = false;
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
        }
        
        this.fleets.forEach(fleet => fleet.destroy());
        this.planets.forEach(planet => planet.destroy());
        
        if (this.uiController) {
            this.uiController.destroy();
        }
    }
}

// Make GameEngine globally available
window.GameEngine = GameEngine;