const cron = require('node-cron'); // Import node-cron for scheduling
const { getTraders, processTraders, processTransactionData, processUpnl, getExtraPnl, getSolanaPrice, getExtraPnlDay } = require('./routes/capture'); // Import the function

// Schedule the function using node-cron

// step 1. capture portfolio and insert to crawledWallet
cron.schedule('45 * * * *', async () => {
    const now = new Date();
    const currentTime = now.toISOString(); // Log the current time in ISO format
    console.log(`Running getTraders() at ${currentTime}`);
    try {
        await getTraders(); // Call the function
        console.log('getTraders() completed successfully');
    } catch (error) {
        console.error('Error during getTraders():', error.message);
    }
});
console.log('Scheduler initialized');
