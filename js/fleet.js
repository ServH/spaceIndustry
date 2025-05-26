/**
 * ====================================
 * SPACE CONQUEST - FLEET CLASS
 * ====================================
 * 
 * Represents ships in transit between planets.
 * Handles movement, visualization, and arrival logic.
 */

class Fleet {
    /**
     * Create a new fleet
     * @param {Planet} fromPlanet - Source planet
     * @param {Planet} toPlanet - Destination planet
     * @param {number} shipCount - Number of ships in fleet
     * @param {string} owner - Fleet owner ('player' or 'ai')
     */
    constructor(fromPlanet, toPlanet, shipCount, owner) {
        // Basic properties
        this.from = fromPlanet;
        this.to = toPlanet;
        this.ships = shipCount;
        this.owner = owner;
        
        // Position and movement
        this.x = fromPlanet.x;
        this.y = fromPlanet.y;
        this.targetX = toPlanet.x;
        this.targetY = toPlanet.y;
        this.progress = 0; // 0 to 1
        
        // Calculate travel parameters
        this.distance = Utils.distance(this.x, this.y, this.targetX, this.targetY);
        this.travelTime = (this.distance / CONFIG.SHIP.SPEED) * 1000; // Convert to milliseconds
        this.angle = Utils.angle(this.x, this.y, this.targetX, this.targetY);
        
        // Visual elements
        this.visualElement = null;
        this.shipElements = [];
        this.connectionLine = null;
        
        // Animation
        this.animationPhase = Math.random() * Math.PI * 2; // Random start phase
        this.hasArrived = false;
        
        // Create visual representation
        this.createElement();
        
        Utils.debugLog('FLEET_CREATION', `Fleet created: ${shipCount} ships from ${fromPlanet.getId()} to ${toPlanet.getId()}`);
    }

    /**
     * Create visual elements for the fleet
     */
    createElement() {
        const canvas = Utils.getElementById('gameCanvas');
        if (!canvas) return;

        // Create fleet group
        this.visualElement = Utils.createSVGElement('g', {
            'class': `fleet fleet-${this.owner} fleet-moving`
        });

        // Create connection line from source to destination
        this.connectionLine = Utils.createSVGElement('line', {
            'class': 'connection-line connection-active',
            x1: this.from.x,
            y1: this.from.y,
            x2: this.to.x,
            y2: this.to.y,
            stroke: CONFIG.getOwnerColor(this.owner),
            'stroke-width': 1,
            opacity: 0.6
        });

        // Create individual ship representations
        this.createShipElements();

        // Add elements to canvas
        canvas.appendChild(this.connectionLine);
        canvas.appendChild(this.visualElement);
    }

    /**
     * Create individual ship visual elements
     */
    createShipElements() {
        const maxShipsToShow = Math.min(this.ships, 12); // Limit visual ships for performance
        const shipSize = CONFIG.SHIP.VISUAL_SIZE;
        
        for (let i = 0; i < maxShipsToShow; i++) {
            // Calculate formation position (diamond/wedge formation)
            const formationOffset = this.calculateFormationOffset(i, maxShipsToShow);
            
            // Create ship element (small circle)
            const ship = Utils.createSVGElement('circle', {
                r: shipSize,
                fill: CONFIG.getOwnerColor(this.owner),
                opacity: 0.9,
                'class': 'fleet-ship'
            });
            
            this.shipElements.push({
                element: ship,
                offsetX: formationOffset.x,
                offsetY: formationOffset.y,
                phase: Math.random() * Math.PI * 2 // Individual animation phase
            });
            
            this.visualElement.appendChild(ship);
        }

        // If there are more ships than visual elements, show count
        if (this.ships > maxShipsToShow) {
            const countText = Utils.createSVGElement('text', {
                'class': 'fleet-count',
                'text-anchor': 'middle',
                'dominant-baseline': 'central',
                fill: CONFIG.getOwnerColor(this.owner),
                'font-size': '10px',
                'font-weight': 'bold'
            });
            countText.textContent = this.ships.toString();
            this.visualElement.appendChild(countText);
            this.countText = countText;
        }
    }

