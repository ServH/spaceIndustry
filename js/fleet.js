/**
 * ====================================
 * SPACE CONQUEST - OPTIMIZED FLEET CLASS
 * ====================================
 * 
 * Represents ships in transit between planets.
 * OPTIMIZED: Object pooling, culling, batched updates.
 */

class Fleet {
    /**
     * Create a new fleet (or initialize pooled fleet)
     * @param {Planet} fromPlanet - Source planet
     * @param {Planet} toPlanet - Destination planet
     * @param {number} shipCount - Number of ships in fleet
     * @param {string} owner - Fleet owner ('player' or 'ai')
     */
    constructor(fromPlanet = null, toPlanet = null, shipCount = 0, owner = 'neutral') {
        // Initialize with default values for pooling
        this.initialize(fromPlanet, toPlanet, shipCount, owner);
    }

    /**
     * Initialize fleet (for object pooling)
     * @param {Planet} fromPlanet - Source planet
     * @param {Planet} toPlanet - Destination planet
     * @param {number} shipCount - Number of ships in fleet
     * @param {string} owner - Fleet owner ('player' or 'ai')
     */
    initialize(fromPlanet, toPlanet, shipCount, owner) {
        if (!fromPlanet || !toPlanet) return;
        
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
        
        // Visual elements (will be reused if available)
        this.visualElement = null;
        this.shipElements = [];
        this.connectionLine = null;
        
        // Animation
        this.animationPhase = Math.random() * Math.PI * 2; // Random start phase
        this.hasArrived = false;
        
        // Performance optimizations
        this.isVisible = true;
        this.lastUpdateTime = 0;
        this.updateInterval = 16; // Target 60fps
        this.needsVisualUpdate = true;
        
        // Create visual representation
        this.createElement();
        
        Utils.debugLog('FLEET_CREATION', `Fleet initialized: ${shipCount} ships from ${fromPlanet.getId()} to ${toPlanet.getId()}`);
    }

    /**
     * Reset fleet for object pooling
     */
    reset() {
        // Clear references
        this.from = null;
        this.to = null;
        this.ships = 0;
        this.owner = 'neutral';
        
        // Reset position
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.progress = 0;
        
        // Reset state
        this.hasArrived = false;
        this.isVisible = false;
        this.needsVisualUpdate = false;
        
        // Hide visual elements instead of destroying them
        if (this.visualElement) {
            this.visualElement.style.display = 'none';
        }
        if (this.connectionLine) {
            this.connectionLine.style.display = 'none';
        }
        
        // Clear ship elements array but keep DOM elements for reuse
        this.shipElements.forEach(ship => {
            if (ship.element) {
                ship.element.style.display = 'none';
            }
        });
    }

