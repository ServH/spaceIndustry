/**
 * ====================================
 * SPACE CONQUEST - AI CONTROLLER
 * ====================================
 * 
 * Handles AI decision making, strategy, and actions.
 * Implements various difficulty levels and tactical behaviors.
 */

class AIController {
    /**
     * Create AI controller
     * @param {GameEngine} gameEngine - Reference to game engine
     * @param {string} difficulty - AI difficulty level
     */
    constructor(gameEngine, difficulty = 'normal') {
        this.gameEngine = gameEngine;
        this.difficulty = difficulty;
        this.config = CONFIG.getDifficulty(difficulty);
        
        // AI state
        this.lastActionTime = 0;
        this.strategy = 'balanced'; // 'aggressive', 'defensive', 'balanced', 'expansion'
        this.targetPriorities = new Map();
        this.threatAssessment = new Map();
        
        // Decision making
        this.decisionHistory = [];
        this.maxHistorySize = 10;
        
        // Performance tracking
        this.stats = {
            actionsPerformed: 0,
            planetsConquered: 0,
            planetsLost: 0,
            shipsLost: 0,
            averageResponseTime: 0
        };
        
        Utils.debugLog('AI_INIT', `AI initialized with ${difficulty} difficulty`);
    }

    /**
     * Update AI decision making
     * @param {number} deltaTime - Time elapsed since last update (ms)
     */
    update(deltaTime) {
        this.lastActionTime += deltaTime;
        
        // Check if it's time to make a decision
        if (this.lastActionTime >= this.config.AI_ACTION_INTERVAL) {
            this.makeDecision();
            this.lastActionTime = 0;
        }
        
        // Update threat assessments
        this.updateThreatAssessment();
    }

    /**
     * Make strategic decision
     */
    makeDecision() {
        const startTime = performance.now();
        
        // Analyze current game state
        const gameState = this.analyzeGameState();
        
        // Determine strategy based on game state
        this.updateStrategy(gameState);
        
        // Find best action to take
        const action = this.selectBestAction(gameState);
        
        // Execute action if found
        if (action) {
            this.executeAction(action);
            this.recordDecision(action);
        }
        
        // Update performance stats
        const responseTime = performance.now() - startTime;
        this.updateStats(responseTime);
        
        Utils.debugLog('AI_DECISION', `Strategy: ${this.strategy}, Action: ${action ? action.type : 'none'}, Time: ${responseTime.toFixed(2)}ms`);
    }

    /**
     * Analyze current game state
     * @returns {Object} Game state analysis
     */
    analyzeGameState() {
        const planets = this.gameEngine.planets;
        const myPlanets = planets.filter(p => p.owner === 'ai');
        const playerPlanets = planets.filter(p => p.owner === 'player');
        const neutralPlanets = planets.filter(p => p.owner === 'neutral');
        
        // Calculate total ships
        const myTotalShips = myPlanets.reduce((sum, p) => sum + p.ships, 0);
        const playerTotalShips = playerPlanets.reduce((sum, p) => sum + p.ships, 0);
        
        // Calculate production capacity
        const myProduction = myPlanets.reduce((sum, p) => sum + p.shipGenerationRate, 0);
        const playerProduction = playerPlanets.reduce((sum, p) => sum + p.shipGenerationRate, 0);
        
        // Assess threats
        const threats = this.assessThreats(myPlanets, playerPlanets);
        
        return {
            planets: {
                mine: myPlanets,
                player: playerPlanets,
                neutral: neutralPlanets,
                total: planets.length
            },
            ships: {
                mine: myTotalShips,
                player: playerTotalShips,
                ratio: myTotalShips / Math.max(playerTotalShips, 1)
            },
            production: {
                mine: myProduction,
                player: playerProduction,
                ratio: myProduction / Math.max(playerProduction, 1)
            },
            threats: threats,
            gamePhase: this.determineGamePhase(myPlanets, playerPlanets, neutralPlanets)
        };
    }

