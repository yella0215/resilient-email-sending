class EmailQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
    }

    async enqueue(emailService, email) {
        this.queue.push(email);
        if (!this.processing) {
            this.processing = true;
            await this.processQueue(emailService);
            this.processing = false;
        }
    }

    async processQueue(emailService) {
        while (this.queue.length > 0) {
            const email = this.queue.shift();
            await emailService.sendEmail(email);
        }
    }
}

module.exports = EmailQueue;
