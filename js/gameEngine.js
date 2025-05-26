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
        
        // Keyboard selection system
        this.keyboardState = {
            selectedPlanet: null,
            awaitingTarget: false,
            planetMap: new Map() // letter -> planet mapping
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
        
        // Setup keyboard mappings
        this.setupKeyboardMappings();
        
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
        
        // Keyboard events for planet selection
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // Global click to deselect
        document.addEventListener('click', (e) => this.onDocumentClick(e));
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
     * Setup keyboard mappings for planets
     */
    setupKeyboardMappings() {
        this.keyboardState.planetMap.clear();
        
        // Create mapping of letters to planets
        this.planets.forEach(planet => {
            this.keyboardState.planetMap.set(planet.getLetter().toLowerCase(), planet);
        });
        
        Utils.debugLog('KEYBOARD', 'Planet keyboard mappings created:', Array.from(this.keyboardState.planetMap.keys()));
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
        
        // Show instruction notification
        if (this.uiController) {
            this.uiController.showNotification(
                'Arrastra desde tus planetas o usa las teclas de las letras para seleccionar',
                'info',
                4000
            );
        }
        
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
        
        // Clear selections
        this.clearAllSelections();
        
        // Show game over modal
        this.uiController.showGameOverModal(result, this.gameStats);
        
        Utils.debugLog('GAME_END', `Game ended: ${result}`);
    }

    /**
     * Handle keyboard input
     * @param {KeyboardEvent} event - Keyboard event
     */
    onKeyDown(event) {
        if (this.gameState !== 'playing') return;
        
        const key = event.key.toLowerCase();
        
        // Check if it's a planet selection key
        if (this.keyboardState.planetMap.has(key)) {
            const planet = this.keyboardState.planetMap.get(key);
            
            if (this.keyboardState.awaitingTarget) {
                // Execute attack on target planet
                this.executeKeyboardAttack(planet);
            } else {
                // Select planet as source
                this.selectPlanetKeyboard(planet);
            }
            
            event.preventDefault();
            return;
        }
        
        // Special keys
        switch (key) {
            case 'escape':
                this.clearAllSelections();
                event.preventDefault();
                break;
                
            case ' ':
                // Spacebar to deselect
                this.clearAllSelections();
                event.preventDefault();
                break;
        }
    }

    /**
     * Handle key up events
     * @param {KeyboardEvent} event - Keyboard event
     */
    onKeyUp(event) {
        // Reserved for future use
    }

    /**
     * Select planet via keyboard
     * @param {Planet} planet - Planet to select
     */
    selectPlanetKeyboard(planet) {
        // Can only select player planets with ships
        if (planet.owner !== 'player' || planet.ships === 0) {
            this.uiController.showNotification(
                'Solo puedes seleccionar tus planetas con naves',
                'warning',
                2000
            );
            return;
        }
        
        // Clear previous selections
        this.clearAllSelections();
        
        // Select planet
        this.keyboardState.selectedPlanet = planet;
        this.keyboardState.awaitingTarget = true;
        planet.select();
        
        // Show status
        this.uiController.showNotification(
            `Planeta ${planet.getLetter()} seleccionado. Presiona otra tecla para atacar.`,
            'info',
            3000
        );
        
        Utils.debugLog('KEYBOARD_SELECT', `Planet ${planet.getLetter()} selected`);
    }

    /**
     * Execute keyboard attack
     * @param {Planet} targetPlanet - Target planet
     */
    executeKeyboardAttack(targetPlanet) {
        const sourcePlanet = this.keyboardState.selectedPlanet;
        
        if (!sourcePlanet) return;
        
        // Can't attack self
        if (sourcePlanet === targetPlanet) {
            this.uiController.showNotification(
                'No puedes atacar el mismo planeta',
                'warning',
                2000
            );
            return;
        }
        
        // Execute attack
        this.handleFleetLaunch(sourcePlanet, targetPlanet);
        
        // Clear selections
        this.clearAllSelections();
        
        Utils.debugLog('KEYBOARD_ATTACK', `Attack from ${sourcePlanet.getLetter()} to ${targetPlanet.getLetter()}`);
    }

    /**
     * Clear all selections
     */
    clearAllSelections() {
        // Clear keyboard selection
        if (this.keyboardState.selectedPlanet) {
            this.keyboardState.selectedPlanet.deselect();
        }
        this.keyboardState.selectedPlanet = null;
        this.keyboardState.awaitingTarget = false;
        
        // Clear mouse selection
        this.resetInputState();
    }

    /**
     * Handle document click for deselection
     * @param {MouseEvent} event - Click event
     */
    onDocumentClick(event) {
        // Only clear if clicking outside canvas or on empty space
        if (!this.canvas.contains(event.target)) {
            this.clearAllSelections();
        }
    }

    /**
     * Handle planet click
     * @param {Planet} planet - Clicked planet
     * @param {MouseEvent} event - Mouse event
     */
    onPlanetClick(planet, event) {
        if (this.gameState !== 'playing') return;
        
        event.stopPropagation();
        
        if (this.keyboardState.awaitingTarget) {
            // Execute keyboard attack
            this.executeKeyboardAttack(planet);
        } else if (planet.owner === 'player' && planet.ships > 0) {
            // Select planet
            this.selectPlanetKeyboard(planet);
        }
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
        
        // Clear keyboard selection when starting mouse interaction
        if (this.keyboardState.selectedPlanet) {
            this.clearAllSelections();
        }
        
        // Only start drag from player planets with ships
        if (planet && planet.owner === 'player' && planet.ships > 0) {
            // Valid drag start - planet will be highlighted
            planet.select();
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
        // Deselect planet if it was selected via mouse
        if (this.inputState.selectedPlanet && !this.keyboardState.selectedPlanet) {
            this.inputState.selectedPlanet.deselect();
        }
        
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
        
        // Calculate ships to send based on game rules
        let shipsToSend;
        
        if (target.owner === 'neutral') {
            // For neutral planets, send 1 ship to conquer
            shipsToSend = Math.min(1, source.ships);
        } else if (target.owner === 'ai') {
            // For enemy planets, send enough to overcome + buffer
            shipsToSend = Math.min(target.ships + 1, source.ships);
        } else {
            // For friendly planets, fill to capacity
            const availableSpace = target.capacity - target.ships;
            shipsToSend = Math.min(availableSpace, source.ships - 1); // Keep at least 1
        }
        
        if (shipsToSend > 0) {
            this.sendFleet(source, target, shipsToSend, 'player');
            
            // Show feedback
            this.uiController.showNotification(
                `${shipsToSend} naves enviadas de ${source.getLetter()} a ${target.getLetter()}`,
                'success',
                2000
            );
        } else {
            this.uiController.showNotification(
                'No hay naves suficientes para el ataque',
                'warning',
                2000
            );
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
     * Handle planet mouse down for drag functionality
     * @param {Planet} planet - Planet that was clicked
     * @param {MouseEvent} event - Mouse event
     */
    onPlanetMouseDown(planet, event) {
        // This is handled in the main mouse down handler
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
        
        // Reset input states
        this.resetInputState();
        this.clearAllSelections();
        
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
        this.setupKeyboardMappings();
        this.startGame();
        
        Utils.debugLog('GAME_RESTART', 'Game restarted successfully');
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
            keyboardState: {
                selectedPlanet: this.keyboardState.selectedPlanet ? this.keyboardState.selectedPlanet.getLetter() : null,
                awaitingTarget: this.keyboardState.awaitingTarget,
                planetMappings: Array.from(this.keyboardState.planetMap.keys())
            },
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
        
        // Remove event listeners
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('click', this.onDocumentClick);
        
        Utils.debugLog('GAME_DESTROY', 'Game engine destroyed');
    }
}

// Make GameEngine globally available
window.GameEngine = GameEngine;