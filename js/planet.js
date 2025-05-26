/**
 * ====================================
 * SPACE CONQUEST - OPTIMIZED PLANET CLASS
 * ====================================
 * 
 * Represents a planet in the game with ship generation,
 * conquest mechanics, and visual representation.
 * FIXED: Unique letter assignment system
 */

class Planet {
    /**
     * Create a new planet
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} capacity - Maximum ships the planet can hold
     * @param {string} owner - Initial owner ('player', 'ai', 'neutral')
     * @param {string} assignedLetter - Pre-assigned unique letter (optional)
     */
    constructor(x, y, capacity, owner = 'neutral', assignedLetter = null) {
        // Position and basic properties
        this.x = x;
        this.y = y;
        this.capacity = capacity;
        this.ships = 0;
        this.owner = owner;
        
        // Assign unique letter (either provided or generated)
        this.letter = assignedLetter || this.generateRandomLetter();
        
        // Visual properties
        this.radius = CONFIG.getPlanetRadius(capacity);
        this.visualElement = null;
        this.textElement = null;
        this.capacityTextElement = null;
        this.letterElement = null;
        
        // Selection state
        this.isSelected = false;
        this.isHovered = false;
        
        // Conquest state
        this.isBeingConquered = false;
        this.conqueror = null;
        this.conquestTimer = new Utils.Timer(CONFIG.CONQUEST.NEUTRAL_TIME, () => {
            this.completeConquest();
        });
        
        // Battle state
        this.isInBattle = false;
        this.battleTimer = new Utils.Timer(CONFIG.CONQUEST.BATTLE_TIME, () => {
            this.completeBattle();
        });
        this.attackingShips = 0;
        this.attackingOwner = null;
        
        // Ship generation
        this.shipGenerationRate = CONFIG.getShipGenerationRate(capacity);
        this.shipGenerationTimer = 0;
        
        // Visual effects
        this.lastOwner = owner;
        this.animationState = 'idle';
        this.pulsePhase = 0;
        
        // Create visual elements (NO MORE MOUSE EVENTS)
        this.createElement();
    }

