/**
 * ====================================
 * SPACE CONQUEST - PERFORMANCE MANAGER
 * ====================================
 * 
 * Manages performance optimizations including object pooling,
 * culling, batching, and memory management.
 */

class PerformanceManager {
    constructor() {
        // Object pools
        this.pools = {
            fleets: new ObjectPool(() => new Fleet(), 50),
            svgElements: new ObjectPool(() => document.createElementNS('http://www.w3.org/2000/svg', 'g'), 100),
            animations: new ObjectPool(() => ({}), 200)
        };
        
        // Culling system
        this.viewport = {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            margin: 100 // Extra margin for smooth transitions
        };
        
        // Batching system
        this.updateBatch = {
            domUpdates: [],
            styleUpdates: [],
            animationUpdates: []
        };
        
        // Performance monitoring
        this.metrics = {
            frameTime: [],
            updateTime: [],
            renderTime: [],
            memoryUsage: [],
            activeObjects: 0
        };
        
        // Settings
        this.settings = {
            maxFrameTime: 16.67, // 60 FPS target
            cullInvisibleElements: true,
            batchDOMUpdates: true,
            optimizeAnimations: true,
            memoryCleanupInterval: 5000
        };
        
        // Initialize
        this.updateViewport();
        this.startMemoryCleanup();
        
        Utils.debugLog('PERF_INIT', 'Performance Manager initialized');
    }

    /**
     * Update viewport for culling calculations
     */
    updateViewport() {
        const canvas = Utils.getElementById('gameCanvas');
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            this.viewport = {
                x: -this.viewport.margin,
                y: -this.viewport.margin,
                width: rect.width + (this.viewport.margin * 2),
                height: rect.height + (this.viewport.margin * 2),
                margin: this.viewport.margin
            };
        }
    }

    /**
     * Check if an object is within viewport (visible)
     * @param {Object} obj - Object with x, y coordinates
     * @param {number} radius - Object radius for bounds checking
     * @returns {boolean} True if object is visible
     */
    isInViewport(obj, radius = 0) {
        if (!this.settings.cullInvisibleElements) return true;
        
        return (
            obj.x + radius >= this.viewport.x &&
            obj.x - radius <= this.viewport.x + this.viewport.width &&
            obj.y + radius >= this.viewport.y &&
            obj.y - radius <= this.viewport.y + this.viewport.height
        );
    }

    /**
     * Get fleet from pool or create new one
     * @param {Planet} from - Source planet
     * @param {Planet} to - Destination planet
     * @param {number} ships - Ship count
     * @param {string} owner - Fleet owner
     * @returns {Fleet} Fleet instance
     */
    getFleet(from, to, ships, owner) {
        const fleet = this.pools.fleets.get();
        if (fleet.initialize) {
            fleet.initialize(from, to, ships, owner);
        } else {
            // Fallback to constructor if pooled object doesn't have initialize
            return new Fleet(from, to, ships, owner);
        }
        return fleet;
    }

    /**
     * Return fleet to pool
     * @param {Fleet} fleet - Fleet to return
     */
    returnFleet(fleet) {
        if (fleet && typeof fleet.reset === 'function') {
            fleet.reset();
            this.pools.fleets.return(fleet);
        }
    }

    /**
     * Batch DOM update for better performance
     * @param {Function} updateFunction - Function containing DOM updates
     */
    batchDOMUpdate(updateFunction) {
        if (!this.settings.batchDOMUpdates) {
            updateFunction();
            return;
        }
        
        this.updateBatch.domUpdates.push(updateFunction);
    }

    /**
     * Execute all batched DOM updates
     */
    executeBatchedUpdates() {
        if (this.updateBatch.domUpdates.length === 0) return;
        
        // Use requestAnimationFrame for smooth updates
        requestAnimationFrame(() => {
            // Execute all DOM updates in one frame
            this.updateBatch.domUpdates.forEach(update => {
                try {
                    update();
                } catch (error) {
                    Utils.debugLog('PERF_ERROR', `Batched update failed: ${error.message}`);
                }
            });
            
            // Clear batch
            this.updateBatch.domUpdates = [];
        });
    }

    /**
     * Optimize animation performance
     * @param {Object} animationData - Animation parameters
     * @returns {Object} Optimized animation data
     */
    optimizeAnimation(animationData) {
        if (!this.settings.optimizeAnimations) return animationData;
        
        // Reduce animation quality if performance is poor
        const avgFrameTime = this.getAverageFrameTime();
        if (avgFrameTime > this.settings.maxFrameTime * 1.5) {
            // Performance is poor, reduce animation quality
            return {
                ...animationData,
                quality: 'low',
                updateInterval: animationData.updateInterval * 2,
                particleCount: Math.floor((animationData.particleCount || 1) * 0.5)
            };
        }
        
        return animationData;
    }

    /**
     * Record performance metrics
     * @param {string} metric - Metric name
     * @param {number} value - Metric value
     */
    recordMetric(metric, value) {
        if (!this.metrics[metric]) {
            this.metrics[metric] = [];
        }
        
        this.metrics[metric].push(value);
        
        // Keep only last 60 measurements (1 second at 60fps)
        if (this.metrics[metric].length > 60) {
            this.metrics[metric].shift();
        }
    }

    /**
     * Get average frame time
     * @returns {number} Average frame time in milliseconds
     */
    getAverageFrameTime() {
        if (this.metrics.frameTime.length === 0) return 0;
        
        const sum = this.metrics.frameTime.reduce((a, b) => a + b, 0);
        return sum / this.metrics.frameTime.length;
    }

    /**
     * Get performance score (0-100)
     * @returns {number} Performance score
     */
    getPerformanceScore() {
        const avgFrameTime = this.getAverageFrameTime();
        const targetFrameTime = this.settings.maxFrameTime;
        
        if (avgFrameTime === 0) return 100;
        
        const score = Math.max(0, Math.min(100, 
            100 - ((avgFrameTime - targetFrameTime) / targetFrameTime) * 100
        ));
        
        return Math.round(score);
    }

    /**
     * Start automatic memory cleanup
     */
    startMemoryCleanup() {
        setInterval(() => {
            this.performMemoryCleanup();
        }, this.settings.memoryCleanupInterval);
    }

    /**
     * Perform memory cleanup
     */
    performMemoryCleanup() {
        // Clear old metrics
        Object.keys(this.metrics).forEach(key => {
            if (Array.isArray(this.metrics[key]) && this.metrics[key].length > 120) {
                this.metrics[key] = this.metrics[key].slice(-60);
            }
        });
        
        // Clear completed animations from pools
        this.pools.animations.cleanup();
        
        // Force garbage collection if available (Chrome DevTools)
        if (window.gc && CONFIG.isDebugEnabled('MEMORY_CLEANUP')) {
            window.gc();
        }
        
        Utils.debugLog('PERF_CLEANUP', 'Memory cleanup performed');
    }

    /**
     * Get current performance statistics
     * @returns {Object} Performance statistics
     */
    getStats() {
        return {
            averageFrameTime: this.getAverageFrameTime(),
            performanceScore: this.getPerformanceScore(),
            activeObjects: this.metrics.activeObjects,
            poolStats: {
                fleets: this.pools.fleets.getStats(),
                svgElements: this.pools.svgElements.getStats(),
                animations: this.pools.animations.getStats()
            },
            memoryUsage: this.getMemoryUsage()
        };
    }

    /**
     * Get memory usage if available
     * @returns {Object} Memory usage information
     */
    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };
        }
        return null;
    }

    /**
     * Update active object count
     * @param {number} count - Current active object count
     */
    updateActiveObjectCount(count) {
        this.metrics.activeObjects = count;
    }

    /**
     * Enable/disable specific optimizations
     * @param {Object} settings - Settings to update
     */
    updateSettings(settings) {
        Object.assign(this.settings, settings);
        Utils.debugLog('PERF_SETTINGS', 'Performance settings updated', settings);
    }
}

