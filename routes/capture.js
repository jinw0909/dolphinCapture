const express = require('express');
const router = express.Router();
const db = require('../connection');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { CrawledWallet, sequelize} = require('../models');
const { query } = require('../connection');

async function crawlPortfolio() {
    const browser = await puppeteer.launch({ headless: true });
    // Helper function for delay
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    try {
        const page = await browser.newPage();

        await CrawledWallet.update(
            { show: 'N'},
            { where: {}}
        )

        // Query to fetch addresses where target is 'Y'
        const sql = 'SELECT address, id FROM Top_Trader WHERE target = ? ORDER BY insert_dt DESC';
        const traders = await db.query(sql, ['Y']);

        const results = [];
        let buttonsClicked = false;

        for (const trader of traders) {
            const result = await crawlTraderData(page, trader.address, trader.id, buttonsClicked);
            buttonsClicked = true;
            results.push(result);
            await saveCrawledData(result);
            console.log("success saving crawled data of trader: " + trader.address);
            // await delay(1000);
        }
        console.log("captured and saved portfolio of toptraders from gmgn");
        return results;
    } catch (error) {
        console.error('Error fetching portfolio:', error.message);
    } finally {
        await browser.close();
    }
}
async function crawlTraderData(page, address, userId, buttonsClicked) {
    try {
        // Navigate to the page
        const url = `https://gmgn.ai/sol/address/${address}`;
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });

        console.log(`Page loaded successfully for address: ${address}`);

        // Step 1: Directly select the second child div by its id
        const secondChildDiv = await page.$('#tabs-leftTabs--tabpanel-1');
        if (!secondChildDiv) {
            console.error("Couldn't find the second child div with id 'tabs-leftTabs--tabpanel-1'.");
            return { address, total_pnl: 'Error', tokens: [], token_symbols: [] };
        }

        // Step 2: Click the buttons (checkboxes) if not already clicked
        if (!buttonsClicked) {
            const checkboxContainer = await secondChildDiv.$(':first-child > div > div');
            if (!checkboxContainer) {
                console.error("Couldn't find the checkbox container.");
                return { address, total_pnl: 'Error', tokens: [], token_symbols: [] };
            }

            // Click each checkbox
            // Click first child
            await checkboxContainer.evaluate((container) => {
                // const children = Array.from(container.children); // Get all direct child elements
                // children.forEach((child) => child.click()); // Simulate a click on each
                const firstChild = container.children[0]; //Get the first child element
                if (firstChild) {
                    firstChild.click();
                }
            });

            // console.log('All checkboxes clicked successfully.');
            console.log('First checkbox clicked successfully.');

            // Add a small delay to allow any dynamic updates to complete
            const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
            await delay(2000); // 2-second delay after clicking buttons
        }

        // Step 3: Extract `total_pnl` from the page
        const totalPnl = await page.evaluate(() => {
            const parentDiv = document.querySelector('div.css-1ug9me3');
            if (parentDiv) {
                const firstChildDiv = parentDiv.children[1];
                if (firstChildDiv) {
                    const targetDiv = firstChildDiv.children[1];
                    return targetDiv ? targetDiv.textContent.trim() : null;
                }
            }
            return null;
        });

        // Step 4: Extract token data from the second table
        const tokenData = await secondChildDiv.evaluate((secondDiv) => {
            const rows = Array.from(secondDiv.querySelectorAll('.g-table-tbody tr'));
            return rows.map((row) => {
                const tds = row.querySelectorAll('td');
                if (!tds || tds.length < 9) return null;

                return {
                    token: {
                        address: tds[0]?.querySelector('a')?.href.split('/').pop(),
                        icon: tds[0]?.querySelector('.chakra-image')?.src || null,
                        symbol: tds[0]?.querySelector('.css-j7qwjs')?.getAttribute('title') || null,
                    },
                    unrealized_profit: {
                        amount: tds[1]?.querySelector('div > p:nth-child(1)')?.textContent.trim() || '-',
                        percentage: tds[1]?.querySelector('div > p:nth-child(2)')?.textContent.trim() || '-',
                    },
                    realized_profit: {
                        amount: tds[2]?.querySelector('div > p:nth-child(1)')?.textContent.trim() || '-',
                        percentage: tds[2]?.querySelector('div > p:nth-child(2)')?.textContent.trim() || '-',
                    },
                    total_profit: {
                        amount: tds[3]?.querySelector('div > p:nth-child(1)')?.textContent.trim() || '-',
                        percentage: tds[3]?.querySelector('div > p:nth-child(2)')?.textContent.trim() || '-',
                    },
                    value: {
                        usd: tds[4]?.querySelector('div:nth-child(1)')?.textContent.trim() || '-',
                        balance: tds[4]?.querySelector('div:nth-child(2)')?.textContent.trim() || '-',
                    },
                    ratio: tds[5]?.querySelector('div')?.textContent.trim() || '-',
                    retain_time: tds[6]?.querySelector('div')?.textContent.trim() || '-',
                    purchase: {
                        volume: tds[7]?.querySelector('div > p:nth-child(1)')?.textContent.trim() || '-',
                        avg_cost: tds[7]?.querySelector('div > p:nth-child(2)')?.textContent.trim() || '-',
                    },
                    sell: {
                        volume: tds[8]?.querySelector('div > p:nth-child(1)')?.textContent.trim() || '-',
                        avg_price: tds[8]?.querySelector('div > p:nth-child(2)')?.textContent.trim() || '-',
                    },
                    activity_30d: {
                        buy_count: tds[9]?.querySelector('div > div:nth-child(1)')?.textContent.trim() || '0',
                        sell_count: tds[9]?.querySelector('div > div:nth-child(2)')?.textContent.trim() || '0',
                    },
                };
            }).filter(Boolean);
        });

        return { address, userId, total_pnl: totalPnl, tokens: tokenData };
    } catch (error) {
        console.error(`Error processing address ${address}:`, error.message);
        return { address, total_pnl: 'Error', tokens: [] };
    }
}
async function saveCrawledData(data) {
    // Extract `total_pnl` and `total_pnl_rate` from `data.total_pnl`
    const pnlMatch = data.total_pnl.match(/([+\-]?\$[\d.,KM]+)\s\(([+\-]?[\d.]+%)\)/);
    const totalPnl = pnlMatch ? pnlMatch[1] : null; // e.g., "+$1.2M"
    const totalPnlRate = pnlMatch ? pnlMatch[2] : null; // e.g., "+25.82%"

    // Update the TopTrader table for the given address
    // if (totalPnl !== null && totalPnlRate !== null) {
    //     await TopTrader.update(
    //         {
    //             total_pnl: totalPnl,
    //             total_pnl_rate: totalPnlRate,
    //         },
    //         {
    //             where: { address: data.address }, // Match the `address` field
    //         }
    //     ).catch((err) => {
    //         console.error('Error updating TopTrader:', err.message);
    //     });
    // } else {
    //     console.warn('Could not parse total_pnl or total_pnl_rate for TopTrader update.');
    // }

    // save token data to the CrawledWallet table
    for (const token of data.tokens) {
        const walletData = {
            user_address: data.address,
            user_num: data.userId,
            symbol: token.token.symbol,
            symbol_address: token.token.address,
            icon: token.token.icon,
            pnl: token.unrealized_profit.amount || '-',
            pnl_percentage: token.unrealized_profit.percentage || '-',
            upnl: token.realized_profit.amount || '-',
            upnl_percentage: token.realized_profit.percentage || '-',
            total_pnl: token.total_profit.amount || '-',
            total_pnl_percentage: token.total_profit.percentage || '-',
            cost: token.purchase.volume || '-',
            holding: token.value.balance || '-',
            size: token.value.usd || '-',
            ratio: token.ratio || '-',
            retain: token.retain_time || '-',
            purchase_volume: token.purchase.volume || '-',
            purchase_avg_cost: token.purchase.avg_cost || '-',
            sell_volume: token.sell.volume || '-',
            sell_avg_price: token.sell.avg_price || '-',
            '30d_buycount': parseInt(token.activity_30d.buy_count, 10) || 0,
            '30d_sellcount': parseInt(token.activity_30d.sell_count, 10) || 0,
            show: 'Y'
        };

        // Save to CrawledWallet
        // await CrawledWallet.create(walletData).catch((err) => {
        //     console.error('Error saving wallet data:', err.message);
        // });
        // Use upsert to insert or update the row
        await CrawledWallet.upsert(walletData, {
            conflictFields: ['user_address', 'symbol_address'], // Columns to check for duplicates
        }).catch((err) => {
            console.error('Error saving/updating wallet data:', err.message);
        });
    }
}
async function setCurrent() {
    await CrawledWallet.update(
        { current: 'N'},
        { where: {}}
    );
    await CrawledWallet.update(
        { current: 'Y'},
        { where: { show: 'Y'}}
    );
}
async function clean() {
    await CrawledWallet.destroy(
        { where: { current: 'N'}}
    );
}
/* GET home page. */
// router.get('/', async function (req, res, next) {
//     try {
//         // Query to fetch addresses where target is 'Y'
//         const sql = 'SELECT address, id FROM Top_Trader WHERE target = ? ORDER BY insert_dt DESC';
//         const traders = await db.query(sql, ['Y']);
//
//         await CrawledWallet.update(
//             { show: 'N'},
//             {where: {}}
//         )
//
//         const results = [];
//         for (const trader of traders) {
//             const address = trader.address;
//             const userId = trader.id;
//             const result = await crawlTraderData(address, userId);
//             results.push(result);
//             await saveCrawledData(result);
//             console.log("success crawling and saving data for user: " + address);
//         }
//
//         res.json(results);
//     } catch (error) {
//         console.error('Error fetching addresses:', error);
//         next(error); // Pass the error to the error-handling middleware
//     }
// });
//
router.get('/', async function (req, res) {
    try {
        const results = await crawlPortfolio();
        res.status(200).json(results);
    } catch (error) {
        console.error('Error fetching addresses:', error.message);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/current', async function(req, res) {
    try {
        await setCurrent();
        console.log("set current rows");
        res.status(200).send("set current rows");
    } catch (error) {
        console.error("failed to set current");
    }
});

router.get('/clean', async function(req, res) {
    try {
        await clean();
        console.log("deleted unreferenced rows");
        res.status(200).send("cleaned unreferenced rows");
    } catch (error) {
        console.error("failed to clean unreferenced data");
    }
});

module.exports = {
    captureRouter: router,
    crawlPortfolio
};
