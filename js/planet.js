/**
 * ====================================
 * SPACE CONQUEST - PLANET CLASS
 * ====================================
 * 
 * Represents a planet in the game with ship generation,
 * conquest mechanics, and visual representation.
 */

class Planet {
    /**
     * Create a new planet
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} capacity - Maximum ships the planet can hold
     * @param {string} owner - Initial owner ('player', 'ai', 'neutral')
     */
    constructor(x, y, capacity, owner = 'neutral') {
        // Position and basic properties
        this.x = x;
        this.y = y;
        this.capacity = capacity;
        this.ships = 0;
        this.owner = owner;
        
        // Visual properties
        this.radius = CONFIG.getPlanetRadius(capacity);
        this.visualElement = null;
        this.textElement = null;
        this.capacityTextElement = null;
        
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
        
        // Create visual elements
        this.createElement();
    }

    /**
     * Create SVG visual elements for the planet
     */
    createElement() {
        const canvas = Utils.getElementById('gameCanvas');
        if (!canvas) return;

        // Create planet group
        this.visualElement = Utils.createSVGElement('g', {
            'class': 'planet planet-hover',
            'data-planet-id': this.getId()
        });

        // Create planet circle
        this.planetCircle = Utils.createSVGElement('circle', {
            cx: this.x,
            cy: this.y,
            r: this.radius,
            'class': this.getColorClass(),
            'stroke-width': CONFIG.PLANET.STROKE_WIDTH
        });

        // Create conquest progress circle (hidden initially)
        this.conquestProgress = Utils.createSVGElement('circle', {
            cx: this.x,
            cy: this.y,
            r: this.radius + 5,
            'class': 'conquest-progress',
            fill: 'none',
            'stroke-dasharray': `0 ${2 * Math.PI * (this.radius + 5)}`,
            style: 'display: none'
        });

        // Create ship count text
        this.textElement = Utils.createSVGElement('text', {
            x: this.x,
            y: this.y,
            'class': 'planet-text',
            'text-anchor': 'middle',
            'dominant-baseline': 'central'
        });
        this.textElement.textContent = this.ships.toString();

        // Create capacity text
        this.capacityTextElement = Utils.createSVGElement('text', {
            x: this.x,
            y: this.y + this.radius + 15,
            'class': 'planet-capacity-text',
            'text-anchor': 'middle'
        });
        this.capacityTextElement.textContent = `[${this.capacity}]`;

        // Add elements to group
        this.visualElement.appendChild(this.planetCircle);
        this.visualElement.appendChild(this.conquestProgress);
        this.visualElement.appendChild(this.textElement);
        this.visualElement.appendChild(this.capacityTextElement);

        // Add to canvas
        canvas.appendChild(this.visualElement);

        // Add event listeners
        this.addEventListeners();
    }

    /**
     * Add event listeners for planet interaction
     */
    addEventListeners() {
        if (!this.visualElement) return;

        // Mouse events for drag functionality
        this.visualElement.addEventListener('mouseenter', (e) => {
            this.onMouseEnter(e);
        });

        this.visualElement.addEventListener('mouseleave', (e) => {
            this.onMouseLeave(e);
        });

        this.visualElement.addEventListener('mousedown', (e) => {
            this.onMouseDown(e);
        });
    }

    /**
     * Handle mouse enter event
     */
    onMouseEnter(event) {
        // Show tooltip with planet information
        const tooltip = Utils.getElementById('tooltip');
        if (tooltip) {
            const info = this.getTooltipInfo();
            tooltip.innerHTML = info;
            tooltip.style.display = 'block';
            tooltip.className = `tooltip tooltip-${this.owner}`;
        }

        // Add hover animation
        this.visualElement.classList.add('planet-hover');
    }

    /**
     * Handle mouse leave event
     */
    onMouseLeave(event) {
        // Hide tooltip
        const tooltip = Utils.getElementById('tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }

        // Remove hover animation
        this.visualElement.classList.remove('planet-hover');
    }

    /**
     * Handle mouse down event (start of potential drag)
     */
    onMouseDown(event) {
        // Notify game engine about potential drag start
        if (window.game && typeof window.game.onPlanetMouseDown === 'function') {
            window.game.onPlanetMouseDown(this, event);
        }
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

        // Update tooltip position if visible
        this.updateTooltipPosition();
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
     * Update tooltip position based on mouse
     */
    updateTooltipPosition() {
        const tooltip = Utils.getElementById('tooltip');
        if (tooltip && tooltip.style.display === 'block') {
            // Position tooltip near planet but avoid screen edges
            const rect = tooltip.getBoundingClientRect();
            const canvasRect = Utils.getElementById('gameCanvas').getBoundingClientRect();
            
            let x = this.x + canvasRect.left + 20;
            let y = this.y + canvasRect.top - 10;
            
            // Adjust if tooltip would go off screen
            if (x + rect.width > window.innerWidth) {
                x = this.x + canvasRect.left - rect.width - 20;
            }
            if (y < 0) {
                y = this.y + canvasRect.top + 30;
            }
            
            tooltip.style.left = `${x}px`;
            tooltip.style.top = `${y}px`;
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
                         this.owner === 'player' ? 'Your Planet' : 'AI Planet';
        
        let statusText = '';
        if (this.isBeingConquered) {
            const progress = Math.round(this.conquestTimer.getProgress() * 100);
            statusText = `<br><span style="color: #ffaa00;">Conquering... ${progress}%</span>`;
        } else if (this.isInBattle) {
            statusText = `<br><span style="color: #ff4444;">Under Attack!</span>`;
        }
        
        return `
            <div class="tooltip-title">${ownerText}</div>
            <div class="tooltip-info">
                Ships: ${this.ships}/${this.capacity}<br>
                Generation: ${this.shipGenerationRate.toFixed(1)}/sec
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
        if (this.visualElement && this.visualElement.parentNode) {
            this.visualElement.parentNode.removeChild(this.visualElement);
        }
    }
}

// Make Planet globally available
window.Planet = Planet;