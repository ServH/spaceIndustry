/**
 * ====================================
 * SPACE CONQUEST - UI CONTROLLER
 * ====================================
 * 
 * Manages user interface updates, animations, and interactions.
 * Handles stats display, modals, tooltips, and visual feedback.
 */

class UIController {
    /**
     * Create UI controller
     * @param {GameEngine} gameEngine - Reference to game engine
     */
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        
        // UI elements
        this.elements = this.initializeElements();
        
        // Animation state
        this.animations = new Map();
        this.lastUpdateTime = 0;
        
        // Modal state
        this.modalVisible = false;
        this.currentModal = null;
        
        // Tooltip state
        this.tooltipVisible = false;
        this.tooltipTimer = null;
        
        // Stats tracking for animations
        this.lastStats = {
            playerPlanets: 0,
            playerShips: 0,
            aiPlanets: 0,
            aiShips: 0
        };
        
        this.setupEventListeners();
        Utils.debugLog('UI_INIT', 'UI Controller initialized');
    }

    /**
     * Initialize UI elements references
     * @returns {Object} UI elements object
     */
    initializeElements() {
        return {
            // Stats elements
            playerPlanets: Utils.getElementById('playerPlanets'),
            playerShips: Utils.getElementById('playerShips'),
            aiPlanets: Utils.getElementById('aiPlanets'),
            aiShips: Utils.getElementById('aiShips'),
            
            // Status elements
            gameTitle: Utils.getElementById('gameTitle'),
            gameStatus: Utils.getElementById('gameStatus'),
            
            // Modal elements
            gameOverModal: Utils.getElementById('gameOverModal'),
            gameOverTitle: Utils.getElementById('gameOverTitle'),
            gameOverMessage: Utils.getElementById('gameOverMessage'),
            restartButton: Utils.getElementById('restartButton'),
            
            // Tooltip
            tooltip: Utils.getElementById('tooltip'),
            
            // Canvas
            gameCanvas: Utils.getElementById('gameCanvas')
        };
    }

    /**
     * Setup event listeners for UI interactions
     */
    setupEventListeners() {
        // Restart button
        if (this.elements.restartButton) {
            this.elements.restartButton.addEventListener('click', () => {
                this.hideModal();
                if (this.gameEngine && typeof this.gameEngine.restart === 'function') {
                    this.gameEngine.restart();
                }
            });
        }

        // Modal close on background click
        if (this.elements.gameOverModal) {
            this.elements.gameOverModal.addEventListener('click', (e) => {
                if (e.target === this.elements.gameOverModal) {
                    this.hideModal();
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyPress(e);
        });

        // Window resize handling
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Mouse move for tooltip positioning
        document.addEventListener('mousemove', (e) => {
            this.updateTooltipPosition(e);
        });
    }

    /**
     * Update UI elements
     * @param {number} deltaTime - Time elapsed since last update (ms)
     */
    update(deltaTime) {
        this.lastUpdateTime += deltaTime;
        
        // Update stats display
        this.updateStats();
        
        // Update animations
        this.updateAnimations(deltaTime);
        
        // Update game status
        this.updateGameStatus();
        
        // Performance: Only update UI every 100ms
        if (this.lastUpdateTime >= CONFIG.VISUAL.UI.UI_UPDATE_INTERVAL) {
            this.performPeriodicUpdates();
            this.lastUpdateTime = 0;
        }
    }

    /**
     * Update statistics display
     */
    updateStats() {
        const stats = this.gameEngine.getGameStats();
        
        // Check for changes and animate if needed
        this.updateStatElement('playerPlanets', stats.playerPlanets);
        this.updateStatElement('playerShips', stats.playerShips);
        this.updateStatElement('aiPlanets', stats.aiPlanets);
        this.updateStatElement('aiShips', stats.aiShips);
        
        // Store for next comparison
        this.lastStats = { ...stats };
    }

    /**
     * Update individual stat element with animation
     * @param {string} statName - Name of the stat
     * @param {number} newValue - New value to display
     */
    updateStatElement(statName, newValue) {
        const element = this.elements[statName];
        const oldValue = this.lastStats[statName];
        
        if (element && newValue !== oldValue) {
            // Update value
            element.textContent = newValue.toString();
            
            // Add animation class
            element.classList.add('stat-update');
            
            // Remove animation class after animation completes
            setTimeout(() => {
                element.classList.remove('stat-update');
            }, CONFIG.VISUAL.UI.STAT_UPDATE_DURATION);
            
            // Color change based on increase/decrease
            if (newValue > oldValue) {
                element.style.color = statName.includes('player') ? '#00ff88' : '#ff4444';
            } else if (newValue < oldValue) {
                element.style.color = statName.includes('player') ? '#ff8844' : '#88ff44';
            }
            
            // Reset color after a delay
            setTimeout(() => {
                element.style.color = '';
            }, 1000);
        }
    }

    /**
     * Update game status text
     */
    updateGameStatus() {
        if (!this.elements.gameStatus) return;
        
        const gameState = this.gameEngine.getGameState();
        let statusText = '';
        let statusClass = '';
        
        switch (gameState) {
            case 'playing':
                statusText = 'Conquista el universo';
                statusClass = '';
                break;
            case 'victory':
                statusText = '¡VICTORIA!';
                statusClass = 'status-victory';
                break;
            case 'defeat':
                statusText = 'DERROTA';
                statusClass = 'status-defeat';
                break;
            case 'paused':
                statusText = 'PAUSADO';
                statusClass = '';
                break;
            default:
                statusText = 'Conquista el universo';
                statusClass = '';
        }
        
        this.elements.gameStatus.textContent = statusText;
        this.elements.gameStatus.className = `status-text ${statusClass}`;
    }

    /**
     * Show game over modal
     * @param {string} result - 'victory' or 'defeat'
     * @param {Object} gameStats - Final game statistics
     */
    showGameOverModal(result, gameStats) {
        if (!this.elements.gameOverModal) return;
        
        const isVictory = result === 'victory';
        
        // Update modal content
        if (this.elements.gameOverTitle) {
            this.elements.gameOverTitle.textContent = isVictory ? '¡VICTORIA!' : '¡DERROTA!';
            this.elements.gameOverTitle.style.color = isVictory ? '#00ff88' : '#ff4444';
        }
        
        if (this.elements.gameOverMessage) {
            const message = this.createGameOverMessage(result, gameStats);
            this.elements.gameOverMessage.innerHTML = message;
        }
        
        // Show modal with animation
        this.elements.gameOverModal.style.display = 'block';
        this.elements.gameOverModal.classList.add('modal-show');
        this.modalVisible = true;
        this.currentModal = 'gameOver';
        
        Utils.debugLog('UI_MODAL', `Game over modal shown: ${result}`);
    }

    /**
     * Create game over message with statistics
     * @param {string} result - Game result
     * @param {Object} gameStats - Game statistics
     * @returns {string} HTML message
     */
    createGameOverMessage(result, gameStats) {
        const isVictory = result === 'victory';
        const duration = Utils.formatTime(gameStats.gameDuration || 0);
        
        let message = isVictory ? 
            'Has conquistado toda la galaxia y establecido tu imperio espacial.' :
            'La IA ha demostrado ser superior en esta batalla por el universo.';
        
        message += `<br><br>
            <strong>Estadísticas de la partida:</strong><br>
            Duración: ${duration}<br>
            Planetas conquistados: ${gameStats.planetsConquered || 0}<br>
            Flotas enviadas: ${gameStats.fleetsLaunched || 0}<br>
            Naves totales producidas: ${gameStats.shipsProduced || 0}
        `;
        
        return message;
    }

    /**
     * Hide modal
     */
    hideModal() {
        if (!this.modalVisible || !this.currentModal) return;
        
        const modal = this.elements[this.currentModal + 'Modal'] || this.elements.gameOverModal;
        
        if (modal) {
            modal.classList.remove('modal-show');
            modal.classList.add('modal-hide');
            
            setTimeout(() => {
                modal.style.display = 'none';
                modal.classList.remove('modal-hide');
                this.modalVisible = false;
                this.currentModal = null;
            }, CONFIG.VISUAL.UI.MODAL_FADE_DURATION);
        }
    }

    /**
     * Show tooltip with content
     * @param {string} content - HTML content for tooltip
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} className - Additional CSS class
     */
    showTooltip(content, x, y, className = '') {
        if (!this.elements.tooltip) return;
        
        // Clear existing timer
        if (this.tooltipTimer) {
            clearTimeout(this.tooltipTimer);
        }
        
        // Set content and position
        this.elements.tooltip.innerHTML = content;
        this.elements.tooltip.className = `tooltip ${className}`;
        
        // Position tooltip
        this.positionTooltip(x, y);
        
        // Show with delay
        this.tooltipTimer = setTimeout(() => {
            this.elements.tooltip.style.display = 'block';
            this.elements.tooltip.classList.add('tooltip-show');
            this.tooltipVisible = true;
        }, CONFIG.VISUAL.UI.TOOLTIP_DELAY);
    }

    /**
     * Hide tooltip
     */
    hideTooltip() {
        if (!this.tooltipVisible || !this.elements.tooltip) return;
        
        // Clear timer
        if (this.tooltipTimer) {
            clearTimeout(this.tooltipTimer);
        }
        
        // Hide with animation
        this.elements.tooltip.classList.remove('tooltip-show');
        this.elements.tooltip.classList.add('tooltip-hide');
        
        setTimeout(() => {
            this.elements.tooltip.style.display = 'none';
            this.elements.tooltip.classList.remove('tooltip-hide');
            this.tooltipVisible = false;
        }, 200);
    }

    /**
     * Position tooltip avoiding screen edges
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    positionTooltip(x, y) {
        if (!this.elements.tooltip) return;
        
        const tooltip = this.elements.tooltip;
        const rect = tooltip.getBoundingClientRect();
        
        // Default position
        let finalX = x + 15;
        let finalY = y - 10;
        
        // Adjust if tooltip would go off screen
        if (finalX + rect.width > window.innerWidth) {
            finalX = x - rect.width - 15;
        }
        
        if (finalY < 0) {
            finalY = y + 25;
        }
        
        if (finalY + rect.height > window.innerHeight) {
            finalY = window.innerHeight - rect.height - 10;
        }
        
        tooltip.style.left = `${finalX}px`;
        tooltip.style.top = `${finalY}px`;
    }

    /**
     * Update tooltip position on mouse move
     * @param {MouseEvent} event - Mouse event
     */
    updateTooltipPosition(event) {
        if (this.tooltipVisible) {
            this.positionTooltip(event.clientX, event.clientY);
        }
    }

    /**
     * Update animations
     * @param {number} deltaTime - Time elapsed since last update (ms)
     */
    updateAnimations(deltaTime) {
        // Update each active animation
        for (const [key, animation] of this.animations.entries()) {
            animation.update(deltaTime);
            
            // Remove completed animations
            if (animation.isComplete()) {
                this.animations.delete(key);
            }
        }
    }

    /**
     * Perform periodic UI updates
     */
    performPeriodicUpdates() {
        // Update canvas size if needed
        this.updateCanvasSize();
        
        // Update performance indicators if debug mode
        if (CONFIG.isDebugEnabled('SHOW_PERFORMANCE')) {
            this.updatePerformanceDisplay();
        }
    }

    /**
     * Update canvas size to match container
     */
    updateCanvasSize() {
        const canvas = this.elements.gameCanvas;
        if (!canvas) return;
        
        const container = canvas.parentElement;
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const newWidth = rect.width;
        const newHeight = rect.height;
        
        // Only update if size changed
        if (canvas.getAttribute('width') !== newWidth.toString() || 
            canvas.getAttribute('height') !== newHeight.toString()) {
            
            canvas.setAttribute('width', newWidth);
            canvas.setAttribute('height', newHeight);
            canvas.setAttribute('viewBox', `0 0 ${newWidth} ${newHeight}`);
        }
    }

    /**
     * Handle keyboard input
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyPress(event) {
        switch (event.key) {
            case 'Escape':
                if (this.modalVisible) {
                    this.hideModal();
                }
                break;
                
            case 'r':
            case 'R':
                if (event.ctrlKey && this.modalVisible) {
                    this.hideModal();
                    this.gameEngine.restart();
                }
                break;
                
            case ' ':
                // Spacebar to pause/unpause (future feature)
                event.preventDefault();
                break;
                
            case 'F1':
                // Show help (future feature)
                event.preventDefault();
                break;
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Update canvas size
        this.updateCanvasSize();
        
        // Hide tooltip on resize
        if (this.tooltipVisible) {
            this.hideTooltip();
        }
        
        // Reposition modal if visible
        if (this.modalVisible) {
            // Modal positioning is handled by CSS, but we might need adjustments
            Utils.debugLog('UI_RESIZE', 'Window resized, UI elements adjusted');
        }
    }

    /**
     * Add custom animation
     * @param {string} id - Animation identifier
     * @param {Object} animation - Animation object with update method
     */
    addAnimation(id, animation) {
        this.animations.set(id, animation);
    }

    /**
     * Remove animation
     * @param {string} id - Animation identifier
     */
    removeAnimation(id) {
        this.animations.delete(id);
    }

    /**
     * Show notification message
     * @param {string} message - Message to show
     * @param {string} type - Notification type ('info', 'success', 'warning', 'error')
     * @param {number} duration - Duration in milliseconds
     */
    showNotification(message, type = 'info', duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style notification
        notification.style.position = 'fixed';
        notification.style.top = '80px';
        notification.style.right = '20px';
        notification.style.padding = '12px 20px';
        notification.style.borderRadius = '6px';
        notification.style.zIndex = '1000';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        
        // Set colors based on type
        const colors = {
            info: { bg: 'rgba(0, 150, 255, 0.9)', text: '#ffffff' },
            success: { bg: 'rgba(0, 255, 136, 0.9)', text: '#000000' },
            warning: { bg: 'rgba(255, 170, 0, 0.9)', text: '#000000' },
            error: { bg: 'rgba(255, 68, 68, 0.9)', text: '#ffffff' }
        };
        
        const color = colors[type] || colors.info;
        notification.style.backgroundColor = color.bg;
        notification.style.color = color.text;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // Remove after duration
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    /**
     * Update performance display (debug mode)
     */
    updatePerformanceDisplay() {
        const fps = Utils.Performance.getFPS();
        const planetCount = this.gameEngine.planets.length;
        const fleetCount = this.gameEngine.fleets.length;
        
        // Update or create performance display
        let perfDisplay = document.getElementById('performance-display');
        if (!perfDisplay) {
            perfDisplay = document.createElement('div');
            perfDisplay.id = 'performance-display';
            perfDisplay.style.position = 'fixed';
            perfDisplay.style.top = '80px';
            perfDisplay.style.left = '20px';
            perfDisplay.style.background = 'rgba(0, 0, 0, 0.8)';
            perfDisplay.style.color = '#ffffff';
            perfDisplay.style.padding = '10px';
            perfDisplay.style.borderRadius = '4px';
            perfDisplay.style.fontFamily = 'monospace';
            perfDisplay.style.fontSize = '12px';
            perfDisplay.style.zIndex = '999';
            document.body.appendChild(perfDisplay);
        }
        
        perfDisplay.innerHTML = `
            FPS: ${fps}<br>
            Planets: ${planetCount}<br>
            Fleets: ${fleetCount}<br>
        `;
    }

    /**
     * Get current UI state
     * @returns {Object} UI state information
     */
    getState() {
        return {
            modalVisible: this.modalVisible,
            currentModal: this.currentModal,
            tooltipVisible: this.tooltipVisible,
            animationsActive: this.animations.size,
            lastStats: { ...this.lastStats }
        };
    }

    /**
     * Reset UI state
     */
    reset() {
        // Hide modal if visible
        if (this.modalVisible) {
            this.hideModal();
        }
        
        // Hide tooltip if visible
        if (this.tooltipVisible) {
            this.hideTooltip();
        }
        
        // Clear animations
        this.animations.clear();
        
        // Reset stats
        this.lastStats = {
            playerPlanets: 0,
            playerShips: 0,
            aiPlanets: 0,
            aiShips: 0
        };
        
        // Reset status
        if (this.elements.gameStatus) {
            this.elements.gameStatus.textContent = 'Conquista el universo';
            this.elements.gameStatus.className = 'status-text';
        }
        
        Utils.debugLog('UI_RESET', 'UI state has been reset');
    }

    /**
     * Cleanup UI controller
     */
    destroy() {
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyPress);
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('mousemove', this.updateTooltipPosition);
        
        // Clear timers
        if (this.tooltipTimer) {
            clearTimeout(this.tooltipTimer);
        }
        
        // Clear animations
        this.animations.clear();
        
        Utils.debugLog('UI_DESTROY', 'UI Controller destroyed');
    }
}

// Make UIController globally available
window.UIController = UIController;