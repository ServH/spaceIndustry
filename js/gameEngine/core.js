/**
 * GameEngine Core Module - Main game state and initialization
 */
class GameEngineCore {
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
    }

    initialize() {
        Utils.debugLog('GAME_INIT', 'Initializing RTS-style game engine...');
        
        // Initialize controllers
        this.uiController = new UIController(this);
        this.aiController = new AIController(this);
        
        // Setup canvas
        this.setupCanvas();
        
        // Generate world
        this.generateWorld();
        this.setupKeyboardMappings();
        
        // Start game
        this.startGame();
        
        Utils.debugLog('GAME_INIT', 'RTS game engine initialized successfully');
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

    // GAME LOOP
    startGame() {
        this.gameState = 'playing';
        this.gameStartTime = performance.now();
        this.gameStats.gameStartTime = this.gameStartTime;
        this.isRunning = true;
        
        this.gameLoopId = requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
        
        if (this.uiController) {
            this.uiController.showNotification(
                'Arrastra desde tus planetas verdes hacia el objetivo',
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

window.GameEngineCore = GameEngineCore;