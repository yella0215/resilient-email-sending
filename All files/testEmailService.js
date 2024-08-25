const EmailService = require('./EmailService');

const mockProvider1 = {
    name: 'Provider1',
    send: async (email) => {
        console.log(`Provider1 sending email to ${email.to}`);
        if (Math.random() > 0.5) throw new Error('Random failure');
    }
};

const mockProvider2 = {
    name: 'Provider2',
    send: async (email) => {
        console.log(`Provider2 sending email to ${email.to}`);
        if (Math.random() > 0.5) throw new Error('Random failure');
    }
};

const emailService = new EmailService([mockProvider1, mockProvider2]);

async function test() {
    const email = { id: '1', to: 'test@example.com', subject: 'Test', body: 'Hello!' };
    const result = await emailService.sendEmail(email);
    console.log(`Email sent result: ${result}`);
    console.log(`Status Log: ${emailService.getStatus()}`);
}

test();
