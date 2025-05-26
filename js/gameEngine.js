/**
 * ====================================
 * SPACE CONQUEST - GAME ENGINE
 * ====================================
 * 
 * Main game engine that coordinates all game systems.
 * Handles game loop, state management, and system integration.
 */

class GameEngine {
    /**
     * Create game engine
     */
    constructor() {
        // Game state
        this.gameState = 'initializing'; // 'initializing', 'playing', 'paused', 'victory', 'defeat'
        this.gameStartTime = 0;
        this.lastUpdateTime = 0;
        
        // Game objects
        this.planets = [];
        this.fleets = [];
        
        // Controllers
        this.aiController = null;
        this.uiController = null;
        
        // Input handling
        this.inputState = {
            mouseDown: false,
            dragStart: null,
            dragCurrent: null,
            selectedPlanet: null,
            dragThreshold: CONFIG.GAME.DRAG_THRESHOLD,
            dragLine: null
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
        
        // Performance monitoring
        this.performanceStats = {
            updateTime: 0,
            renderTime: 0,
            frameCount: 0,
            lastFPSUpdate: 0
        };
        
        // Game loop
        this.gameLoopId = null;
        this.isRunning = false;
        
        // Initialize game
        this.initialize();
    }

    /**
     * Initialize game engine
     */
    initialize() {
        Utils.debugLog('GAME_INIT', 'Initializing game engine...');
        
        // Initialize controllers
        this.uiController = new UIController(this);
        this.aiController = new AIController(this);
        
        // Setup canvas
        this.setupCanvas();
        
        // Setup input handlers
        this.setupInputHandlers();
        
        // Generate game world
        this.generateWorld();
        
        // Start game
        this.startGame();
        
        Utils.debugLog('GAME_INIT', 'Game engine initialized successfully');
    }

    /**
     * Setup canvas and rendering
     */
    setupCanvas() {
        const canvas = Utils.getElementById('gameCanvas');
        if (!canvas) {
            throw new Error('Game canvas not found');
        }
        
        this.canvas = canvas;
        
        // Set canvas size
        const rect = canvas.parentElement.getBoundingClientRect();
        this.canvasWidth = rect.width;
        this.canvasHeight = rect.height - 70; // Account for UI overlay
        
        canvas.setAttribute('width', this.canvasWidth);
        canvas.setAttribute('height', this.canvasHeight);
        canvas.setAttribute('viewBox', `0 0 ${this.canvasWidth} ${this.canvasHeight}`);
    }

    /**
     * Setup input event handlers
     */
    setupInputHandlers() {
        if (!this.canvas) return;
        
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.onMouseLeave(e));
        
        // Touch events for mobile support
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
        
        // Context menu disable
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    /**
     * Generate game world (planets)
     */
    generateWorld() {
        this.planets = [];
        
        const capacities = [...CONFIG.PLANET.CAPACITIES];
        Utils.shuffle(capacities);
        
        // Ensure we have enough capacities
        while (capacities.length < CONFIG.PLANET.COUNT) {
            capacities.push(...CONFIG.PLANET.CAPACITIES);
        }
        
        const positions = this.generatePlanetPositions(CONFIG.PLANET.COUNT);
        
        // Create planets
        for (let i = 0; i < CONFIG.PLANET.COUNT; i++) {
            const capacity = capacities[i];
            const position = positions[i];
            
            let owner = 'neutral';
            let ships = 0;
            
            // Assign starting planets
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
        
        Utils.debugLog('WORLD_GEN', `Generated ${this.planets.length} planets`);
    }

    /**
     * Generate planet positions ensuring minimum distance
     * @param {number} count - Number of planets to generate
     * @returns {Array} Array of position objects {x, y}
     */
    generatePlanetPositions(count) {
        const positions = [];
        const margin = CONFIG.PLANET.MARGIN;
        const minDistance = CONFIG.PLANET.MIN_DISTANCE;
        const maxAttempts = 1000;
        
        for (let i = 0; i < count; i++) {
            let position = null;
            let attempts = 0;
            
            while (!position && attempts < maxAttempts) {
                const x = Utils.random(margin, this.canvasWidth - margin);
                const y = Utils.random(margin + 70, this.canvasHeight - margin); // Account for UI
                
                // Check distance from existing planets
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
            
            // Fallback if we can't find a valid position
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

    /**
     * Start the game
     */
    startGame() {
        this.gameState = 'playing';
        this.gameStartTime = performance.now();
        this.gameStats.gameStartTime = this.gameStartTime;
        this.isRunning = true;
        
        // Start game loop
        this.gameLoopId = requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
        
        Utils.debugLog('GAME_START', 'Game started');
    }

    /**
     * Main game loop
     * @param {number} timestamp - Current timestamp
     */
    gameLoop(timestamp) {
        if (!this.isRunning) return;
        
        // Calculate delta time
        const deltaTime = this.lastUpdateTime === 0 ? 0 : timestamp - this.lastUpdateTime;
        this.lastUpdateTime = timestamp;
        
        // Limit delta time to prevent large jumps
        const clampedDeltaTime = Math.min(deltaTime, 100);
        
        // Update game systems
        this.update(clampedDeltaTime);
        
        // Update performance stats
        Utils.Performance.update();
        
        // Continue game loop
        this.gameLoopId = requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    /**
     * Update all game systems
     * @param {number} deltaTime - Time elapsed since last update (ms)
     */
    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        const updateStart = performance.now();
        
        // Update planets
        this.updatePlanets(deltaTime);
        
        // Update fleets
        this.updateFleets(deltaTime);
        
        // Update AI
        this.aiController.update(deltaTime);
        
        // Update UI
        this.uiController.update(deltaTime);
        
        // Update game statistics
        this.updateGameStats(deltaTime);
        
        // Check win/lose conditions
        this.checkGameEnd();
        
        // Performance tracking
        this.performanceStats.updateTime = performance.now() - updateStart;
    }

    /**
     * Update all planets
     * @param {number} deltaTime - Time elapsed since last update (ms)
     */
    updatePlanets(deltaTime) {
        this.planets.forEach(planet => {
            planet.update(deltaTime);
        });
    }

    /**
     * Update all fleets
     * @param {number} deltaTime - Time elapsed since last update (ms)
     */
    updateFleets(deltaTime) {
        // Update fleets and remove completed ones
        for (let i = this.fleets.length - 1; i >= 0; i--) {
            const fleet = this.fleets[i];
            const hasArrived = fleet.update(deltaTime);
            
            if (hasArrived) {
                fleet.destroy();
                this.fleets.splice(i, 1);
            }
        }
    }

    /**
     * Update game statistics
     * @param {number} deltaTime - Time elapsed since last update (ms)
     */
    updateGameStats(deltaTime) {
        this.gameStats.gameDuration = performance.now() - this.gameStartTime;
        
        // Count planets and ships
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

    /**
     * Check for game end conditions
     */
    checkGameEnd() {
        const playerPlanets = this.planets.filter(p => p.owner === 'player').length;
        const aiPlanets = this.planets.filter(p => p.owner === 'ai').length;
        
        if (playerPlanets === 0) {
            this.endGame('defeat');
        } else if (aiPlanets === 0) {
            this.endGame('victory');
        }
    }

    /**
     * End the game
     * @param {string} result - 'victory' or 'defeat'
     */
    endGame(result) {
        this.gameState = result;
        this.isRunning = false;
        
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
        
        // Show game over modal
        this.uiController.showGameOverModal(result, this.gameStats);
        
        Utils.debugLog('GAME_END', `Game ended: ${result}`);
    }

    /**
     * Handle mouse down event
     * @param {MouseEvent} event - Mouse event
     */
    onMouseDown(event) {
        if (this.gameState !== 'playing') return;
        
        const pos = Utils.getMousePosition(event, this.canvas);
        const planet = this.getPlanetAtPosition(pos.x, pos.y);
        
        this.inputState.mouseDown = true;
        this.inputState.dragStart = pos;
        this.inputState.selectedPlanet = planet;
        
        // Only start drag from player planets with ships
        if (planet && planet.owner === 'player' && planet.ships > 0) {
            // Valid drag start
        } else {
            this.inputState.selectedPlanet = null;
        }
    }

    /**
     * Handle mouse move event
     * @param {MouseEvent} event - Mouse event
     */
    onMouseMove(event) {
        if (this.gameState !== 'playing') return;
        
        const pos = Utils.getMousePosition(event, this.canvas);
        
        if (this.inputState.mouseDown && this.inputState.selectedPlanet) {
            this.inputState.dragCurrent = pos;
            
            // Check if we've moved enough to start dragging
            const dragDistance = Utils.distance(
                this.inputState.dragStart.x, this.inputState.dragStart.y,
                pos.x, pos.y
            );
            
            if (dragDistance > this.inputState.dragThreshold) {
                this.updateDragLine();
            }
        }
    }

    /**
     * Handle mouse up event
     * @param {MouseEvent} event - Mouse event
     */
    onMouseUp(event) {
        if (this.gameState !== 'playing') return;
        
        const pos = Utils.getMousePosition(event, this.canvas);
        
        if (this.inputState.mouseDown && this.inputState.selectedPlanet && this.inputState.dragCurrent) {
            // Check if we're over a target planet
            const targetPlanet = this.getPlanetAtPosition(pos.x, pos.y);
            
            if (targetPlanet && targetPlanet !== this.inputState.selectedPlanet) {
                this.handleFleetLaunch(this.inputState.selectedPlanet, targetPlanet);
            }
        }
        
        // Reset input state
        this.resetInputState();
    }

    /**
     * Handle mouse leave event
     * @param {MouseEvent} event - Mouse event
     */
    onMouseLeave(event) {
        this.resetInputState();
    }

    /**
     * Reset input state
     */
    resetInputState() {
        this.inputState.mouseDown = false;
        this.inputState.dragStart = null;
        this.inputState.dragCurrent = null;
        this.inputState.selectedPlanet = null;
        
        // Remove drag line if exists
        if (this.inputState.dragLine) {
            this.inputState.dragLine.remove();
            this.inputState.dragLine = null;
        }
    }

    /**
     * Update drag line visual
     */
    updateDragLine() {
        if (!this.inputState.dragStart || !this.inputState.dragCurrent || !this.inputState.selectedPlanet) return;
        
        // Remove existing drag line
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

    /**
     * Get planet at specific position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Planet|null} Planet at position or null
     */
    getPlanetAtPosition(x, y) {
        for (const planet of this.planets) {
            if (Utils.pointInCircle(x, y, planet.x, planet.y, planet.radius)) {
                return planet;
            }
        }
        return null;
    }

    /**
     * Handle fleet launch
     * @param {Planet} source - Source planet
     * @param {Planet} target - Target planet
     */
    handleFleetLaunch(source, target) {
        if (source.owner !== 'player' || source.ships === 0) return;
        
        // Calculate ships to send based on target capacity
        let shipsToSend = target.capacity;
        
        // If target is neutral or enemy, send exactly target capacity or available ships
        if (target.owner !== 'player') {
            shipsToSend = Math.min(target.capacity, source.ships);
        } else {
            // If target is friendly, send ships to fill capacity
            const availableSpace = target.capacity - target.ships;
            shipsToSend = Math.min(availableSpace, source.ships - 1); // Keep at least 1 ship
        }
        
        if (shipsToSend > 0) {
            this.sendFleet(source, target, shipsToSend, 'player');
        }
    }

    /**
     * Send fleet from one planet to another
     * @param {Planet} source - Source planet
     * @param {Planet} target - Target planet
     * @param {number} ships - Number of ships to send
     * @param {string} owner - Fleet owner
     */
    sendFleet(source, target, ships, owner) {
        if (!source.canSendShips(ships)) {
            Utils.debugLog('FLEET_ERROR', `Cannot send ${ships} ships from ${source.getId()}`);
            return;
        }
        
        // Remove ships from source
        const actualShips = source.removeShips(ships);
        
        // Create fleet
        const fleet = new Fleet(source, target, actualShips, owner);
        this.fleets.push(fleet);
        
        // Update statistics
        this.gameStats.fleetsLaunched++;
        
        Utils.debugLog('FLEET_LAUNCH', `${owner} sent ${actualShips} ships from ${source.getId()} to ${target.getId()}`);
    }

    /**
     * Touch event handlers for mobile support
     */
    onTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.onMouseDown(mouseEvent);
    }

    onTouchMove(event) {
        event.preventDefault();
        const touch = event.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.onMouseMove(mouseEvent);
    }

    onTouchEnd(event) {
        event.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {
            clientX: 0,
            clientY: 0
        });
        this.onMouseUp(mouseEvent);
    }

    /**
     * Get current game state
     * @returns {string} Current game state
     */
    getGameState() {
        return this.gameState;
    }

    /**
     * Get game statistics
     * @returns {Object} Game statistics
     */
    getGameStats() {
        return { ...this.gameStats };
    }

    /**
     * Pause the game
     */
    pause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            Utils.debugLog('GAME_PAUSE', 'Game paused');
        }
    }

    /**
     * Resume the game
     */
    resume() {
        if (this.gameState === 'paused') {
            this.gameState = 'playing';
            Utils.debugLog('GAME_RESUME', 'Game resumed');
        }
    }

    /**
     * Restart the game
     */
    restart() {
        Utils.debugLog('GAME_RESTART', 'Restarting game...');
        
        // Stop current game
        this.isRunning = false;
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
        }
        
        // Clear game objects
        this.fleets.forEach(fleet => fleet.destroy());
        this.planets.forEach(planet => planet.destroy());
        this.fleets = [];
        this.planets = [];
        
        // Reset controllers
        this.aiController.reset();
        this.uiController.reset();
        
        // Reset input state
        this.resetInputState();
        
        // Reset game state
        this.gameState = 'initializing';
        this.lastUpdateTime = 0;
        
        // Reset statistics
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
        
        // Regenerate world and restart
        this.generateWorld();
        this.startGame();
        
        Utils.debugLog('GAME_RESTART', 'Game restarted successfully');
    }

    /**
     * Handle planet mouse down for drag functionality
     * @param {Planet} planet - Planet that was clicked
     * @param {MouseEvent} event - Mouse event
     */
    onPlanetMouseDown(planet, event) {
        // This method is called by Planet class
        // Implementation handled in main mouse event handlers
    }

    /**
     * Get debug information
     * @returns {Object} Debug information
     */
    getDebugInfo() {
        return {
            gameState: this.gameState,
            planetsCount: this.planets.length,
            fleetsCount: this.fleets.length,
            gameStats: this.gameStats,
            performanceStats: this.performanceStats,
            inputState: this.inputState,
            aiStats: this.aiController ? this.aiController.getStats() : null
        };
    }

    /**
     * Cleanup game engine
     */
    destroy() {
        // Stop game loop
        this.isRunning = false;
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
        }
        
        // Cleanup game objects
        this.fleets.forEach(fleet => fleet.destroy());
        this.planets.forEach(planet => planet.destroy());
        
        // Cleanup controllers
        if (this.uiController) {
            this.uiController.destroy();
        }
        
        Utils.debugLog('GAME_DESTROY', 'Game engine destroyed');
    }
}

// Make GameEngine globally available
window.GameEngine = GameEngine;