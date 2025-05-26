/**
 * ====================================
 * SPACE CONQUEST - MAIN ENTRY POINT
 * ====================================
 * 
 * Main entry point for the Space Conquest game.
 * Initializes the game engine and handles global setup.
 */

// Global game instance
let game = null;

/**
 * Initialize the game when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    try {
        Utils.debugLog('INIT', 'DOM loaded, initializing game...');
        
        // Check browser support
        if (!checkBrowserSupport()) {
            showBrowserError();
            return;
        }
        
        // Initialize game
        initializeGame();
        
        Utils.debugLog('INIT', 'Game initialization complete');
    } catch (error) {
        console.error('Failed to initialize game:', error);
        showInitializationError(error);
    }
});

/**
 * Check if browser supports required features
 * @returns {boolean} True if browser is supported
 */
function checkBrowserSupport() {
    // Check for required APIs
    const requiredFeatures = [
        'requestAnimationFrame',
        'SVGElement',
        'addEventListener',
        'performance'
    ];
    
    for (const feature of requiredFeatures) {
        if (!(feature in window)) {
            console.error(`Browser missing required feature: ${feature}`);
            return false;
        }
    }
    
    // Check SVG support
    if (!document.createElementNS || !document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGRect) {
        console.error('Browser does not support SVG');
        return false;
    }
    
    return true;
}

/**
 * Initialize the game
 */
function initializeGame() {
    // Set up error handling
    setupErrorHandling();
    
    // Initialize performance monitoring
    Utils.Performance.lastTime = performance.now();
    
    // Create and start game engine
    game = new GameEngine();
    
    // Make game globally available for debugging
    window.game = game;
    
    // Setup development tools if debug mode
    if (CONFIG.isDebugEnabled('ENABLED')) {
        setupDebugTools();
    }
    
    // Setup visibility API to pause/resume game
    setupVisibilityHandling();
    
    // Setup resize handling
    setupResizeHandling();
    
    Utils.debugLog('INIT', 'Game engine created and started');
}

/**
 * Setup global error handling
 */
function setupErrorHandling() {
    // Catch unhandled errors
    window.addEventListener('error', function(event) {
        console.error('Unhandled error:', event.error);
        Utils.debugLog('ERROR', `Unhandled error: ${event.error.message}`);
        
        // Show error to user if game is running
        if (game && game.uiController) {
            game.uiController.showNotification(
                'Se ha producido un error. El juego puede comportarse de forma inesperada.',
                'error',
                5000
            );
        }
    });
    
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        Utils.debugLog('ERROR', `Unhandled promise rejection: ${event.reason}`);
        
        if (game && game.uiController) {
            game.uiController.showNotification(
                'Error en operación asíncrona',
                'error'
            );
        }
    });
}

/**
 * Setup debug tools for development
 */
function setupDebugTools() {
    // Add debug panel
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.style.position = 'fixed';
    debugPanel.style.bottom = '20px';
    debugPanel.style.left = '20px';
    debugPanel.style.background = 'rgba(0, 0, 0, 0.8)';
    debugPanel.style.color = '#ffffff';
    debugPanel.style.padding = '10px';
    debugPanel.style.borderRadius = '4px';
    debugPanel.style.fontFamily = 'monospace';
    debugPanel.style.fontSize = '12px';
    debugPanel.style.zIndex = '999';
    debugPanel.style.maxWidth = '300px';
    
    document.body.appendChild(debugPanel);
    
    // Update debug info periodically
    setInterval(() => {
        if (game) {
            const debugInfo = game.getDebugInfo();
            debugPanel.innerHTML = `
                <strong>DEBUG INFO</strong><br>
                State: ${debugInfo.gameState}<br>
                Planets: ${debugInfo.planetsCount}<br>
                Fleets: ${debugInfo.fleetsCount}<br>
                FPS: ${Utils.Performance.getFPS()}<br>
                Update Time: ${debugInfo.performanceStats.updateTime.toFixed(2)}ms<br>
                Player Ships: ${debugInfo.gameStats.playerShips}<br>
                AI Ships: ${debugInfo.gameStats.aiShips}
            `;
        }
    }, 1000);
    
    // Add debug keyboard shortcuts
    document.addEventListener('keydown', function(event) {
        if (!event.ctrlKey) return;
        
        switch (event.key) {
            case 'd':
                // Toggle debug mode
                CONFIG.DEBUG.ENABLED = !CONFIG.DEBUG.ENABLED;
                console.log('Debug mode:', CONFIG.DEBUG.ENABLED ? 'ON' : 'OFF');
                event.preventDefault();
                break;
                
            case 'r':
                // Restart game
                if (game) {
                    game.restart();
                }
                event.preventDefault();
                break;
                
            case 'p':
                // Pause/resume game
                if (game) {
                    if (game.getGameState() === 'playing') {
                        game.pause();
                    } else if (game.getGameState() === 'paused') {
                        game.resume();
                    }
                }
                event.preventDefault();
                break;
        }
    });
    
    Utils.debugLog('DEBUG', 'Debug tools initialized');
}

/**
 * Setup page visibility API handling
 */
