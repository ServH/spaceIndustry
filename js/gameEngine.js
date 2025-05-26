/**
 * ====================================
 * SPACE CONQUEST - GAME ENGINE (RTS STYLE)
 * ====================================
 * 
 * Pure drag-and-drop RTS experience without click-to-select
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
        
        // RTS-style input handling - PURE DRAG AND DROP
        this.inputState = {
            mouseDown: false,
            dragStart: null,
            dragCurrent: null,
            dragSourcePlanet: null,  // Planet where drag started
            dragLine: null,
            isDragging: false,
            dragThreshold: 5,  // Reduced threshold for smoother experience
            dragStarted: false,
            preventTooltip: false,  // Flag to prevent tooltip during drag operations
            lastMousePos: null
        };
        
        // Keyboard system (unchanged)
        this.keyboardState = {
            selectedPlanet: null,
            awaitingTarget: false,
            planetMap: new Map()
        };
        
        // Tooltip control - completely separate from drag system
        this.tooltipState = {
            isVisible: false,
            hoveredPlanet: null,
            hoverTimer: null,
            showDelay: 200,  // Reduced delay for better responsiveness
            element: null
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
        Utils.debugLog('GAME_INIT', 'Initializing RTS-style game engine...');
        
        // Initialize controllers
        this.uiController = new UIController(this);
        this.aiController = new AIController(this);
        
        // Setup canvas
        this.setupCanvas();
        
        // Setup RTS-style input handlers
        this.setupInputHandlers();
        
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
        
        // Set cursor style
        canvas.style.cursor = 'crosshair';
    }

    // RTS-STYLE INPUT HANDLERS - COMPLETELY REDESIGNED
    setupInputHandlers() {
        if (!this.canvas) return;
        
        // Mouse events with proper event delegation and prevention
        this.canvas.addEventListener('mousedown', (e) => {
            this.onCanvasMouseDown(e);
        }, { capture: true });
        
        this.canvas.addEventListener('mousemove', (e) => {
            this.onCanvasMouseMove(e);
        }, { capture: false });
        
        this.canvas.addEventListener('mouseup', (e) => {
            this.onCanvasMouseUp(e);
        }, { capture: true });
        
        this.canvas.addEventListener('mouseleave', (e) => {
            this.onCanvasMouseLeave(e);
        });
        
        // Disable context menu
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        
        // Keyboard events (unchanged)
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        
        // Global deselection for keyboard mode
        document.addEventListener('click', (e) => {
            if (!this.canvas.contains(e.target)) {
                this.clearKeyboardSelection();
            }
        });
    }

    // MAIN CANVAS EVENT HANDLERS - Handle all mouse interactions here
    onCanvasMouseDown(event) {
        if (this.gameState !== 'playing') return;
        
        // Always prevent default and stop propagation on mouse down
        event.preventDefault();
        event.stopPropagation();
        
        const pos = Utils.getMousePosition(event, this.canvas);
        const planet = this.getPlanetAtPosition(pos.x, pos.y);
        
        // Immediately hide any visible tooltip and prevent new ones
        this.hideTooltip();
        this.inputState.preventTooltip = true;
        
        // Reset drag state
        this.inputState.mouseDown = true;
        this.inputState.dragStart = pos;
        this.inputState.dragCurrent = null;
        this.inputState.isDragging = false;
        this.inputState.dragStarted = false;
        this.inputState.dragSourcePlanet = null;
        this.inputState.lastMousePos = pos;
        
        // Only prepare drag from valid planets
        if (planet && planet.owner === 'player' && planet.ships > 0) {
            this.inputState.dragSourcePlanet = planet;
            Utils.debugLog('DRAG_READY', `Ready to drag from planet ${planet.getLetter()}`);
        } else {
            // For keyboard compatibility, still handle click on planets
            if (planet) {
                this.handlePlanetClickForKeyboard(planet);
            }
        }
    }

    onCanvasMouseMove(event) {
        if (this.gameState !== 'playing') return;
        
        event.preventDefault();
        const pos = Utils.getMousePosition(event, this.canvas);
        this.inputState.lastMousePos = pos;
        
        if (this.inputState.mouseDown && this.inputState.dragSourcePlanet) {
            // Handle dragging
            this.inputState.dragCurrent = pos;
            
            // Check if we should start dragging
            if (!this.inputState.dragStarted) {
                const dragDistance = Utils.distance(
                    this.inputState.dragStart.x, this.inputState.dragStart.y,
                    pos.x, pos.y
                );
                
                if (dragDistance > this.inputState.dragThreshold) {
                    this.startDragging();
                }
            }
            
            // Update drag line if dragging
            if (this.inputState.isDragging) {
                this.updateDragLine();
            }
        } else if (!this.inputState.mouseDown && !this.inputState.preventTooltip) {
            // Handle hover for tooltips only when not dragging or mouse is not down
            this.handleMouseHover(pos);
        }
    }

    onCanvasMouseUp(event) {
        if (this.gameState !== 'playing') return;
        
        event.preventDefault();
        event.stopPropagation();
        
        const pos = Utils.getMousePosition(event, this.canvas);
        
        // Process drag completion if we were dragging
        if (this.inputState.isDragging && this.inputState.dragSourcePlanet) {
            const targetPlanet = this.getPlanetAtPosition(pos.x, pos.y);
            
            if (targetPlanet && targetPlanet !== this.inputState.dragSourcePlanet) {
                this.handleFleetLaunch(this.inputState.dragSourcePlanet, targetPlanet);
                Utils.debugLog('DRAG_COMPLETE', `Drag completed from ${this.inputState.dragSourcePlanet.getLetter()} to ${targetPlanet.getLetter()}`);
            } else {
                Utils.debugLog('DRAG_CANCELLED', 'Drag cancelled - no valid target');
            }
        }
        
        // Reset drag state
        this.resetDragState();
        
        // Allow tooltips again after a brief delay
        setTimeout(() => {
            this.inputState.preventTooltip = false;
            // Check if mouse is still over something
            if (this.inputState.lastMousePos) {
                this.handleMouseHover(this.inputState.lastMousePos);
            }
        }, 150);
    }

    onCanvasMouseLeave(event) {
        this.resetDragState();
        this.hideTooltip();
        this.inputState.preventTooltip = false;
    }

    startDragging() {
        this.inputState.isDragging = true;
        this.inputState.dragStarted = true;
        
        // Select the source planet for visual feedback
        if (this.inputState.dragSourcePlanet) {
            this.inputState.dragSourcePlanet.select();
        }
        
        // Ensure tooltip is hidden and stays hidden
        this.hideTooltip();
        this.inputState.preventTooltip = true;
        
        // Change cursor to indicate dragging
        this.canvas.style.cursor = 'grabbing';
        
        Utils.debugLog('DRAG_START', `Started dragging from planet ${this.inputState.dragSourcePlanet.getLetter()}`);
    }

    updateDragLine() {
        if (!this.inputState.dragSourcePlanet || !this.inputState.dragCurrent) return;
        
        // Remove existing drag line
        if (this.inputState.dragLine) {
            this.inputState.dragLine.remove();
        }
        
        // Create new drag line
        this.inputState.dragLine = Utils.createSVGElement('line', {
            x1: this.inputState.dragSourcePlanet.x,
            y1: this.inputState.dragSourcePlanet.y,
            x2: this.inputState.dragCurrent.x,
            y2: this.inputState.dragCurrent.y,
            'class': 'drag-line',
            'pointer-events': 'none'  // Prevent interference
        });
        
        this.canvas.appendChild(this.inputState.dragLine);
    }

    resetDragState() {
        // Deselect source planet if it was selected
        if (this.inputState.dragSourcePlanet && this.inputState.isDragging) {
            this.inputState.dragSourcePlanet.deselect();
        }
        
        // Remove drag line
        if (this.inputState.dragLine) {
            this.inputState.dragLine.remove();
            this.inputState.dragLine = null;
        }
        
        // Reset cursor
        this.canvas.style.cursor = 'crosshair';
        
        // Reset all drag state
        this.inputState.mouseDown = false;
        this.inputState.dragStart = null;
        this.inputState.dragCurrent = null;
        this.inputState.dragSourcePlanet = null;
        this.inputState.isDragging = false;
        this.inputState.dragStarted = false;
    }

    // COMPLETELY REDESIGNED TOOLTIP SYSTEM - NO INTERFERENCE
    handleMouseHover(pos) {
        if (this.inputState.preventTooltip || this.inputState.mouseDown) {
            return;
        }
        
        const planet = this.getPlanetAtPosition(pos.x, pos.y);
        
        if (planet !== this.tooltipState.hoveredPlanet) {
            // Hide current tooltip
            this.hideTooltip();
            
            // Set new hovered planet
            this.tooltipState.hoveredPlanet = planet;
            
            if (planet) {
                // Show tooltip after delay
                this.tooltipState.hoverTimer = setTimeout(() => {
                    if (this.tooltipState.hoveredPlanet === planet && 
                        !this.inputState.isDragging && 
                        !this.inputState.preventTooltip) {
                        this.showTooltip(planet, pos);
                    }
                }, this.tooltipState.showDelay);
            }
        }
    }

    showTooltip(planet, pos) {
        if (this.inputState.isDragging || this.inputState.preventTooltip) return;
        
        const tooltip = Utils.getElementById('tooltip');
        if (!tooltip) return;
        
        const info = this.getTooltipInfo(planet);
        tooltip.innerHTML = info;
        tooltip.className = `tooltip tooltip-${planet.owner}`;
        
        // Position tooltip away from cursor and planet to prevent interference
        const canvasRect = this.canvas.getBoundingClientRect();
        let x = planet.x + canvasRect.left + planet.radius + 30;
        let y = planet.y + canvasRect.top - 30;
        
        // Adjust if tooltip would go off screen
        if (x + 220 > window.innerWidth) { // Estimated tooltip width
            x = planet.x + canvasRect.left - 250;
        }
        if (y < 10) {
            y = planet.y + canvasRect.top + planet.radius + 30;
        }
        
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
        tooltip.style.display = 'block';
        tooltip.style.pointerEvents = 'none'; // Critical: prevent all mouse interference
        tooltip.style.zIndex = '1000';
        
        this.tooltipState.isVisible = true;
    }

    hideTooltip() {
        const tooltip = Utils.getElementById('tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
        
        if (this.tooltipState.hoverTimer) {
            clearTimeout(this.tooltipState.hoverTimer);
            this.tooltipState.hoverTimer = null;
        }
        
        this.tooltipState.isVisible = false;
        this.tooltipState.hoveredPlanet = null;
    }

    getTooltipInfo(planet) {
        const ownerText = planet.owner === 'neutral' ? 'Neutral' : 
                         planet.owner === 'player' ? 'Tu Planeta' : 'Planeta IA';
        
        let statusText = '';
        if (planet.isBeingConquered) {
            const progress = Math.round(planet.conquestTimer.getProgress() * 100);
            statusText = `<br><span style="color: #ffaa00;">Conquistando... ${progress}%</span>`;
        } else if (planet.isInBattle) {
            statusText = `<br><span style="color: #ff4444;">¡Bajo Ataque!</span>`;
        }
        
        return `
            <div class="tooltip-title">${ownerText} - ${planet.getLetter()}</div>
            <div class="tooltip-info">
                Naves: ${planet.ships}/${planet.capacity}<br>
                Generación: ${planet.shipGenerationRate.toFixed(1)}/sec<br>
                Tecla: <strong>${planet.getLetter()}</strong>
                ${statusText}
            </div>
        `;
    }

    getPlanetAtPosition(x, y) {
        for (let i = this.planets.length - 1; i >= 0; i--) {
            const planet = this.planets[i];
            const distance = Utils.distance(x, y, planet.x, planet.y);
            
            // Reasonable hit area - consistent with visual representation
            if (distance <= planet.radius + 8) {
                return planet;
            }
        }
        return null;
    }

    // KEYBOARD COMPATIBILITY - Handle planet clicks for keyboard mode
    handlePlanetClickForKeyboard(planet) {
        if (this.keyboardState.awaitingTarget) {
            this.executeKeyboardAttack(planet);
        } else if (planet.owner === 'player' && planet.ships > 0) {
            this.selectPlanetKeyboard(planet);
        }
    }

    // KEYBOARD HANDLERS (unchanged)
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
            this.clearKeyboardSelection();
            event.preventDefault();
        }
    }

    selectPlanetKeyboard(planet) {
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
        
        this.clearKeyboardSelection();
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
        this.clearKeyboardSelection();
    }

    clearKeyboardSelection() {
        if (this.keyboardState.selectedPlanet) {
            this.keyboardState.selectedPlanet.deselect();
        }
        this.keyboardState.selectedPlanet = null;
        this.keyboardState.awaitingTarget = false;
    }

    // PLANET INTERACTION COMPATIBILITY METHODS
    onPlanetClick(planet, event) {
        // Only used for keyboard mode now
        this.handlePlanetClickForKeyboard(planet);
    }

    onPlanetMouseDown(planet, event) {
        // All mouse interactions are now handled by canvas events
        // This method exists for compatibility but does nothing
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

    // WORLD GENERATION (unchanged)
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

    // GAME LOOP (unchanged)
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
        
        this.resetDragState();
        this.clearKeyboardSelection();
        this.hideTooltip();
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
        this.resetDragState();
        this.clearKeyboardSelection();
        this.hideTooltip();
        
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
            tooltipState: this.tooltipState,
            keyboardState: {
                selectedPlanet: this.keyboardState.selectedPlanet ? this.keyboardState.selectedPlanet.getLetter() : null,
                awaitingTarget: this.keyboardState.awaitingTarget
            },
            performanceStats: {
                updateTime: 0,
                renderTime: 0
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
        
        this.hideTooltip();
    }
}

// Make GameEngine globally available
window.GameEngine = GameEngine;