    /**
     * Select planet via keyboard
     * @param {Planet} planet - Planet to select
     */
    selectPlanetKeyboard(planet) {
        Utils.debugLog('KEYBOARD_SELECT_ATTEMPT', `Trying to select planet ${planet.getLetter()}, owner: ${planet.owner}, ships: ${planet.ships}`);
        
        // Can only select player planets with ships
        if (planet.owner !== 'player') {
            this.uiController.showNotification(
                `El planeta ${planet.getLetter()} no es tuyo`,
                'warning',
                2000
            );
            return;
        }
        
        if (planet.ships === 0) {
            this.uiController.showNotification(
                `El planeta ${planet.getLetter()} no tiene naves`,
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
        
        Utils.debugLog('KEYBOARD_SELECT', `Planet ${planet.getLetter()} selected successfully`);
    }

    /**
     * Handle mouse down event
     * @param {MouseEvent} event - Mouse event
     */
    onMouseDown(event) {
        if (this.gameState !== 'playing') return;
        
        // Prevent default to avoid any browser behavior
        event.preventDefault();
        
        const pos = Utils.getMousePosition(event, this.canvas);
        const planet = this.getPlanetAtPosition(pos.x, pos.y);
        
        Utils.debugLog('MOUSE_DOWN', `Mouse down at ${pos.x}, ${pos.y}, planet: ${planet ? planet.getLetter() + ' (' + planet.owner + ', ships: ' + planet.ships + ')' : 'none'}`);
        
        this.inputState.mouseDown = true;
        this.inputState.dragStart = pos;
        this.inputState.selectedPlanet = planet;
        
        // Clear keyboard selection when starting mouse interaction
        if (this.keyboardState.selectedPlanet) {
            this.clearAllSelections();
        }
        
        // Only start drag from player planets with ships
        if (planet && planet.owner === 'player' && planet.ships > 0) {
            // Valid drag start - select planet
            planet.select();
            Utils.debugLog('DRAG_START', `Valid drag start from planet ${planet.getLetter()}`);
        } else {
            // Invalid selection
            this.inputState.selectedPlanet = null;
            if (planet) {
                if (planet.owner !== 'player') {
                    Utils.debugLog('DRAG_INVALID', `Cannot select ${planet.getLetter()}: not player planet (owner: ${planet.owner})`);
                } else if (planet.ships === 0) {
                    Utils.debugLog('DRAG_INVALID', `Cannot select ${planet.getLetter()}: no ships`);
                }
            }
        }
    }

    /**
     * Handle planet mouse down for drag functionality
     * @param {Planet} planet - Planet that was clicked
     * @param {MouseEvent} event - Mouse event
     */
    onPlanetMouseDown(planet, event) {
        Utils.debugLog('PLANET_MOUSE_DOWN', `Planet ${planet.getLetter()} mouse down, owner: ${planet.owner}, ships: ${planet.ships}`);
        
        // The mouse down logic is handled in the main onMouseDown method
        // This method exists for compatibility but the main logic should be in onMouseDown
        
        // Ensure the planet is properly set as selected if it's valid
        if (planet.owner === 'player' && planet.ships > 0) {
            this.inputState.selectedPlanet = planet;
            Utils.debugLog('PLANET_MOUSE_DOWN', `Planet ${planet.getLetter()} confirmed as selected`);
        }
    }

    /**
     * Handle planet click
     * @param {Planet} planet - Clicked planet
     * @param {MouseEvent} event - Mouse event
     */
    onPlanetClick(planet, event) {
        if (this.gameState !== 'playing') return;
        
        Utils.debugLog('PLANET_CLICK', `Planet ${planet.getLetter()} clicked, owner: ${planet.owner}, ships: ${planet.ships}`);
        
        if (this.keyboardState.awaitingTarget) {
            // Execute keyboard attack
            this.executeKeyboardAttack(planet);
        } else if (planet.owner === 'player' && planet.ships > 0) {
            // Select planet for keyboard mode
            this.selectPlanetKeyboard(planet);
        } else {
            // Show why we can't select this planet
            if (planet.owner !== 'player') {
                this.uiController.showNotification(
                    `El planeta ${planet.getLetter()} no es tuyo`,
                    'warning',
                    2000
                );
            } else if (planet.ships === 0) {
                this.uiController.showNotification(
                    `El planeta ${planet.getLetter()} no tiene naves`,
                    'warning',
                    2000
                );
            }
        }
    }

    /**
     * Get planet at specific position with improved detection
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Planet|null} Planet at position or null
     */
    getPlanetAtPosition(x, y) {
        // Check planets in reverse order (last drawn = topmost)
        for (let i = this.planets.length - 1; i >= 0; i--) {
            const planet = this.planets[i];
            const distance = Utils.distance(x, y, planet.x, planet.y);
            
            // Use a slightly larger hit area for better usability
            const hitRadius = planet.radius + 5;
            
            if (distance <= hitRadius) {
                Utils.debugLog('PLANET_DETECTION', `Found planet ${planet.getLetter()} at distance ${distance.toFixed(1)} (radius: ${planet.radius})`);
                return planet;
            }
        }
        
        Utils.debugLog('PLANET_DETECTION', `No planet found at ${x}, ${y}`);
        return null;
    }