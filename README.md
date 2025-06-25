# ComEd Energy Pricing Plugin for Stream Deck

A real-time energy pricing plugin for Elgato Stream Deck that displays current ComEd (Commonwealth Edison) electricity prices with trend indicators to help you make informed decisions about energy usage.

## Features

### 📊 Real-Time Pricing Display
- **5-minute pricing data** prominently displayed (updated every 60 seconds)
- **Hourly average pricing** shown for comparison
- **Smart price formatting**: Displays as dollars ($2.50) for high prices or cents (5.2¢) for lower prices

### 📈 Visual Trend Indicators
- **Up triangle (▲)** in red when prices are rising
- **Down triangle (▼)** in green when prices are falling
- **No indicator** when prices are unchanged or on first load

### 🎨 Dynamic Visual Feedback
- **Green price text** for normal pricing (≤10¢/kWh)
- **Red price text** for high pricing (>10¢/kWh)
- **Color-coded trend arrows** independent of price level

### ⚡ Smart Updates
- **Automatic refresh** every 60 seconds
- **Manual refresh** on key press
- **Error handling** with visual feedback

## Installation

### Prerequisites
- Stream Deck software version 6.4 or higher
- Internet connection for real-time pricing data

### Install from Source
1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd comed-pricing
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   ```

4. Install the plugin in Stream Deck:
   ```bash
   streamdeck link
   ```

## Usage

1. **Add Action**: Drag the "ComEd Pricing" action from the Stream Deck actions panel to any key
2. **View Pricing**: The key will immediately display current 5-minute pricing data
3. **Monitor Trends**: Watch for trend arrows to see if prices are rising or falling
4. **Manual Refresh**: Press the key to manually fetch the latest pricing data

## Display Layout

```
[Price]  [△/▽]
    [Avg Price]
       avg
```

- **Top**: Current 5-minute price (large, color-coded)
- **Right**: Trend indicator (▲ red for rising, ▼ green for falling)
- **Bottom**: Hourly average price with "avg" label

## API Data Sources

This plugin uses ComEd's official public APIs:
- **5-minute feed**: `https://hourlypricing.comed.com/api?type=5minutefeed&format=json`
- **Hourly average**: `https://hourlypricing.comed.com/api?type=currenthouraverage&format=json`

## Development

### Build Commands
```bash
npm run build        # Build the plugin
npm run watch        # Build and watch for changes
npm test            # Run integration tests
```

### Testing
The plugin includes comprehensive integration tests that validate:
- API connectivity and data structure
- Price formatting logic
- Trend calculation algorithms
- SVG generation with proper positioning
- Error handling scenarios

Run tests with:
```bash
npm test
```

### Architecture
- **Action Class**: `ComedPricing` extends `SingletonAction`
- **Display Method**: Dynamic SVG generation via `setImage()`
- **Trend Logic**: Compares current price with previous 5-minute reading from API
- **Update Strategy**: 60-second intervals with manual refresh capability

## Price Thresholds

- **Normal vs High Price**: 10¢/kWh threshold
  - ≤10¢: Green price text
  - >10¢: Red price text
- **Trend Arrows**: 
  - Red ▲: Price increased from previous reading
  - Green ▼: Price decreased from previous reading

## Error Handling

- **API Failures**: Displays "Error" with red error SVG
- **Invalid Data**: Gracefully handles missing or malformed price data
- **Network Issues**: Automatic retry on next update cycle

## Technical Details

- **Update Interval**: 60 seconds
- **API Response Format**: Array of objects with `millisUTC` and `price` fields
- **Price Units**: API returns cents/kWh, displayed as dollars or cents as appropriate
- **SVG Dimensions**: 72x72px optimized for Stream Deck key size

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and add tests
4. Run tests: `npm test`
5. Build: `npm run build`
6. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues or questions:
- Check the [Issues](link-to-issues) page
- Review ComEd's official pricing documentation
- Test API endpoints directly for troubleshooting

---

*This plugin is not officially affiliated with ComEd or Exelon Corporation.* 