    /**
     * Generate random letter for planet identification (FALLBACK ONLY)
     * This should not be used when letters are managed centrally
     * @returns {string} Random letter A-Z
     */
    generateRandomLetter() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return letters[Math.floor(Math.random() * letters.length)];
    }

    /**
     * Set the planet's unique letter (called by GameEngine)
     * @param {string} letter - Unique letter to assign
     */
    setLetter(letter) {
        this.letter = letter;
        if (this.letterElement) {
            this.letterElement.textContent = letter;
        }
        Utils.debugLog('PLANET_LETTER', `Planet at (${this.x}, ${this.y}) assigned letter: ${letter}`);
    }

    /**
     * Create SVG visual elements for the planet
     * NO MOUSE EVENT LISTENERS - All handled by GameEngine canvas events
     */
    createElement() {
        const canvas = Utils.getElementById('gameCanvas');
        if (!canvas) return;

        // Create planet group
        this.visualElement = Utils.createSVGElement('g', {
            'class': 'planet',
            'data-planet-id': this.getId(),
            'data-planet-letter': this.letter
        });

        // Create planet circle
        this.planetCircle = Utils.createSVGElement('circle', {
            cx: this.x,
            cy: this.y,
            r: this.radius,
            'class': this.getColorClass(),
            'stroke-width': CONFIG.PLANET.STROKE_WIDTH,
            'pointer-events': 'none'  // Prevent interference with canvas events
        });

        // Create conquest progress circle (hidden initially)
        this.conquestProgress = Utils.createSVGElement('circle', {
            cx: this.x,
            cy: this.y,
            r: this.radius + 5,
            'class': 'conquest-progress',
            fill: 'none',
            'stroke-dasharray': `0 ${2 * Math.PI * (this.radius + 5)}`,
            style: 'display: none',
            'pointer-events': 'none'
        });

        // Create ship count text
        this.textElement = Utils.createSVGElement('text', {
            x: this.x,
            y: this.y,
            'class': 'planet-text',
            'text-anchor': 'middle',
            'dominant-baseline': 'central',
            'pointer-events': 'none'
        });
        this.textElement.textContent = this.ships.toString();

        // Create capacity text
        this.capacityTextElement = Utils.createSVGElement('text', {
            x: this.x,
            y: this.y + this.radius + 15,
            'class': 'planet-capacity-text',
            'text-anchor': 'middle',
            'pointer-events': 'none'
        });
        this.capacityTextElement.textContent = `[${this.capacity}]`;

        // Create letter identification text
        this.letterElement = Utils.createSVGElement('text', {
            x: this.x,
            y: this.y - this.radius - 10,
            'class': 'planet-letter-text',
            'text-anchor': 'middle',
            'font-size': '14px',
            'font-weight': 'bold',
            'fill': '#ffffff',
            'opacity': '0.8',
            'pointer-events': 'none'
        });
        this.letterElement.textContent = this.letter;

        // Add elements to group
        this.visualElement.appendChild(this.planetCircle);
        this.visualElement.appendChild(this.conquestProgress);
        this.visualElement.appendChild(this.textElement);
        this.visualElement.appendChild(this.capacityTextElement);
        this.visualElement.appendChild(this.letterElement);

        // Add to canvas
        canvas.appendChild(this.visualElement);
        
        // NO EVENT LISTENERS - All mouse handling done in GameEngine
    }

    /**
     * Visual hover effects (called from GameEngine)
     */
    setHoverState(isHovered) {
        this.isHovered = isHovered;
        
        if (isHovered && !this.isSelected) {
            this.addHoverEffects();
        } else if (!isHovered && !this.isSelected) {
            this.removeHoverEffects();
        }
    }

    /**
     * Add hover effects
     */
    addHoverEffects() {
        if (this.letterElement) {
            this.letterElement.setAttribute('opacity', '1.0');
            this.letterElement.setAttribute('font-size', '16px');
        }
        
        // Add hover class for CSS animations
        this.visualElement.classList.add('planet-hover');
    }

    /**
     * Remove hover effects
     */
    removeHoverEffects() {
        if (this.letterElement) {
            this.letterElement.setAttribute('opacity', '0.8');
            this.letterElement.setAttribute('font-size', '14px');
        }
        
        // Remove hover class
        this.visualElement.classList.remove('planet-hover');
    }

    /**
     * Select this planet
     */
    select() {
        this.isSelected = true;
        
        // Visual selection indicators
        this.planetCircle.setAttribute('stroke', '#ffffff');
        this.planetCircle.setAttribute('stroke-width', '3');
        this.planetCircle.setAttribute('stroke-dasharray', '5,5');
        this.planetCircle.classList.add('planet-selected-keyboard');
        
        // Highlight letter
        if (this.letterElement) {
            this.letterElement.setAttribute('opacity', '1.0');
            this.letterElement.setAttribute('font-size', '18px');
            this.letterElement.setAttribute('fill', '#ffff00');
        }
        
        Utils.debugLog('PLANET_SELECT', `Planet ${this.letter} selected`);
    }

    /**
     * Deselect this planet
     */
    deselect() {
        this.isSelected = false;
        
        // Remove selection visuals
        this.planetCircle.setAttribute('stroke', 'none');
        this.planetCircle.setAttribute('stroke-width', CONFIG.PLANET.STROKE_WIDTH);
        this.planetCircle.setAttribute('stroke-dasharray', 'none');
        this.planetCircle.classList.remove('planet-selected-keyboard');
        
        // Reset letter appearance
        if (this.letterElement) {
            const opacity = this.isHovered ? '1.0' : '0.8';
            const fontSize = this.isHovered ? '16px' : '14px';
            
            this.letterElement.setAttribute('opacity', opacity);
            this.letterElement.setAttribute('font-size', fontSize);
            this.letterElement.setAttribute('fill', '#ffffff');
        }
        
        Utils.debugLog('PLANET_DESELECT', `Planet ${this.letter} deselected`);
    }

    /**
     * Update planet state
     * @param {number} deltaTime - Time elapsed since last update (ms)
     */
    update(deltaTime) {
        this.updateShipGeneration(deltaTime);
        this.updateConquest(deltaTime);
        this.updateBattle(deltaTime);
        this.updateVisuals(deltaTime);
    }

    /**
     * Update ship generation
     * @param {number} deltaTime - Time elapsed since last update (ms)
     */
    updateShipGeneration(deltaTime) {
        // Only generate ships if planet is owned and not at capacity
        if (this.owner === 'neutral' || this.ships >= this.capacity) {
            return;
        }

        this.shipGenerationTimer += deltaTime;
        const generationInterval = 1000 / this.shipGenerationRate; // ms per ship

        if (this.shipGenerationTimer >= generationInterval) {
            this.ships = Math.min(this.capacity, this.ships + 1);
            this.shipGenerationTimer = 0;
            
            // Update visual
            this.updateShipText();
            
            Utils.debugLog('SHIP_GENERATION', `Planet ${this.getId()} generated ship. Total: ${this.ships}`);
        }
    }

    /**
     * Update conquest progress
     * @param {number} deltaTime - Time elapsed since last update (ms)
     */
    updateConquest(deltaTime) {
        if (this.isBeingConquered) {
            this.conquestTimer.update(deltaTime);
            this.updateConquestProgress();
        }
    }

    /**
     * Update battle progress
     * @param {number} deltaTime - Time elapsed since last update (ms)
     */
    updateBattle(deltaTime) {
        if (this.isInBattle) {
            this.battleTimer.update(deltaTime);
        }
    }

    /**
     * Update visual elements
     * @param {number} deltaTime - Time elapsed since last update (ms)
     */
    updateVisuals(deltaTime) {
        // Update animation state
        this.pulsePhase += deltaTime * 0.003;
        
        // Update colors if owner changed
        if (this.lastOwner !== this.owner) {
            this.updateOwnerVisuals();
            this.lastOwner = this.owner;
        }
    }

    /**
     * Start conquest of this planet
     * @param {string} conqueror - Owner attempting conquest
     * @param {number} ships - Number of ships attacking
     */
    startConquest(conqueror, ships) {
        if (this.owner === 'neutral') {
            // Conquering neutral planet
            this.isBeingConquered = true;
            this.conqueror = conqueror;
            this.conquestTimer.start();
            this.animationState = 'conquering';
            this.updateConquestProgress();
            
            Utils.debugLog('CONQUEST', `${conqueror} started conquering neutral planet ${this.getId()}`);
        } else if (this.owner !== conqueror) {
            // Attacking enemy planet
            this.startBattle(conqueror, ships);
        }
    }

    /**
     * Start battle for this planet
     * @param {string} attacker - Attacking owner
     * @param {number} attackingShips - Number of attacking ships
     */
    startBattle(attacker, attackingShips) {
        this.isInBattle = true;
        this.attackingOwner = attacker;
        this.attackingShips = attackingShips;
        this.battleTimer.start();
        this.animationState = 'battle';
        
        // Add battle visual effects
        this.visualElement.classList.add('planet-battle');
        
        Utils.debugLog('BATTLE', `${attacker} attacking ${this.owner} planet ${this.getId()} with ${attackingShips} ships vs ${this.ships}`);
    }

    /**
     * Complete conquest of neutral planet
     */
    completeConquest() {
        if (this.isBeingConquered) {
            this.owner = this.conqueror;
            this.isBeingConquered = false;
            this.conqueror = null;
            this.animationState = 'conquered';
            
            // Hide conquest progress
            this.conquestProgress.style.display = 'none';
            
            // Add conquered animation
            this.visualElement.classList.add('planet-conquered');
            setTimeout(() => {
                this.visualElement.classList.remove('planet-conquered');
                this.animationState = 'idle';
            }, 500);
            
            Utils.debugLog('CONQUEST', `Planet ${this.getId()} conquered by ${this.owner}`);
        }
    }

    /**
     * Complete battle and determine winner
     */
    completeBattle() {
        if (this.isInBattle) {
            const totalDefenders = this.ships;
            const totalAttackers = this.attackingShips;
            
            if (totalAttackers > totalDefenders) {
                // Attacker wins
                const remainingShips = totalAttackers - totalDefenders;
                this.owner = this.attackingOwner;
                this.ships = remainingShips;
                
                Utils.debugLog('BATTLE', `${this.attackingOwner} won battle for planet ${this.getId()}`);
            } else {
                // Defender wins or tie
                const remainingShips = Math.max(0, totalDefenders - totalAttackers);
                this.ships = remainingShips;
                
                Utils.debugLog('BATTLE', `${this.owner} defended planet ${this.getId()}`);
            }
            
            // End battle
            this.isInBattle = false;
            this.attackingOwner = null;
            this.attackingShips = 0;
            this.animationState = 'idle';
            
            // Remove battle visual effects
            this.visualElement.classList.remove('planet-battle');
            
            // Update visuals
            this.updateShipText();
        }
    }

    /**
     * Update conquest progress visual
     */
    updateConquestProgress() {
        if (this.isBeingConquered) {
            const progress = this.conquestTimer.getProgress();
            const circumference = 2 * Math.PI * (this.radius + 5);
            const dashLength = circumference * progress;
            
            this.conquestProgress.setAttribute('stroke-dasharray', `${dashLength} ${circumference}`);
            this.conquestProgress.style.display = 'block';
            
            // Color based on conqueror
            const color = CONFIG.getOwnerColor(this.conqueror);
            this.conquestProgress.setAttribute('stroke', color);
        }
    }

    /**
     * Update owner-based visuals
     */
    updateOwnerVisuals() {
        this.planetCircle.setAttribute('class', this.getColorClass());
        this.updateShipText();
    }

    /**
     * Update ship count text
     */
    updateShipText() {
        if (this.textElement) {
            this.textElement.textContent = this.ships.toString();
        }
    }

    /**
     * Get CSS class for planet color based on owner
     * @returns {string} CSS class name
     */
    getColorClass() {
        return `color-${this.owner}`;
    }

    /**
     * Get tooltip information HTML
     * @returns {string} HTML content for tooltip
     */
    getTooltipInfo() {
        const ownerText = this.owner === 'neutral' ? 'Neutral' : 
                         this.owner === 'player' ? 'Tu Planeta' : 'Planeta IA';
        
        let statusText = '';
        if (this.isBeingConquered) {
            const progress = Math.round(this.conquestTimer.getProgress() * 100);
            statusText = `<br><span style="color: #ffaa00;">Conquistando... ${progress}%</span>`;
        } else if (this.isInBattle) {
            statusText = `<br><span style="color: #ff4444;">¡Bajo Ataque!</span>`;
        }
        
        return `
            <div class="tooltip-title">${ownerText} - ${this.letter}</div>
            <div class="tooltip-info">
                Naves: ${this.ships}/${this.capacity}<br>
                Generación: ${this.shipGenerationRate.toFixed(1)}/sec<br>
                Tecla: <strong>${this.letter}</strong>
                ${statusText}
            </div>
        `;
    }

    /**
     * Get unique identifier for this planet
     * @returns {string} Planet ID
     */
    getId() {
        return `planet_${this.x}_${this.y}`;
    }

    /**
     * Get planet letter
     * @returns {string} Planet letter
     */
    getLetter() {
        return this.letter;
    }

    /**
     * Check if planet can send ships
     * @param {number} requestedShips - Number of ships requested
     * @returns {boolean} True if planet can send the requested ships
     */
    canSendShips(requestedShips) {
        return this.ships >= requestedShips && requestedShips > 0;
    }

    /**
     * Remove ships from planet (when sending to another planet)
     * @param {number} count - Number of ships to remove
     * @returns {number} Actual number of ships removed
     */
    removeShips(count) {
        const actualCount = Math.min(count, this.ships);
        this.ships -= actualCount;
        this.updateShipText();
        return actualCount;
    }

    /**
     * Destroy planet visual elements
     */
    destroy() {
        // Remove from DOM
        if (this.visualElement && this.visualElement.parentNode) {
            this.visualElement.parentNode.removeChild(this.visualElement);
        }
    }
}

// Make Planet globally available
window.Planet = Planet;