    /**
     * Create visual elements for the fleet (OPTIMIZED)
     */
    createElement() {
        // Try to reuse existing elements first
        if (this.visualElement) {
            this.visualElement.style.display = 'block';
            this.reuseVisualElements();
            return;
        }

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
     * Reuse existing visual elements (PERFORMANCE OPTIMIZATION)
     */
    reuseVisualElements() {
        // Update connection line
        if (this.connectionLine) {
            this.connectionLine.style.display = 'block';
            this.connectionLine.setAttribute('x1', this.from.x);
            this.connectionLine.setAttribute('y1', this.from.y);
            this.connectionLine.setAttribute('x2', this.to.x);
            this.connectionLine.setAttribute('y2', this.to.y);
            this.connectionLine.setAttribute('stroke', CONFIG.getOwnerColor(this.owner));
        }

        // Update ship elements
        const maxShipsToShow = Math.min(this.ships, 12);
        for (let i = 0; i < maxShipsToShow && i < this.shipElements.length; i++) {
            const ship = this.shipElements[i];
            ship.element.style.display = 'block';
            ship.element.setAttribute('fill', CONFIG.getOwnerColor(this.owner));
        }

        // Hide excess ship elements
        for (let i = maxShipsToShow; i < this.shipElements.length; i++) {
            this.shipElements[i].element.style.display = 'none';
        }

        // Update count text if needed
        if (this.countText) {
            this.countText.textContent = this.ships.toString();
            this.countText.style.display = this.ships > maxShipsToShow ? 'block' : 'none';
        }
    }

    /**
     * Create individual ship visual elements (OPTIMIZED)
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
     * Update fleet position and state (OPTIMIZED)
     * @param {number} deltaTime - Time elapsed since last update (ms)
     * @param {PerformanceManager} perfManager - Performance manager for culling
     * @returns {boolean} True if fleet has arrived at destination
     */
    update(deltaTime, perfManager = null) {
        if (this.hasArrived) {
            return true;
        }

        // Performance optimization: Skip update if not enough time has passed
        this.lastUpdateTime += deltaTime;
        if (this.lastUpdateTime < this.updateInterval) {
            return false;
        }

        // Update progress
        this.progress += this.lastUpdateTime / this.travelTime;
        this.lastUpdateTime = 0;
        
        if (this.progress >= 1) {
            // Fleet has arrived
            this.progress = 1;
            this.hasArrived = true;
            this.handleArrival();
            return true;
        }

        // Performance optimization: Culling check
        if (perfManager) {
            const wasVisible = this.isVisible;
            this.isVisible = perfManager.isInViewport(this, 20);
            
            // Show/hide visual elements based on visibility
            if (this.isVisible !== wasVisible) {
                this.setVisibility(this.isVisible);
            }
        }

        // Only update position and visuals if visible
        if (this.isVisible) {
            this.updatePosition();
            this.updateAnimation(deltaTime);
        }
        
        return false;
    }

    /**
     * Set visibility of fleet elements (PERFORMANCE OPTIMIZATION)
     * @param {boolean} visible - Whether fleet should be visible
     */
    setVisibility(visible) {
        const display = visible ? 'block' : 'none';
        
        if (this.visualElement) {
            this.visualElement.style.display = display;
        }
        if (this.connectionLine) {
            this.connectionLine.style.display = display;
        }
    }

    /**
     * Update fleet position based on progress (OPTIMIZED)
     */
    updatePosition() {
        // Smooth interpolation between start and end positions
        const smoothProgress = this.smoothStep(this.progress);
        
        this.x = Utils.lerp(this.from.x, this.to.x, smoothProgress);
        this.y = Utils.lerp(this.from.y, this.to.y, smoothProgress);
        
        // Mark for visual update
        this.needsVisualUpdate = true;
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
     * Update visual position of fleet elements (BATCHED)
     */
    updateVisualPosition() {
        if (!this.needsVisualUpdate || !this.isVisible) return;
        
        // Update each ship element
        this.shipElements.forEach((ship, index) => {
            if (ship.element.style.display === 'none') return;
            
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
        
        this.needsVisualUpdate = false;
    }

    /**
     * Update animations (OPTIMIZED)
     * @param {number} deltaTime - Time elapsed since last update (ms)
     */
    updateAnimation(deltaTime) {
        this.animationPhase += deltaTime * 0.003; // Slow floating animation
        
        // Keep animation phase in reasonable bounds
        if (this.animationPhase > Math.PI * 4) {
            this.animationPhase -= Math.PI * 4;
        }
        
        // Update visual position if needed
        this.updateVisualPosition();
    }

    /**
     * Handle fleet arrival at destination
     */
    handleArrival() {
        Utils.debugLog('FLEET_ARRIVAL', `Fleet arrived at ${this.to.getId()} with ${this.ships} ships`);
        
        // Add arrival animation
        if (this.visualElement) {
            this.visualElement.classList.remove('fleet-moving');
            this.visualElement.classList.add('fleet-arriving');
        }
        
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
            from: this.from ? this.from.getId() : 'none',
            to: this.to ? this.to.getId() : 'none',
            progress: this.progress,
            eta: this.getETA(),
            isVisible: this.isVisible
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
        return `fleet_${this.from ? this.from.getId() : 'none'}_${this.to ? this.to.getId() : 'none'}_${Date.now()}`;
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
     * Destroy fleet visual elements (OPTIMIZED FOR POOLING)
     */
    destroy() {
        // Instead of removing elements, hide them for reuse
        this.setVisibility(false);
        
        // Mark as not needing updates
        this.needsVisualUpdate = false;
        this.isVisible = false;
        
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