/**
 * Generic Object Pool for performance optimization
 */
class ObjectPool {
    constructor(createFunction, initialSize = 10) {
        this.createFunction = createFunction;
        this.pool = [];
        this.active = [];
        this.stats = {
            created: 0,
            reused: 0,
            returned: 0
        };
        
        // Pre-populate pool
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createFunction());
            this.stats.created++;
        }
    }

    /**
     * Get object from pool
     * @returns {Object} Object instance
     */
    get() {
        let obj;
        
        if (this.pool.length > 0) {
            obj = this.pool.pop();
            this.stats.reused++;
        } else {
            obj = this.createFunction();
            this.stats.created++;
        }
        
        this.active.push(obj);
        return obj;
    }

    /**
     * Return object to pool
     * @param {Object} obj - Object to return
     */
    return(obj) {
        const index = this.active.indexOf(obj);
        if (index > -1) {
            this.active.splice(index, 1);
            this.pool.push(obj);
            this.stats.returned++;
        }
    }

    /**
     * Clean up pool by removing excess objects
     */
    cleanup() {
        const maxPoolSize = 50;
        if (this.pool.length > maxPoolSize) {
            this.pool = this.pool.slice(0, maxPoolSize);
        }
    }

    /**
     * Get pool statistics
     * @returns {Object} Pool statistics
     */
    getStats() {
        return {
            poolSize: this.pool.length,
            activeSize: this.active.length,
            totalCreated: this.stats.created,
            totalReused: this.stats.reused,
            totalReturned: this.stats.returned,
            efficiency: this.stats.reused / (this.stats.created + this.stats.reused) * 100
        };
    }
}

// Make available globally
window.PerformanceManager = PerformanceManager;
window.ObjectPool = ObjectPool;