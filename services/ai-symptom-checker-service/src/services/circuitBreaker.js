class CircuitBreaker {
    constructor(failureThreshold = 5, timeout = 60000) {
        this.failureThreshold = failureThreshold;
        this.timeout = timeout;
        this.failures = 0;
        this.lastFailureTime = null;
        this.state = "CLOSED"; // CLOSED, OPEN, HALF_OPEN
    }

    async execute(fn) {
        if (this.state === "OPEN") {
            const now = Date.now();
            if (now - this.lastFailureTime >= this.timeout) {
                this.state = "HALF_OPEN";
                console.log("Circuit breaker: HALF_OPEN - testing service");
            } else {
                throw new Error("Service temporarily unavailable. Please try again later.");
            }
        }

        try {
            const result = await fn();
            if (this.state === "HALF_OPEN") {
                this.reset();
                console.log("Circuit breaker: CLOSED - service recovered");
            }
            return result;
        } catch (error) {
            this.recordFailure();
            throw error;
        }
    }

    recordFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.failures >= this.failureThreshold) {
            this.state = "OPEN";
            console.log(`Circuit breaker: OPEN after ${this.failures} failures`);
        }
    }

    reset() {
        this.failures = 0;
        this.state = "CLOSED";
        this.lastFailureTime = null;
    }
}

module.exports = CircuitBreaker;