    /**
     * Assess threats to AI planets
     * @param {Array} myPlanets - AI controlled planets
     * @param {Array} playerPlanets - Player controlled planets
     * @returns {Array} List of threats
     */
    assessThreats(myPlanets, playerPlanets) {
        const threats = [];
        
        myPlanets.forEach(myPlanet => {
            playerPlanets.forEach(playerPlanet => {
                const distance = Utils.distance(myPlanet.x, myPlanet.y, playerPlanet.x, playerPlanet.y);
                const threatLevel = this.calculateThreatLevel(playerPlanet, myPlanet, distance);
                
                if (threatLevel > 0.3) {
                    threats.push({
                        source: playerPlanet,
                        target: myPlanet,
                        distance: distance,
                        level: threatLevel
                    });
                }
            });
        });
        
        return threats.sort((a, b) => b.level - a.level);
    }

    /**
     * Calculate threat level from one planet to another
     * @param {Planet} attacker - Attacking planet
     * @param {Planet} target - Target planet
     * @param {number} distance - Distance between planets
     * @returns {number} Threat level (0-1)
     */
    calculateThreatLevel(attacker, target, distance) {
        const shipRatio = attacker.ships / Math.max(target.ships, 1);
        const distanceFactor = Math.max(0, 1 - distance / 500); // Closer = more threatening
        const capacityFactor = attacker.capacity / Math.max(target.capacity, 1);
        
        return (shipRatio * 0.5 + distanceFactor * 0.3 + capacityFactor * 0.2);
    }

    /**
     * Determine current game phase
     * @param {Array} myPlanets - AI planets
     * @param {Array} playerPlanets - Player planets
     * @param {Array} neutralPlanets - Neutral planets
     * @returns {string} Game phase
     */
    determineGamePhase(myPlanets, playerPlanets, neutralPlanets) {
        if (neutralPlanets.length > playerPlanets.length + myPlanets.length) {
            return 'expansion';
        } else if (neutralPlanets.length > 0) {
            return 'midgame';
        } else {
            return 'endgame';
        }
    }

    /**
     * Update AI strategy based on game state
     * @param {Object} gameState - Current game state analysis
     */
    updateStrategy(gameState) {
        const shipRatio = gameState.ships.ratio;
        const productionRatio = gameState.production.ratio;
        const threatCount = gameState.threats.length;
        
        // Determine strategy based on situation
        if (shipRatio < 0.5 || threatCount > 2) {
            this.strategy = 'defensive';
        } else if (shipRatio > 1.5 && gameState.gamePhase === 'expansion') {
            this.strategy = 'aggressive';
        } else if (gameState.gamePhase === 'expansion' && gameState.planets.neutral.length > 0) {
            this.strategy = 'expansion';
        } else {
            this.strategy = 'balanced';
        }
    }

    /**
     * Select best action to perform
     * @param {Object} gameState - Current game state analysis
     * @returns {Object|null} Action to perform
     */
    selectBestAction(gameState) {
        const possibleActions = this.generatePossibleActions(gameState);
        
        if (possibleActions.length === 0) {
            return null;
        }
        
        // Score and rank actions
        const scoredActions = possibleActions.map(action => ({
            ...action,
            score: this.scoreAction(action, gameState)
        }));
        
        // Sort by score (highest first)
        scoredActions.sort((a, b) => b.score - a.score);
        
        // Add some randomness to prevent predictable behavior
        const randomFactor = this.config.DECISION_RANDOMNESS;
        const topActions = scoredActions.slice(0, Math.max(1, Math.floor(scoredActions.length * 0.3)));
        
        if (Math.random() < randomFactor && topActions.length > 1) {
            return Utils.randomElement(topActions);
        }
        
        return scoredActions[0];
    }

