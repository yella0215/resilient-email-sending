const logger = require('./logger'); // Assuming logger is defined in a separate module

class EmailService {
    constructor(providers) {
        this.providers = providers;
        this.currentProviderIndex = 0;
        this.sentEmails = new Set();  // For idempotency
        this.rateLimit = 5;           // Basic rate limiting
        this.sentCount = 0;
        this.statusLog = [];          // Status tracking
        this.failureThreshold = 3;    // Circuit breaker threshold
        this.circuitBreakerState = providers.map(() => ({ failureCount: 0, open: false }));
    }

    // Helper to switch to the next provider
    switchProvider() {
        this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
    }

    // Idempotency check
    isDuplicate(email) {
        return this.sentEmails.has(email.id);
    }

    // Track status of email sending
    logStatus(status) {
        logger.info(status);
        this.statusLog.push(status);
    }

    getStatus() {
        return this.statusLog;
    }

    async retryWithExponentialBackoff(provider, email, retries = 3, delay = 1000) {
        while (retries > 0) {
            try {
                await provider.send(email);
                this.logStatus('Email sent successfully');
                return true;
            } catch (error) {
                this.logStatus(`Failed to send email: ${error.message}`);
                retries -= 1;
                if (retries > 0) {
                    this.logStatus(`Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // Exponential backoff
                } else {
                    this.logStatus('Exhausted all retries.');
                    return false;
                }
            }
        }
    }

    async switchProviderAndRetry(email) {
        this.switchProvider();
        const provider = this.providers[this.currentProviderIndex];
        return await this.retryWithExponentialBackoff(provider, email);
    }

    async sendEmail(email) {
        if (this.sentCount >= this.rateLimit) {
            this.logStatus(`Rate limit exceeded for email ${email.id}.`);
            return false;
        }

        if (this.isDuplicate(email)) {
            this.logStatus(`Duplicate email detected for ${email.id}. Skipping send.`);
            return false;
        }

        this.sentEmails.add(email.id);
        this.sentCount++;

        const provider = this.providers[this.currentProviderIndex];
        const circuitBreaker = this.circuitBreakerState[this.currentProviderIndex];

        if (circuitBreaker.open) {
            this.logStatus(`Circuit breaker open for ${provider.name}.`);
            return false;
        }

        try {
            await provider.send(email);
            this.logStatus(`Email ${email.id} sent successfully via ${provider.name}`);
            circuitBreaker.failureCount = 0; // Reset failure count on success
            return true;
        } catch (error) {
            this.logStatus(`Failed to send email ${email.id} via ${provider.name}: ${error.message}`);
            circuitBreaker.failureCount++;

            if (circuitBreaker.failureCount >= this.failureThreshold) {
                circuitBreaker.open = true;
                this.logStatus(`Circuit breaker opened for ${provider.name}.`);
                setTimeout(() => {
                    circuitBreaker.open = false;
                    circuitBreaker.failureCount = 0;
                    this.logStatus(`Circuit breaker reset for ${provider.name}.`);
                }, 60000); // 1 minute
            }

            let success = await this.retryWithExponentialBackoff(provider, email);

            if (!success) {
                success = await this.switchProviderAndRetry(email);
            }

            return success;
        }
    }
}

module.exports = EmailService;
