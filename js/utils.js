/**
 * ====================================
 * SPACE CONQUEST - UTILITY FUNCTIONS
 * ====================================
 * 
 * Common utility functions used throughout the game.
 * Mathematical operations, DOM helpers, and general utilities.
 */

const Utils = {

    // ============ MATHEMATICAL UTILITIES ============

    /**
     * Calculate distance between two points
     * @param {number} x1 - First point X coordinate
     * @param {number} y1 - First point Y coordinate  
     * @param {number} x2 - Second point X coordinate
     * @param {number} y2 - Second point Y coordinate
     * @returns {number} Distance in pixels
     */
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * Calculate angle between two points
     * @param {number} x1 - First point X coordinate
     * @param {number} y1 - First point Y coordinate
     * @param {number} x2 - Second point X coordinate  
     * @param {number} y2 - Second point Y coordinate
     * @returns {number} Angle in radians
     */
    angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    },

    /**
     * Linear interpolation between two values
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    lerp(a, b, t) {
        return a + (b - a) * Math.max(0, Math.min(1, t));
    },

    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    /**
     * Generate random number between min and max
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random number
     */
    random(min, max) {
        return Math.random() * (max - min) + min;
    },

    /**
     * Generate random integer between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random integer
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Check if a point is inside a circle
     * @param {number} px - Point X coordinate
     * @param {number} py - Point Y coordinate
     * @param {number} cx - Circle center X coordinate
     * @param {number} cy - Circle center Y coordinate
     * @param {number} radius - Circle radius
     * @returns {boolean} True if point is inside circle
     */
    pointInCircle(px, py, cx, cy, radius) {
        return this.distance(px, py, cx, cy) <= radius;
    },

    // ============ ARRAY UTILITIES ============

    /**
     * Shuffle array in place using Fisher-Yates algorithm
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled array
     */
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    /**
     * Get random element from array
     * @param {Array} array - Array to pick from
     * @returns {*} Random element
     */
    randomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    },

    /**
     * Remove element from array
     * @param {Array} array - Array to modify
     * @param {*} element - Element to remove
     * @returns {boolean} True if element was removed
     */
    removeElement(array, element) {
        const index = array.indexOf(element);
        if (index > -1) {
            array.splice(index, 1);
            return true;
        }
        return false;
    },

    // ============ DOM UTILITIES ============

    /**
     * Get element by ID with error checking
     * @param {string} id - Element ID
     * @returns {HTMLElement|null} Element or null if not found
     */
    getElementById(id) {
        const element = document.getElementById(id);
        if (!element && CONFIG.isDebugEnabled('ENABLED')) {
            console.warn(`Element with ID '${id}' not found`);
        }
        return element;
    },

    /**
     * Create SVG element with namespace
     * @param {string} tagName - SVG element tag name
     * @param {Object} attributes - Element attributes
     * @returns {SVGElement} Created SVG element  
     */
    createSVGElement(tagName, attributes = {}) {
        const element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
        
        for (const [key, value] of Object.entries(attributes)) {
            element.setAttribute(key, value);
        }
        
        return element;
    },

    /**
     * Get mouse position relative to element
     * @param {MouseEvent} event - Mouse event
     * @param {HTMLElement} element - Target element
     * @returns {Object} Position object with x and y properties
     */
    getMousePosition(event, element) {
        const rect = element.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    },

    // ============ COLOR UTILITIES ============

    /**
     * Interpolate between two hex colors
     * @param {string} color1 - Starting color (hex)
     * @param {string} color2 - Ending color (hex)
     * @param {number} factor - Interpolation factor (0-1)
     * @returns {string} Interpolated color (hex)
     */
    interpolateColor(color1, color2, factor) {
        // Remove # if present
        color1 = color1.replace('#', '');
        color2 = color2.replace('#', '');
        
        // Parse RGB components
        const r1 = parseInt(color1.substr(0, 2), 16);
        const g1 = parseInt(color1.substr(2, 2), 16);
        const b1 = parseInt(color1.substr(4, 2), 16);
        
        const r2 = parseInt(color2.substr(0, 2), 16);
        const g2 = parseInt(color2.substr(2, 2), 16);
        const b2 = parseInt(color2.substr(4, 2), 16);
        
        // Interpolate
        const r = Math.round(r1 + (r2 - r1) * factor);
        const g = Math.round(g1 + (g2 - g1) * factor);
        const b = Math.round(b1 + (b2 - b1) * factor);
        
        // Convert back to hex
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    },

    /**
     * Convert hex color to RGBA
     * @param {string} hex - Hex color
     * @param {number} alpha - Alpha value (0-1)
     * @returns {string} RGBA color string
     */
    hexToRgba(hex, alpha = 1) {
        hex = hex.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },

    // ============ TIMING UTILITIES ============

    /**
     * Simple timer class for managing delays and intervals
     */
    Timer: class {
        constructor(duration, callback) {
            this.duration = duration;
            this.callback = callback;
            this.elapsed = 0;
            this.active = false;
        }

        start() {
            this.active = true;
            this.elapsed = 0;
        }

        stop() {
            this.active = false;
        }

        update(deltaTime) {
            if (!this.active) return false;
            
            this.elapsed += deltaTime;
            if (this.elapsed >= this.duration) {
                this.active = false;
                if (this.callback) this.callback();
                return true;
            }
            return false;
        }

        getProgress() {
            return this.active ? Math.min(1, this.elapsed / this.duration) : 0;
        }
    },

    // ============ PERFORMANCE UTILITIES ============

    /**
     * Simple performance monitor
     */
    Performance: {
        frameCount: 0,
        lastTime: 0,
        fps: 0,

        update() {
            this.frameCount++;
            const now = performance.now();
            
            if (now - this.lastTime >= 1000) {
                this.fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
                this.frameCount = 0;
                this.lastTime = now;
            }
        },

        getFPS() {
            return this.fps;
        }
    },

    // ============ VALIDATION UTILITIES ============

    /**
     * Check if value is a valid number
     * @param {*} value - Value to check
     * @returns {boolean} True if valid number
     */
    isValidNumber(value) {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    },

    /**
     * Check if coordinates are within canvas bounds
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @returns {boolean} True if within bounds
     */
    isWithinBounds(x, y, width, height) {
        return x >= 0 && x <= width && y >= 0 && y <= height;
    },

    // ============ FORMATTING UTILITIES ============

    /**
     * Format number with thousands separator
     * @param {number} num - Number to format
     * @returns {string} Formatted number
     */
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    /**
     * Format time in milliseconds to readable string
     * @param {number} ms - Time in milliseconds
     * @returns {string} Formatted time string
     */
    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        
        if (minutes > 0) {
            return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
        }
        return `${seconds}s`;
    },

    // ============ DEBUGGING UTILITIES ============

    /**
     * Log debug message if debug mode is enabled
     * @param {string} category - Debug category
     * @param {*} message - Message to log
     */
    debugLog(category, ...message) {
        if (CONFIG.isDebugEnabled('ENABLED') && CONFIG.isDebugEnabled(category)) {
            console.log(`[${category}]`, ...message);
        }
    },

    /**
     * Draw debug circle on canvas (for development)
     * @param {SVGElement} canvas - SVG canvas
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} radius - Circle radius
     * @param {string} color - Circle color
     */
    debugCircle(canvas, x, y, radius, color = '#ff00ff') {
        if (!CONFIG.isDebugEnabled('ENABLED')) return;
        
        const circle = Utils.createSVGElement('circle', {
            cx: x,
            cy: y,
            r: radius,
            fill: 'none',
            stroke: color,
            'stroke-width': 1,
            opacity: 0.5
        });
        
        canvas.appendChild(circle);
        
        // Remove after 1 second
        setTimeout(() => {
            if (circle.parentNode) {
                circle.parentNode.removeChild(circle);
            }
        }, 1000);
    }
};

// Make Utils globally available
window.Utils = Utils;