    /**
     * Generate possible actions AI can take
     * @param {Object} gameState - Current game state analysis
     * @returns {Array} List of possible actions
     */
    generatePossibleActions(gameState) {
        const actions = [];
        const myPlanets = gameState.planets.mine;
        const allTargets = [...gameState.planets.player, ...gameState.planets.neutral];
        
        myPlanets.forEach(sourcePlanet => {
            if (sourcePlanet.ships > 1) { // Keep at least 1 ship for defense
                allTargets.forEach(targetPlanet => {
                    const shipsToSend = this.calculateOptimalShipCount(sourcePlanet, targetPlanet);
                    
                    if (shipsToSend > 0) {
                        actions.push({
                            type: 'attack',
                            source: sourcePlanet,
                            target: targetPlanet,
                            ships: shipsToSend,
                            distance: Utils.distance(sourcePlanet.x, sourcePlanet.y, targetPlanet.x, targetPlanet.y)
                        });
                    }
                });
            }
        });
        
        return actions;
    }

    /**
     * Calculate optimal ship count for an attack
     * @param {Planet} source - Source planet
     * @param {Planet} target - Target planet
     * @returns {number} Optimal ship count
     */
    calculateOptimalShipCount(source, target) {
        let requiredShips;
        
        if (target.owner === 'neutral') {
            // For neutral planets, send just enough to conquer
            requiredShips = 1;
        } else {
            // For enemy planets, send enough to win + buffer
            const buffer = Math.ceil(target.ships * 0.2); // 20% buffer
            requiredShips = target.ships + buffer + 1;
        }
        
        // Don't send more ships than we have (leave at least 1 for defense)
        const availableShips = source.ships - 1;
        
        return Math.min(requiredShips, availableShips);
    }

    /**
     * Score an action based on strategic value
     * @param {Object} action - Action to score
     * @param {Object} gameState - Current game state
     * @returns {number} Action score
     */
    scoreAction(action, gameState) {
        let score = 0;
        const { source, target, ships, distance } = action;
        
        // Base score factors
        const distancePenalty = distance / 100; // Prefer closer targets
        const capacityValue = target.capacity * 10; // Prefer larger planets
        const shipEfficiency = ships > 0 ? (target.capacity / ships) : 0; // Efficiency ratio
        
        // Strategic modifiers based on current strategy
        switch (this.strategy) {
            case 'aggressive':
                score += target.owner === 'player' ? 50 : 20; // Prefer attacking player
                score += capacityValue * 1.5;
                break;
                
            case 'defensive':
                // Prefer actions that eliminate nearby threats
                const threatLevel = this.threatAssessment.get(target.getId()) || 0;
                score += threatLevel * 100;
                score -= distancePenalty * 2; // Strongly prefer close targets
                break;
                
            case 'expansion':
                score += target.owner === 'neutral' ? 40 : 10; // Strongly prefer neutral planets
                score += capacityValue;
                break;
                
            case 'balanced':
            default:
                score += target.owner === 'neutral' ? 30 : 25;
                score += capacityValue;
                break;
        }
        
        // Common modifiers
        score -= distancePenalty;
        score += shipEfficiency * 5;
        
        // Success probability
        const successProbability = this.calculateSuccessProbability(action);
        score *= successProbability;
        
        // Avoid repeated actions
        if (this.wasRecentAction(action)) {
            score *= 0.5;
        }
        
        return score;
    }

    /**
     * Calculate probability of action success
     * @param {Object} action - Action to evaluate
     * @returns {number} Success probability (0-1)
     */
    calculateSuccessProbability(action) {
        const { target, ships } = action;
        
        if (target.owner === 'neutral') {
            return 0.9; // High chance for neutral planets
        }
        
        // For enemy planets, calculate based on ship ratio
        const ratio = ships / Math.max(target.ships, 1);
        
        if (ratio >= 2) return 0.9;
        if (ratio >= 1.5) return 0.8;
        if (ratio >= 1.2) return 0.6;
        if (ratio >= 1) return 0.4;
        
        return 0.2;
    }

    /**
     * Check if similar action was performed recently
     * @param {Object} action - Action to check
     * @returns {boolean} True if similar action was recent
     */
    wasRecentAction(action) {
        return this.decisionHistory.some(decision => 
            decision.source.getId() === action.source.getId() &&
            decision.target.getId() === action.target.getId() &&
            Date.now() - decision.timestamp < 10000 // Within last 10 seconds
        );
    }

