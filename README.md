# resilient-email-sending

## Overview

This project implements a resilient email sending service designed to handle various failure scenarios. It includes features such as retry logic with exponential backoff, provider switching, rate limiting, idempotency checks, and circuit breaking.

## Setup Instructions

### 1. Clone the Repository

Clone the repository to your local machine:

```sh
git clone https://github.com/yourusername/resilient-email-service.git
cd resilient-email-service
```

### 2. Install Dependencies

Ensure have [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) installed. Install the required dependencies:

```sh
npm install
```

### 3. Configure Email Providers

Edit `src/EmailService.js` to configure your email providers. Replace the placeholder array with actual email provider objects that implement the `send` method.

### 4. Run the Service

To test the service with mock providers:

```sh
node src/testEmailService.js
```

### 5. Running Tests

Add unit tests in `tests/EmailService.test.js` and run the tests using:

```sh
npm test
```

## Assumptions

- **Mock Providers**: The provided example uses mock email providers. In a production environment, replace these mocks with actual email service implementations.
- **Logging**: Logging is handled using the Winston library. Logs are output to both the console and a file named `combined.log`.
- **Rate Limiting**: The service includes basic rate limiting to prevent excessive email sending. Adjust the rate limit in `EmailService.js` as needed.
- **Retry Logic**: Exponential backoff is implemented for retrying email sends. The number of retries and the initial delay can be adjusted.
- **Circuit Breaker**: A circuit breaker pattern is used to prevent the system from trying to send emails through a provider that has failed repeatedly.


### **2. Unit Tests**

Use Mocha and Chai for unit testing. Here’s a basic setup for `tests/EmailService.test.js`:

#### **EmailService.test.js**

```javascript
const { expect } = require('chai');
const EmailService = require('../src/EmailService');

describe('EmailService', () => {
    let emailService;
    const mockProvider = {
        name: 'MockProvider',
        send: async (email) => {
            // Simulate a random failure or success
            if (Math.random() > 0.5) throw new Error('Random failure');
        }
    };

    beforeEach(() => {
        emailService = new EmailService([mockProvider]);
    });

    it('should not send email if rate limit is exceeded', async () => {
        emailService.sentCount = emailService.rateLimit; // Simulate rate limit
        const result = await emailService.sendEmail({ id: '1', to: 'test@example.com' });
        expect(result).to.be.false;
        expect(emailService.getStatus()).to.include('Rate limit exceeded for email 1.');
    });

    it('should retry sending email on failure', async () => {
        let attempt = 0;
        const failingProvider = {
            name: 'FailingProvider',
            send: async () => {
                attempt++;
                if (attempt < 3) throw new Error('Random failure');
            }
        };
        emailService = new EmailService([failingProvider]);

        const result = await emailService.sendEmail({ id: '2', to: 'test@example.com' });
        expect(result).to.be.true;
        expect(emailService.getStatus()).to.include('Email sent successfully');
    });

    it('should switch provider after retries', async () => {
        let attempt = 0;
        const failingProvider = {
            name: 'FailingProvider',
            send: async () => {
                attempt++;
                if (attempt < 3) throw new Error('Random failure');
            }
        };
        const succeedingProvider = {
            name: 'SucceedingProvider',
            send: async () => { }
        };
        emailService = new EmailService([failingProvider, succeedingProvider]);

        const result = await emailService.sendEmail({ id: '3', to: 'test@example.com' });
        expect(result).to.be.true;
        expect(emailService.getStatus()).to.include('Email sent successfully');
    });

    it('should handle circuit breaker state', async () => {
        const failingProvider = {
            name: 'FailingProvider',
            send: async () => { throw new Error('Random failure'); }
        };
        emailService = new EmailService([failingProvider]);

        // Force circuit breaker open
        emailService.circuitBreakerState[0].failureCount = emailService.failureThreshold;
        emailService.circuitBreakerState[0].open = true;

        const result = await emailService.sendEmail({ id: '4', to: 'test@example.com' });
        expect(result).to.be.false;
        expect(emailService.getStatus()).to.include('Circuit breaker open for FailingProvider.');
    });

});
```

#### **Testing Commands:**

Ensure have Mocha and Chai installed. Add these dependencies to your `package.json` if they’re not already included:

```sh
npm install mocha chai --save-dev
```

In `package.json`, make sure you have a test script:

```json
"scripts": {
    "test": "mocha tests/*.test.js"
}
```

Run your tests with:

```sh
npm test
```
