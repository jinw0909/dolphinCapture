const cron = require('node-cron'); // Import node-cron for scheduling
const { crawlPortfolio } = require('./routes/capture'); // Import the function
require('./scheduler');

// Schedule the function using node-cron

// step 1. capture portfolio and update fields of userWallet
cron.schedule('37 * * * *', async () => {
    const now = new Date();
    const currentTime = now.toISOString(); // Log the current time in ISO format
    console.log(`Running crawlPortfolio() at ${currentTime}`);
    try {
        await crawlPortfolio(); // Call the function
        console.log('crawlPortfolio() completed successfully');
    } catch (error) {
        console.error('Error during crawlPortfolio():', error.message);
    }
});

console.log('Scheduler initialized');