    /**
     * Calculate formation offset for ship positioning
     * @param {number} index - Ship index in formation
     * @param {number} total - Total ships in formation
     * @returns {Object} Offset coordinates {x, y}
     */
    calculateFormationOffset(index, total) {
        if (total === 1) {
            return { x: 0, y: 0 };
        }

        // Create diamond/wedge formation
        const rows = Math.ceil(Math.sqrt(total));
        const row = Math.floor(index / rows);
        const col = index % rows;
        
        const spacing = 8;
        const rowOffset = (row - (rows - 1) / 2) * spacing;
        const colOffset = (col - (rows - 1) / 2) * spacing;
        
        return {
            x: colOffset,
            y: rowOffset
        };
    }

    /**
     * Update fleet position and state
     * @param {number} deltaTime - Time elapsed since last update (ms)
     * @returns {boolean} True if fleet has arrived at destination
     */
    update(deltaTime) {
        if (this.hasArrived) {
            return true;
        }

        // Update progress
        this.progress += deltaTime / this.travelTime;
        
        if (this.progress >= 1) {
            // Fleet has arrived
            this.progress = 1;
            this.hasArrived = true;
            this.handleArrival();
            return true;
        }

        // Update position
        this.updatePosition();
        
        // Update animations
        this.updateAnimation(deltaTime);
        
        return false;
    }

    /**
     * Update fleet position based on progress
     */
    updatePosition() {
        // Smooth interpolation between start and end positions
        const smoothProgress = this.smoothStep(this.progress);
        
        this.x = Utils.lerp(this.from.x, this.to.x, smoothProgress);
        this.y = Utils.lerp(this.from.y, this.to.y, smoothProgress);
        
        // Update visual elements
        this.updateVisualPosition();
    }

    /**
     * Smooth step function for eased movement
     * @param {number} t - Input value (0-1)
     * @returns {number} Smoothed value (0-1)
     */
    smoothStep(t) {
        return t * t * (3 - 2 * t);
    }

    /**
     * Update visual position of fleet elements
     */
    updateVisualPosition() {
        // Update each ship element
        this.shipElements.forEach((ship, index) => {
            // Calculate position with formation offset and floating animation
            const floatOffset = Math.sin(this.animationPhase + ship.phase) * 2;
            
            const finalX = this.x + ship.offsetX * Math.cos(this.angle) - ship.offsetY * Math.sin(this.angle);
            const finalY = this.y + ship.offsetX * Math.sin(this.angle) + ship.offsetY * Math.cos(this.angle) + floatOffset;
            
            ship.element.setAttribute('cx', finalX);
            ship.element.setAttribute('cy', finalY);
        });

        // Update count text if present
        if (this.countText) {
            this.countText.setAttribute('x', this.x);
            this.countText.setAttribute('y', this.y - 15);
        }
    }

    /**
     * Update animations
     * @param {number} deltaTime - Time elapsed since last update (ms)
     */
    updateAnimation(deltaTime) {
        this.animationPhase += deltaTime * 0.003; // Slow floating animation
        
        // Keep animation phase in reasonable bounds
        if (this.animationPhase > Math.PI * 4) {
            this.animationPhase -= Math.PI * 4;
        }
    }

    /**
     * Handle fleet arrival at destination
     */
    handleArrival() {
        Utils.debugLog('FLEET_ARRIVAL', `Fleet arrived at ${this.to.getId()} with ${this.ships} ships`);
        
        // Add arrival animation
        this.visualElement.classList.remove('fleet-moving');
        this.visualElement.classList.add('fleet-arriving');
        
        // Handle conquest/battle logic
        if (this.to.owner === 'neutral') {
            // Conquering neutral planet
            this.to.startConquest(this.owner, this.ships);
        } else if (this.to.owner !== this.owner) {
            // Attacking enemy planet
            this.to.startBattle(this.owner, this.ships);
        } else {
            // Reinforcing friendly planet
            this.reinforcePlanet();
        }
    }

