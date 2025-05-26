    restart() {
        this.isRunning = false;
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
        }
        
        // Clean up fleets with performance manager
        this.fleets.forEach(fleet => {
            if (this.performanceManager) {
                this.performanceManager.returnFleet(fleet);
            } else {
                fleet.destroy();
            }
        });
        
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
        this.setupKeyboardMappings(); // Will now assign unique letters
        this.startGame();
    }

    // ENHANCED DEBUG INFO WITH PERFORMANCE STATS
    getDebugInfo() {
        const baseInfo = {
            gameState: this.gameState,
            planetsCount: this.planets.length,
            fleetsCount: this.fleets.length,
            gameStats: this.gameStats,
            inputState: this.inputState,
            tooltipState: this.tooltipState,
            keyboardState: {
                selectedPlanet: this.keyboardState.selectedPlanet ? this.keyboardState.selectedPlanet.getLetter() : null,
                awaitingTarget: this.keyboardState.awaitingTarget,
                mappedPlanets: Array.from(this.keyboardState.planetMap.entries()).map(([key, planet]) => ({
                    key: key,
                    letter: planet.getLetter(),
                    owner: planet.owner
                }))
            },
            performanceStats: this.performanceStats
        };
        
        // Add performance manager stats if available
        if (this.performanceManager) {
            baseInfo.performance = this.performanceManager.getStats();
        }
        
        return baseInfo;
    }

    destroy() {
        this.isRunning = false;
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
        }
        
        // Clean up with performance manager
        this.fleets.forEach(fleet => {
            if (this.performanceManager) {
                this.performanceManager.returnFleet(fleet);
            } else {
                fleet.destroy();
            }
        });
        
        this.planets.forEach(planet => planet.destroy());
        
        if (this.uiController) {
            this.uiController.destroy();
        }
        
        this.hideTooltip();
    }
}

// Make GameEngine globally available
window.GameEngine = GameEngine;