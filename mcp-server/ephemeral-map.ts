class EphemeralMap<K, V> {
    private map: Map<K, V> = new Map();
    private timeouts: Map<K, NodeJS.Timeout> = new Map();
    private expirationTimeMS: number;
  
    constructor(expirationTimeMS: number = 500) {
      this.expirationTimeMS = expirationTimeMS;
    }
  
    /**
     * Sets a value for the specified key
     * @param key The key to set
     * @param value The value to associate with the key
     */
    set(key: K, value: V): void {
      // Clear any existing timeout for this key
      this.clearTimeout(key);
      
      // Set the new value
      this.map.set(key, value);
      
      // Create a new timeout
      const timeout = setTimeout(() => {
        this.map.delete(key);
        this.timeouts.delete(key);
      }, this.expirationTimeMS);
      
      // Store the timeout reference
      this.timeouts.set(key, timeout);
    }
  
    /**
     * Gets and immediately deletes the value associated with the key
     * @param key The key to retrieve and delete
     * @returns The value associated with the key, or undefined if the key doesn't exist
     */
    getAndDelete(key: K): V | undefined {
      if (!this.map.has(key)) {
        return undefined;
      }
      
      // Get the value
      const value = this.map.get(key);
      
      // Delete the key and clear its timeout
      this.map.delete(key);
      this.clearTimeout(key);
      
      return value;
    }
  
    /**
     * Helper method to clear a timeout for a specific key
     * @param key The key whose timeout to clear
     */
    private clearTimeout(key: K): void {
      if (this.timeouts.has(key)) {
        clearTimeout(this.timeouts.get(key) as NodeJS.Timeout);
        this.timeouts.delete(key);
      }
    }
  
    /**
     * Clears all data and timeouts from the map
     */
    clear(): void {
      // Clear all timeouts
      this.timeouts.forEach(timeout => clearTimeout(timeout));
      
      // Clear both maps
      this.timeouts.clear();
      this.map.clear();
    }
  
    /**
     * Gets the number of entries in the map
     */
    get size(): number {
      return this.map.size;
    }
  
    /**
     * Checks if a key exists in the map
     * @param key The key to check
     */
    has(key: K): boolean {
      return this.map.has(key);
    }
  }
  
  export default EphemeralMap;