class MockEmailProvider {
    constructor(name, failureRate = 0.5) {
        this.name = name;
        this.failureRate = failureRate;
    }

    async send(email) {
        if (Math.random() < this.failureRate) {
            throw new Error(`${this.name} failed to send email`);
        }
        console.log(`${this.name} successfully sent email: ${email.subject}`);
    }
}

module.exports = MockEmailProvider;
