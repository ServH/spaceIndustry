    // UNIQUE LETTER ASSIGNMENT SYSTEM - Fix for keyboard conflicts
    assignUniqueLetters() {
        const availableLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const usedLetters = new Set();
        
        // Shuffle letters for variety
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
                // Fallback: if more than 26 planets, use numbers or combinations
                letter = (index - 25).toString();
            }
            
            // Ensure no duplicates
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
            
            // Update keyboard mapping
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
            } else {
                Utils.debugLog('LETTER_SUCCESS', `All ${this.planets.length} planets have unique letters`);
            }
        }
    }