function setupVisibilityHandling() {
    let hidden, visibilityChange;
    
    if (typeof document.hidden !== 'undefined') {
        hidden = 'hidden';
        visibilityChange = 'visibilitychange';
    } else if (typeof document.msHidden !== 'undefined') {
        hidden = 'msHidden';
        visibilityChange = 'msvisibilitychange';
    } else if (typeof document.webkitHidden !== 'undefined') {
        hidden = 'webkitHidden';
        visibilityChange = 'webkitvisibilitychange';
    }
    
    if (!hidden) return;
    
    function handleVisibilityChange() {
        if (!game) return;
        
        if (document[hidden]) {
            // Page is hidden, pause game
            if (game.getGameState() === 'playing') {
                game.pause();
                Utils.debugLog('VISIBILITY', 'Game paused (page hidden)');
            }
        } else {
            // Page is visible, resume game
            if (game.getGameState() === 'paused') {
                game.resume();
                Utils.debugLog('VISIBILITY', 'Game resumed (page visible)');
            }
        }
    }
    
    document.addEventListener(visibilityChange, handleVisibilityChange, false);
}

/**
 * Setup window resize handling
 */
function setupResizeHandling() {
    let resizeTimeout;
    
    window.addEventListener('resize', function() {
        // Debounce resize events
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            if (game && game.canvas) {
                // Update canvas size
                const rect = game.canvas.parentElement.getBoundingClientRect();
                game.canvasWidth = rect.width;
                game.canvasHeight = rect.height - 70;
                
                game.canvas.setAttribute('width', game.canvasWidth);
                game.canvas.setAttribute('height', game.canvasHeight);
                game.canvas.setAttribute('viewBox', `0 0 ${game.canvasWidth} ${game.canvasHeight}`);
                
                Utils.debugLog('RESIZE', `Canvas resized to ${game.canvasWidth}x${game.canvasHeight}`);
            }
        }, 250);
    });
}

/**
 * Show browser compatibility error
 */
function showBrowserError() {
    const errorHtml = `
        <div style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #1a1a3a;
            color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            font-family: Arial, sans-serif;
            max-width: 400px;
            border: 1px solid #ff4444;
        ">
            <h2 style="color: #ff4444; margin-bottom: 20px;">
                Navegador No Compatible
            </h2>
            <p style="margin-bottom: 20px;">
                Tu navegador no soporta las tecnologías necesarias para ejecutar Space Conquest.
            </p>
            <p style="font-size: 14px; color: #cccccc;">
                Por favor, actualiza tu navegador o utiliza uno moderno como Chrome, Firefox, Safari o Edge.
            </p>
        </div>
    `;
    
    document.body.innerHTML = errorHtml;
}

/**
 * Show initialization error
 * @param {Error} error - The error that occurred
 */
function showInitializationError(error) {
    const errorHtml = `
        <div style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #1a1a3a;
            color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            font-family: Arial, sans-serif;
            max-width: 500px;
            border: 1px solid #ff4444;
        ">
            <h2 style="color: #ff4444; margin-bottom: 20px;">
                Error de Inicialización
            </h2>
            <p style="margin-bottom: 20px;">
                Ha ocurrido un error al inicializar Space Conquest.
            </p>
            <details style="text-align: left; margin-bottom: 20px;">
                <summary style="cursor: pointer; color: #00ff88;">
                    Detalles técnicos
                </summary>
                <pre style="
                    background: #000;
                    padding: 10px;
                    border-radius: 4px;
                    overflow: auto;
                    font-size: 12px;
                    margin-top: 10px;
                ">${error.message}\n\n${error.stack}</pre>
            </details>
            <button onclick="location.reload()" style="
                background: #00ff88;
                color: #000;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-weight: bold;
            ">
                Recargar Página
            </button>
        </div>
    `;
    
    document.body.innerHTML = errorHtml;
}

/**
 * Development helper functions
 */
if (CONFIG.isDebugEnabled('ENABLED')) {
    // Add global debug functions
    window.debugGame = {
        // Get game state
        getState: () => game ? game.getDebugInfo() : null,
        
        // Restart game
        restart: () => game ? game.restart() : null,
        
        // Pause/resume
        pause: () => game ? game.pause() : null,
        resume: () => game ? game.resume() : null,
        
        // Add ships to player planets
        addShips: (count = 10) => {
            if (!game) return;
            const playerPlanets = game.planets.filter(p => p.owner === 'player');
            playerPlanets.forEach(planet => {
                planet.ships = Math.min(planet.capacity, planet.ships + count);
                planet.updateShipText();
            });
        },
        
        // Win game instantly
        win: () => {
            if (!game) return;
            game.planets.forEach(planet => {
                if (planet.owner === 'ai') {
                    planet.owner = 'player';
                    planet.updateOwnerVisuals();
                }
            });
        },
        
        // Lose game instantly
        lose: () => {
            if (!game) return;
            game.planets.forEach(planet => {
                if (planet.owner === 'player') {
                    planet.owner = 'ai';
                    planet.updateOwnerVisuals();
                }
            });
        },
        
        // Set AI difficulty
        setAIDifficulty: (difficulty) => {
            if (game && game.aiController) {
                game.aiController.setDifficulty(difficulty);
            }
        },
        
        // Get performance stats
        getPerformance: () => ({
            fps: Utils.Performance.getFPS(),
            gameStats: game ? game.performanceStats : null
        })
    };
    
    console.log('Debug functions available in window.debugGame');
    console.log('Available commands:', Object.keys(window.debugGame));
}

/**
 * Service Worker registration for PWA support (future feature)
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        // Service worker registration would go here
        // navigator.serviceWorker.register('/sw.js');
    });
}

/**
 * Analytics tracking (placeholder for future implementation)
 */
function trackEvent(category, action, label, value) {
    // Analytics implementation would go here
    if (CONFIG.isDebugEnabled('LOG_GAME_EVENTS')) {
        console.log('Analytics:', { category, action, label, value });
    }
}

/**
 * Export functions for testing
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        checkBrowserSupport,
        initializeGame,
        game: () => game
    };
}

// Log successful script load
Utils.debugLog('MAIN', 'Main script loaded successfully');