    /**
     * Execute the selected action
     * @param {Object} action - Action to execute
     */
    executeAction(action) {
        const { source, target, ships } = action;
        
        // Validate action is still possible
        if (!source.canSendShips(ships)) {
            Utils.debugLog('AI_ACTION_FAILED', `Cannot send ${ships} ships from ${source.getId()}`);
            return;
        }
        
        // Execute through game engine
        this.gameEngine.sendFleet(source, target, ships, 'ai');
        
        // Update stats
        this.stats.actionsPerformed++;
        
        Utils.debugLog('AI_ACTION', `AI sent ${ships} ships from ${source.getId()} to ${target.getId()}`);
    }

    /**
     * Record decision for future reference
     * @param {Object} action - Action that was taken
     */
    recordDecision(action) {
        this.decisionHistory.push({
            ...action,
            timestamp: Date.now(),
            strategy: this.strategy
        });
        
        // Keep history manageable
        if (this.decisionHistory.length > this.maxHistorySize) {
            this.decisionHistory.shift();
        }
    }

    /**
     * Update threat assessment for all planets
     */
    updateThreatAssessment() {
        const planets = this.gameEngine.planets;
        const playerPlanets = planets.filter(p => p.owner === 'player');
        
        this.threatAssessment.clear();
        
        playerPlanets.forEach(planet => {
            const threat = this.calculateOverallThreat(planet);
            this.threatAssessment.set(planet.getId(), threat);
        });
    }

    /**
     * Calculate overall threat level of a planet
     * @param {Planet} planet - Planet to assess
     * @returns {number} Overall threat level
     */
    calculateOverallThreat(planet) {
        const myPlanets = this.gameEngine.planets.filter(p => p.owner === 'ai');
        
        let maxThreat = 0;
        myPlanets.forEach(myPlanet => {
            const distance = Utils.distance(planet.x, planet.y, myPlanet.x, myPlanet.y);
            const threat = this.calculateThreatLevel(planet, myPlanet, distance);
            maxThreat = Math.max(maxThreat, threat);
        });
        
        return maxThreat;
    }

    /**
     * Update AI performance statistics
     * @param {number} responseTime - Time taken for decision making
     */
    updateStats(responseTime) {
        const alpha = 0.1; // Smoothing factor for running average
        this.stats.averageResponseTime = this.stats.averageResponseTime * (1 - alpha) + responseTime * alpha;
    }

    /**
     * Handle planet conquest events
     * @param {Planet} planet - Planet that was conquered
     * @param {string} newOwner - New owner of the planet
     * @param {string} oldOwner - Previous owner of the planet
     */
    onPlanetConquered(planet, newOwner, oldOwner) {
        if (newOwner === 'ai') {
            this.stats.planetsConquered++;
        } else if (oldOwner === 'ai') {
            this.stats.planetsLost++;
        }
        
        // Update threat assessments after ownership changes
        this.updateThreatAssessment();
    }

    /**
     * Get AI performance statistics
     * @returns {Object} AI statistics
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Get current AI state for debugging
     * @returns {Object} AI state information
     */
    getDebugInfo() {
        return {
            difficulty: this.difficulty,
            strategy: this.strategy,
            lastActionTime: this.lastActionTime,
            decisionHistoryLength: this.decisionHistory.length,
            threatCount: this.threatAssessment.size,
            stats: this.stats
        };
    }

    /**
     * Reset AI state (for new games)
     */
    reset() {
        this.lastActionTime = 0;
        this.strategy = 'balanced';
        this.targetPriorities.clear();
        this.threatAssessment.clear();
        this.decisionHistory = [];
        
        // Reset stats
        this.stats = {
            actionsPerformed: 0,
            planetsConquered: 0,
            planetsLost: 0,
            shipsLost: 0,
            averageResponseTime: 0
        };
        
        Utils.debugLog('AI_RESET', 'AI state has been reset');
    }

    /**
     * Set AI difficulty level
     * @param {string} difficulty - New difficulty level
     */
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.config = CONFIG.getDifficulty(difficulty);
        Utils.debugLog('AI_DIFFICULTY', `AI difficulty set to ${difficulty}`);
    }
}

// Make AIController globally available
window.AIController = AIController;