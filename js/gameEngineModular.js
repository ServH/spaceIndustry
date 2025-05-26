/**
 * ====================================
 * SPACE CONQUEST - MODULAR GAME ENGINE
 * ====================================
 * 
 * Main GameEngine class that combines all modules
 */

class GameEngine extends GameEngineCore {
    constructor() {
        super();
        
        // Initialize module handlers
        this.inputHandler = null;
        this.worldHandler = null;
        
        // Start initialization
        this.initialize();
    }

    initialize() {
        Utils.debugLog('GAME_INIT', 'Initializing modular RTS game engine...');
        
        // Initialize controllers first
        this.uiController = new UIController(this);
        this.aiController = new AIController(this);
        
        // Setup canvas
        this.setupCanvas();
        
        // Initialize module handlers
        this.worldHandler = new GameEngineWorld(this);
        this.inputHandler = new GameEngineInput(this);
        
        // Generate world and setup
        this.worldHandler.generateWorld();
        this.inputHandler.setupKeyboardMappings();
        
        // Start game
        this.startGame();
        
        Utils.debugLog('GAME_INIT', 'Modular RTS game engine initialized successfully');
    }

    // Delegate methods to appropriate modules
    handleFleetLaunch(source, target) {
        return this.worldHandler.handleFleetLaunch(source, target);
    }

    sendFleet(source, target, ships, owner) {
        return this.worldHandler.sendFleet(source, target, ships, owner);
    }

    onPlanetClick(planet, event) {
        return this.worldHandler.onPlanetClick(planet, event);
    }

    onPlanetMouseDown(planet, event) {
        return this.worldHandler.onPlanetMouseDown(planet, event);
    }

    generateWorld() {
        return this.worldHandler.generateWorld();
    }

    setupKeyboardMappings() {
        return this.inputHandler.setupKeyboardMappings();
    }

    // Override restart to handle modules
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
        
        // Reset module handlers
        if (this.inputHandler) {
            this.inputHandler.reset();
        }
        
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
        
        this.worldHandler.generateWorld();
        this.inputHandler.setupKeyboardMappings();
        this.startGame();
    }

    // Override destroy to handle modules
    destroy() {
        super.destroy();
        
        if (this.inputHandler) {
            this.inputHandler.reset();
        }
    }

    // Enhanced debug info including modules
    getDebugInfo() {
        const baseInfo = {
            gameState: this.gameState,
            planetsCount: this.planets.length,
            fleetsCount: this.fleets.length,
            gameStats: this.gameStats
        };
        
        if (this.inputHandler) {
            baseInfo.inputModule = this.inputHandler.getDebugInfo();
        }
        
        return baseInfo;
    }
}

// Make GameEngine globally available
window.GameEngine = GameEngine;