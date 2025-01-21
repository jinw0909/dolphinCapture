const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('CrawledWallet', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        user_address: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        user_num: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        symbol: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        symbol_address: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        // name: {
        //     type: DataTypes.STRING,
        // },
        cost: {
            type: DataTypes.STRING,
            defaultValue: '-',
        },
        holding: {
            type: DataTypes.STRING,
            defaultValue: '-',
        },
        size: {
            type: DataTypes.STRING,
            defaultValue: '-',
        },
        'pnl': {
            type: DataTypes.STRING,
            defaultValue: '-'
        },
        'pnl_percentage': {
            type: DataTypes.STRING,
            defaultValue: '-'
        },
        'upnl': {
            type: DataTypes.STRING,
            defaultValue: '-'
        },
        'upnl_percentage' : {
            type: DataTypes.STRING,
            defaultValue: '-'
        },
        'total_pnl': {
            type: DataTypes.STRING,
            defaultValue: '-'
        },
        'total_pnl_percentage': {
            type: DataTypes.STRING,
            defaultValue: '-'
        },
        'ratio': {
            type: DataTypes.STRING,
            defaultValue: '-'
        },
        'retain': {
            type: DataTypes.STRING,
            defaultValue: '-'
        },
        'purchase_volume': {
            type: DataTypes.STRING,
            defaultValue: '-'
        },
        'purchase_avg_cost': {
            type: DataTypes.STRING,
            defaultValue: '-'
        },
        'sell_volume': {
            type: DataTypes.STRING,
            defaultValue: '-'
        },
        'sell_avg_price': {
            type: DataTypes.STRING,
            defaultValue: '-'
        },
        '30d_buycount': {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        '30d_sellcount': {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        icon: {
            type: DataTypes.STRING,
        },
        current: {
            type: DataTypes.STRING,
            defaultValue: 'N',
        },
        show: {
            type: DataTypes.STRING,
            defaultValue: 'N',
        },
    }, {
        tableName: 'Crawled_Wallet',
        timestamps: false, // Disable createdAt and updatedAt
        indexes: [
            {
                unique: true,
                fields: ['user_address', 'symbol_address'], // Ensure uniqueness for user_address and symbol_address
            },
        ],
    });
};
