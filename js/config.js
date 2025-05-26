/**
 * ====================================
 * SPACE CONQUEST - GAME CONFIGURATION
 * ====================================
 * 
 * Centralizes all game configuration values for easy balancing
 * and modification without touching core game logic.
 */

const CONFIG = {
    // ============ PLANET SETTINGS ============
    PLANET: {
        // Available planet capacities (ships each planet can hold)
        CAPACITIES: [6, 8, 10, 12, 15, 20],
        
        // Planet generation settings
        COUNT: 7,              // Total number of planets (including player and AI starting planets)
        MIN_DISTANCE: 120,     // Minimum distance between planets (pixels)
        MARGIN: 100,           // Margin from screen edges (pixels)
        
        // Planet size calculation
        BASE_RADIUS: 15,       // Base planet radius (pixels)
        RADIUS_MULTIPLIER: 4,  // Multiplier for capacity-based radius scaling
        
        // Visual settings
        STROKE_WIDTH: 2,       // Planet border width
        TEXT_SIZE: 14,         // Ship count text size
        CAPACITY_TEXT_SIZE: 10 // Capacity text size
    },

    // ============ SHIP SETTINGS ============
    SHIP: {
        // Ship generation rates
        GENERATION_BASE: 0.8,        // Base ships per second
        GENERATION_MULTIPLIER: 0.12, // Additional rate per planet capacity point
        
        // Ship movement
        SPEED: 120,                  // Pixels per second
        VISUAL_SIZE: 2,              // Visual size of ships in transit
        
        // Starting conditions
        INITIAL_COUNT: 10            // Starting ships for player and AI
    },

    // ============ CONQUEST SETTINGS ============
    CONQUEST: {
        // Timing
        NEUTRAL_TIME: 3000,    // Time to conquer neutral planet (ms)
        BATTLE_TIME: 1500,     // Time for battle resolution (ms)
        
        // Mechanics
        MIN_SHIPS_TO_ATTACK: 1 // Minimum ships needed to launch attack
    },

    // ============ AI SETTINGS ============
    AI: {
        // Decision making
        ACTION_INTERVAL: 3500,     // How often AI makes decisions (ms)
        AGGRESSION: 0.7,          // AI aggression level (0-1)
        
        // Strategy weights
        NEUTRAL_PREFERENCE: 1.5,   // Preference for attacking neutral planets
        WEAK_TARGET_PREFERENCE: 2.0, // Preference for attacking weak enemies
        DEFENSE_THRESHOLD: 0.3,    // When to prioritize defense over offense
        
        // Randomization
        DECISION_RANDOMNESS: 0.2   // Random factor in AI decisions (0-1)
    },

    // ============ VISUAL SETTINGS ============
    VISUAL: {
        // Colors (CSS color values)
        COLORS: {
            PLAYER: '#00ff88',
            AI: '#ff4444',
            NEUTRAL: '#888888',
            BACKGROUND: '#0a0a1a',
            TEXT: '#ffffff',
            UI_OVERLAY: 'rgba(0, 0, 0, 0.8)'
        },
        
        // Animation settings
        ANIMATION: {
            PLANET_HOVER_SCALE: 1.05,
            CONQUEST_PULSE_DURATION: 1500,
            BATTLE_SHAKE_DURATION: 500,
            FLEET_FLOAT_DURATION: 2000
        },
        
        // UI settings
        UI: {
            TOOLTIP_DELAY: 300,        // Delay before showing tooltip (ms)
            STAT_UPDATE_DURATION: 500, // Duration of stat update animation
            MODAL_FADE_DURATION: 300   // Modal fade in/out duration
        }
    },

    // ============ GAME MECHANICS ============
    GAME: {
        // Update rates
        UPDATE_INTERVAL: 16,       // Game update frequency (ms) - ~60 FPS
        UI_UPDATE_INTERVAL: 100,   // UI update frequency (ms)
        
        // Input settings
        DRAG_THRESHOLD: 5,         // Minimum drag distance to register (pixels)
        CLICK_TIMEOUT: 200,        // Maximum time for click vs drag (ms)
        
        // Performance
        MAX_FLEETS: 50,            // Maximum simultaneous fleets
        OPTIMIZATION_THRESHOLD: 30  // When to start performance optimizations
    },

    // ============ DIFFICULTY LEVELS ============
    DIFFICULTY: {
        EASY: {
            AI_ACTION_INTERVAL: 5000,
            AI_AGGRESSION: 0.5,
            SHIP_GENERATION_MULTIPLIER: 0.8
        },
        NORMAL: {
            AI_ACTION_INTERVAL: 3500,
            AI_AGGRESSION: 0.7,
            SHIP_GENERATION_MULTIPLIER: 1.0
        },
        HARD: {
            AI_ACTION_INTERVAL: 2500,
            AI_AGGRESSION: 0.9,
            SHIP_GENERATION_MULTIPLIER: 1.2
        }
    },

    // ============ DEBUG SETTINGS ============
    DEBUG: {
        ENABLED: false,            // Enable debug mode
        SHOW_PLANET_INFO: false,   // Show planet debug info
        SHOW_AI_THINKING: false,   // Log AI decision process
        SHOW_PERFORMANCE: false,   // Show performance metrics
        LOG_GAME_EVENTS: false     // Log major game events
    }
};

// ============ UTILITY FUNCTIONS ============

/**
 * Get current difficulty settings
 * @param {string} difficulty - 'easy', 'normal', or 'hard'
 * @returns {Object} Difficulty configuration
 */
CONFIG.getDifficulty = function(difficulty = 'normal') {
    return this.DIFFICULTY[difficulty.toUpperCase()] || this.DIFFICULTY.NORMAL;
};

/**
 * Calculate planet radius based on capacity
 * @param {number} capacity - Planet capacity
 * @returns {number} Planet radius in pixels
 */
CONFIG.getPlanetRadius = function(capacity) {
    return this.PLANET.BASE_RADIUS + Math.sqrt(capacity) * this.PLANET.RADIUS_MULTIPLIER;
};

/**
 * Calculate ship generation rate for a planet
 * @param {number} capacity - Planet capacity
 * @returns {number} Ships per second
 */
CONFIG.getShipGenerationRate = function(capacity) {
    return this.SHIP.GENERATION_BASE + (capacity * this.SHIP.GENERATION_MULTIPLIER);
};

/**
 * Get color based on owner
 * @param {string} owner - 'player', 'ai', or 'neutral'
 * @returns {string} CSS color value
 */
CONFIG.getOwnerColor = function(owner) {
    switch(owner) {
        case 'player': return this.VISUAL.COLORS.PLAYER;
        case 'ai': return this.VISUAL.COLORS.AI;
        default: return this.VISUAL.COLORS.NEUTRAL;
    }
};

/**
 * Check if debug mode is enabled for a specific feature
 * @param {string} feature - Debug feature name
 * @returns {boolean} Whether debug is enabled
 */
CONFIG.isDebugEnabled = function(feature) {
    return this.DEBUG.ENABLED && (this.DEBUG[feature] || false);
};

// Make CONFIG globally available
window.CONFIG = CONFIG;