/**
 * GameEngine Input Module - RTS-style drag & drop + keyboard controls
 */
class GameEngineInput {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        
        // RTS-style input handling - PURE DRAG AND DROP
        this.inputState = {
            mouseDown: false,
            dragStart: null,
            dragCurrent: null,
            dragSourcePlanet: null,
            dragLine: null,
            isDragging: false,
            dragThreshold: 8,
            dragStarted: false
        };
        
        // Keyboard system
        this.keyboardState = {
            selectedPlanet: null,
            awaitingTarget: false,
            planetMap: new Map()
        };
        
        // Tooltip control
        this.tooltipState = {
            isVisible: false,
            hoveredPlanet: null,
            hideTimer: null
        };
        
        this.setupInputHandlers();
    }

    setupInputHandlers() {
        if (!this.gameEngine.canvas) return;
        
        // Mouse events - RTS style
        this.gameEngine.canvas.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.onMouseDown(e);
        }, { passive: false });
        
        this.gameEngine.canvas.addEventListener('mousemove', (e) => {
            e.preventDefault();
            this.onMouseMove(e);
        }, { passive: false });
        
        this.gameEngine.canvas.addEventListener('mouseup', (e) => {
            e.preventDefault();
            this.onMouseUp(e);
        }, { passive: false });
        
        this.gameEngine.canvas.addEventListener('mouseleave', (e) => {
            this.onMouseLeave(e);
        });
        
        // Disable context menu
        this.gameEngine.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        
        // Global deselection for keyboard mode
        document.addEventListener('click', (e) => {
            if (!this.gameEngine.canvas.contains(e.target)) {
                this.clearKeyboardSelection();
            }
        });
    }

    // RTS MOUSE HANDLERS
    onMouseDown(event) {
        if (this.gameEngine.gameState !== 'playing') return;
        
        const pos = Utils.getMousePosition(event, this.gameEngine.canvas);
        const planet = this.getPlanetAtPosition(pos.x, pos.y);
        
        this.hideTooltip();
        
        this.inputState.mouseDown = true;
        this.inputState.dragStart = pos;
        this.inputState.dragCurrent = null;
        this.inputState.isDragging = false;
        this.inputState.dragStarted = false;
        this.inputState.dragSourcePlanet = null;
        
        if (planet && planet.owner === 'player' && planet.ships > 0) {
            this.inputState.dragSourcePlanet = planet;
            Utils.debugLog('DRAG_READY', `Ready to drag from planet ${planet.getLetter()}`);
        }
    }

    onMouseMove(event) {
        if (this.gameEngine.gameState !== 'playing') return;
        
        const pos = Utils.getMousePosition(event, this.gameEngine.canvas);
        
        if (this.inputState.mouseDown && this.inputState.dragSourcePlanet) {
            this.inputState.dragCurrent = pos;
            
            if (!this.inputState.dragStarted) {
                const dragDistance = Utils.distance(
                    this.inputState.dragStart.x, this.inputState.dragStart.y,
                    pos.x, pos.y
                );
                
                if (dragDistance > this.inputState.dragThreshold) {
                    this.startDragging();
                }
            }
            
            if (this.inputState.isDragging) {
                this.updateDragLine();
            }
        } else {
            if (!this.inputState.isDragging) {
                this.handleMouseHover(pos);
            }
        }
    }

    onMouseUp(event) {
        if (this.gameEngine.gameState !== 'playing') return;
        
        const pos = Utils.getMousePosition(event, this.gameEngine.canvas);
        
        if (this.inputState.isDragging && this.inputState.dragSourcePlanet) {
            const targetPlanet = this.getPlanetAtPosition(pos.x, pos.y);
            
            if (targetPlanet && targetPlanet !== this.inputState.dragSourcePlanet) {
                this.gameEngine.handleFleetLaunch(this.inputState.dragSourcePlanet, targetPlanet);
            }
        }
        
        this.resetDragState();
        
        setTimeout(() => {
            if (!this.inputState.isDragging) {
                const currentPos = Utils.getMousePosition(event, this.gameEngine.canvas);
                this.handleMouseHover(currentPos);
            }
        }, 100);
    }

    onMouseLeave(event) {
        this.resetDragState();
        this.hideTooltip();
    }

    startDragging() {
        this.inputState.isDragging = true;
        this.inputState.dragStarted = true;
        
        if (this.inputState.dragSourcePlanet) {
            this.inputState.dragSourcePlanet.select();
        }
        
        this.hideTooltip();
        this.gameEngine.canvas.style.cursor = 'grabbing';
    }

    updateDragLine() {
        if (!this.inputState.dragSourcePlanet || !this.inputState.dragCurrent) return;
        
        if (this.inputState.dragLine) {
            this.inputState.dragLine.remove();
        }
        
        this.inputState.dragLine = Utils.createSVGElement('line', {
            x1: this.inputState.dragSourcePlanet.x,
            y1: this.inputState.dragSourcePlanet.y,
            x2: this.inputState.dragCurrent.x,
            y2: this.inputState.dragCurrent.y,
            'class': 'drag-line'
        });
        
        this.gameEngine.canvas.appendChild(this.inputState.dragLine);
    }

    resetDragState() {
        if (this.inputState.dragSourcePlanet && this.inputState.isDragging) {
            this.inputState.dragSourcePlanet.deselect();
        }
        
        if (this.inputState.dragLine) {
            this.inputState.dragLine.remove();
            this.inputState.dragLine = null;
        }
        
        this.gameEngine.canvas.style.cursor = 'crosshair';
        
        this.inputState.mouseDown = false;
        this.inputState.dragStart = null;
        this.inputState.dragCurrent = null;
        this.inputState.dragSourcePlanet = null;
        this.inputState.isDragging = false;
        this.inputState.dragStarted = false;
    }

    // KEYBOARD HANDLERS
    onKeyDown(event) {
        if (this.gameEngine.gameState !== 'playing') return;
        
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
            this.gameEngine.uiController.showNotification(
                `El planeta ${planet.getLetter()} no es tuyo`,
                'warning', 2000
            );
            return;
        }
        
        if (planet.ships === 0) {
            this.gameEngine.uiController.showNotification(
                `El planeta ${planet.getLetter()} no tiene naves`,
                'warning', 2000
            );
            return;
        }
        
        this.clearKeyboardSelection();
        this.keyboardState.selectedPlanet = planet;
        this.keyboardState.awaitingTarget = true;
        planet.select();
        
        this.gameEngine.uiController.showNotification(
            `Planeta ${planet.getLetter()} seleccionado. Presiona otra tecla para atacar.`,
            'info', 3000
        );
    }

    executeKeyboardAttack(targetPlanet) {
        const sourcePlanet = this.keyboardState.selectedPlanet;
        if (!sourcePlanet || sourcePlanet === targetPlanet) return;
        
        this.gameEngine.handleFleetLaunch(sourcePlanet, targetPlanet);
        this.clearKeyboardSelection();
    }

    clearKeyboardSelection() {
        if (this.keyboardState.selectedPlanet) {
            this.keyboardState.selectedPlanet.deselect();
        }
        this.keyboardState.selectedPlanet = null;
        this.keyboardState.awaitingTarget = false;
    }

    // TOOLTIP HANDLING
    handleMouseHover(pos) {
        const planet = this.getPlanetAtPosition(pos.x, pos.y);
        
        if (planet !== this.tooltipState.hoveredPlanet) {
            this.hideTooltip();
            this.tooltipState.hoveredPlanet = planet;
            
            if (planet) {
                this.tooltipState.hideTimer = setTimeout(() => {
                    if (this.tooltipState.hoveredPlanet === planet && !this.inputState.isDragging) {
                        this.showTooltip(planet, pos);
                    }
                }, 300);
            }
        }
    }

    showTooltip(planet, pos) {
        const tooltip = Utils.getElementById('tooltip');
        if (!tooltip || this.inputState.isDragging) return;
        
        const info = this.getTooltipInfo(planet);
        tooltip.innerHTML = info;
        tooltip.className = `tooltip tooltip-${planet.owner}`;
        
        const canvasRect = this.gameEngine.canvas.getBoundingClientRect();
        let x = planet.x + canvasRect.left + planet.radius + 25;
        let y = planet.y + canvasRect.top - 25;
        
        if (x + 200 > window.innerWidth) {
            x = planet.x + canvasRect.left - 225;
        }
        if (y < 0) {
            y = planet.y + canvasRect.top + planet.radius + 25;
        }
        
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
        tooltip.style.display = 'block';
        tooltip.style.pointerEvents = 'none';
        
        this.tooltipState.isVisible = true;
    }

    hideTooltip() {
        const tooltip = Utils.getElementById('tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
        
        if (this.tooltipState.hideTimer) {
            clearTimeout(this.tooltipState.hideTimer);
            this.tooltipState.hideTimer = null;
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
        for (let i = this.gameEngine.planets.length - 1; i >= 0; i--) {
            const planet = this.gameEngine.planets[i];
            const distance = Utils.distance(x, y, planet.x, planet.y);
            
            if (distance <= planet.radius + 5) {
                return planet;
            }
        }
        return null;
    }

    setupKeyboardMappings() {
        this.keyboardState.planetMap.clear();
        this.gameEngine.planets.forEach(planet => {
            this.keyboardState.planetMap.set(planet.getLetter().toLowerCase(), planet);
        });
    }

    reset() {
        this.resetDragState();
        this.clearKeyboardSelection();
        this.hideTooltip();
    }

    getDebugInfo() {
        return {
            inputState: this.inputState,
            tooltipState: this.tooltipState,
            keyboardState: {
                selectedPlanet: this.keyboardState.selectedPlanet ? this.keyboardState.selectedPlanet.getLetter() : null,
                awaitingTarget: this.keyboardState.awaitingTarget
            }
        };
    }
}

window.GameEngineInput = GameEngineInput;