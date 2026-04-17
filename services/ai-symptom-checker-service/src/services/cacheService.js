class ResponseCache {
    constructor(ttl = 3600000) { // 1 hour default TTL
        this.cache = new Map();
        this.ttl = ttl;
    }

    generateKey(prompt) {
        // Create a hash of the prompt (simplified - use a proper hash in production)
        let hash = 0;
        const str = prompt.slice(0, 500); // Only hash first 500 chars for performance
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `prompt_${Math.abs(hash)}`;
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    set(key, value) {
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + this.ttl,
        });
    }

    clear() {
        this.cache.clear();
    }
}

module.exports = ResponseCache;