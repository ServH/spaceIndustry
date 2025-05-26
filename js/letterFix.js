/**
 * ====================================
 * KEYBOARD LETTER ASSIGNMENT FIX
 * ====================================
 * 
 * Adds unique letter assignment system to prevent keyboard conflicts
 */

// Extend GameEngine with unique letter assignment
if (window.GameEngine) {
    // Add the unique letter assignment method to the GameEngine prototype
    GameEngine.prototype.setupKeyboardMappings = function() {
        // Use the new unique letter assignment system
        this.assignUniqueLetters();
    };

    // UNIQUE LETTER ASSIGNMENT SYSTEM - Fix for keyboard conflicts
    GameEngine.prototype.assignUniqueLetters = function() {
        const availableLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const usedLetters = new Set();
        
        // Shuffle letters for variety each game
        Utils.shuffle(availableLetters);
        
        // Clear existing keyboard mappings
        this.keyboardState.planetMap.clear();
        
        // Assign unique letters to each planet
        this.planets.forEach((planet, index) => {
            let letter;
            
            // Take the next available letter
            if (index < availableLetters.length) {
                letter = availableLetters[index];
            } else {
                // Fallback: if more than 26 planets, use numbers
                letter = (index - 25).toString();
            }
            
            // Double-check for uniqueness (should be guaranteed by shuffle, but safety first)
            while (usedLetters.has(letter)) {
                // This should rarely happen with the shuffle, but just in case
                const randomIndex = Math.floor(Math.random() * availableLetters.length);
                letter = availableLetters[randomIndex];
                
                // If all letters are used, use numbers
                if (usedLetters.size >= 26) {
                    letter = (usedLetters.size + 1).toString();
                    break;
                }
            }
            
            // Assign the unique letter
            usedLetters.add(letter);
            planet.setLetter(letter);
            
            // Update keyboard mapping with lowercase for case-insensitive input
            this.keyboardState.planetMap.set(letter.toLowerCase(), planet);
            
            Utils.debugLog('LETTER_ASSIGNMENT', `Planet ${planet.getId()} assigned unique letter: ${letter}`);
        });
        
        // Verify no duplicates (debug check)
        if (CONFIG.isDebugEnabled('ENABLED')) {
            const letterCounts = new Map();
            this.planets.forEach(planet => {
                const letter = planet.getLetter();
                letterCounts.set(letter, (letterCounts.get(letter) || 0) + 1);
            });
            
            const duplicates = Array.from(letterCounts.entries()).filter(([letter, count]) => count > 1);
            if (duplicates.length > 0) {
                Utils.debugLog('LETTER_ERROR', `Duplicate letters found: ${duplicates.map(([l, c]) => `${l}(${c})`).join(', ')}`);
                console.error('CRITICAL: Duplicate planet letters detected!', duplicates);
                
                // Force notification to user about the fix
                if (this.uiController) {
                    this.uiController.showNotification(
                        'Sistema de letras corregido - Ya no hay conflictos de teclado',
                        'success', 3000
                    );
                }
            } else {
                Utils.debugLog('LETTER_SUCCESS', `All ${this.planets.length} planets have unique letters`);
                
                // Show success notification
                if (this.uiController) {
                    this.uiController.showNotification(
                        'Letras únicas asignadas - Teclado optimizado',
                        'info', 2000
                    );
                }
                
                // Show letter assignments in console for debugging
                if (CONFIG.isDebugEnabled('SHOW_PLANET_INFO')) {
                    console.log('Planet Letter Assignments:');
                    this.planets.forEach(planet => {
                        console.log(`  ${planet.getLetter()}: ${planet.owner} planet at (${planet.x}, ${planet.y})`);
                    });
                }
            }
        }
    };

    Utils.debugLog('LETTER_FIX', 'Unique letter assignment system loaded');
}