    /**
     * Reinforce friendly planet with arriving ships
     */
    reinforcePlanet() {
        const availableSpace = this.to.capacity - this.to.ships;
        const shipsToAdd = Math.min(this.ships, availableSpace);
        
        this.to.ships += shipsToAdd;
        this.to.updateShipText();
        
        // Log overflow ships (they are lost)
        if (this.ships > shipsToAdd) {
            Utils.debugLog('FLEET_OVERFLOW', `${this.ships - shipsToAdd} ships lost due to planet capacity`);
        }
    }

    /**
     * Get current position for external queries
     * @returns {Object} Current position {x, y}
     */
    getCurrentPosition() {
        return { x: this.x, y: this.y };
    }

    /**
     * Get fleet information for UI/debugging
     * @returns {Object} Fleet information
     */
    getInfo() {
        return {
            id: this.getId(),
            owner: this.owner,
            ships: this.ships,
            from: this.from.getId(),
            to: this.to.getId(),
            progress: this.progress,
            eta: this.getETA()
        };
    }

    /**
     * Get estimated time of arrival
     * @returns {number} ETA in milliseconds
     */
    getETA() {
        if (this.hasArrived) return 0;
        return this.travelTime * (1 - this.progress);
    }

    /**
     * Get unique identifier for this fleet
     * @returns {string} Fleet ID
     */
    getId() {
        return `fleet_${this.from.getId()}_${this.to.getId()}_${Date.now()}`;
    }

    /**
     * Check if fleet belongs to specific owner
     * @param {string} owner - Owner to check against
     * @returns {boolean} True if fleet belongs to owner
     */
    belongsTo(owner) {
        return this.owner === owner;
    }

    /**
     * Get distance remaining to destination
     * @returns {number} Distance in pixels
     */
    getDistanceRemaining() {
        return Utils.distance(this.x, this.y, this.targetX, this.targetY);
    }

    /**
     * Check if fleet is close to destination (for optimization)
     * @param {number} threshold - Distance threshold in pixels
     * @returns {boolean} True if close to destination
     */
    isNearDestination(threshold = 10) {
        return this.getDistanceRemaining() <= threshold;
    }

    /**
     * Destroy fleet visual elements
     */
    destroy() {
        // Remove visual elements
        if (this.visualElement && this.visualElement.parentNode) {
            this.visualElement.parentNode.removeChild(this.visualElement);
        }
        
        if (this.connectionLine && this.connectionLine.parentNode) {
            this.connectionLine.parentNode.removeChild(this.connectionLine);
        }
        
        // Clear references
        this.shipElements = [];
        this.visualElement = null;
        this.connectionLine = null;
        this.countText = null;
        
        Utils.debugLog('FLEET_DESTRUCTION', `Fleet ${this.getId()} destroyed`);
    }

    /**
     * Get fleet color based on owner
     * @returns {string} CSS color value
     */
    getColor() {
        return CONFIG.getOwnerColor(this.owner);
    }

    /**
     * Check if fleet can be intercepted (future feature)
     * @returns {boolean} True if fleet can be intercepted
     */
    canBeIntercepted() {
        return this.progress > 0.1 && this.progress < 0.9;
    }

    /**
     * Get fleet speed for calculations
     * @returns {number} Fleet speed in pixels per second
     */
    getSpeed() {
        return CONFIG.SHIP.SPEED;
    }

    /**
     * Update fleet with new ship count (for combining fleets, future feature)
     * @param {number} additionalShips - Ships to add to fleet
     */
    addShips(additionalShips) {
        this.ships += additionalShips;
        
        // Update visual count if needed
        if (this.countText) {
            this.countText.textContent = this.ships.toString();
        }
        
        Utils.debugLog('FLEET_REINFORCEMENT', `Fleet ${this.getId()} reinforced with ${additionalShips} ships`);
    }
}

// Make Fleet globally available
window.Fleet = Fleet;