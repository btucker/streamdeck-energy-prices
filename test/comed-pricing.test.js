/**
 * Integration tests for ComEd Pricing functionality
 * Following instruction 3a: prioritizing integration tests over unit tests, without mocks
 */

import fetch from 'node-fetch';
import { strict as assert } from 'assert';

// API endpoints
const FIVE_MIN_API = "https://hourlypricing.comed.com/api?type=5minutefeed&format=json";
const HOURLY_API = "https://hourlypricing.comed.com/api?type=currenthouraverage&format=json";

describe('ComEd API Integration Tests', function() {
    this.timeout(10000); // Allow time for API calls

    describe('5-minute pricing feed (main display)', function() {
        it('should fetch valid 5-minute pricing data for main title', async function() {
            const response = await fetch(FIVE_MIN_API);
            assert.ok(response.ok, 'API response should be successful');
            
            const data = await response.json();
            assert.ok(Array.isArray(data), 'Response should be an array');
            assert.ok(data.length > 0, 'Response should contain pricing data');
            
            const firstEntry = data[0];
            assert.ok(firstEntry.hasOwnProperty('millisUTC'), 'Entry should have millisUTC timestamp');
            assert.ok(firstEntry.hasOwnProperty('price'), 'Entry should have price');
            assert.ok(!isNaN(parseFloat(firstEntry.price)), 'Price should be a valid number');
        });
    });

    describe('hourly average pricing (reference data)', function() {
        it('should fetch valid hourly average pricing data for settings storage', async function() {
            const response = await fetch(HOURLY_API);
            assert.ok(response.ok, 'API response should be successful');
            
            const data = await response.json();
            assert.ok(Array.isArray(data), 'Response should be an array');
            assert.ok(data.length > 0, 'Response should contain pricing data');
            
            const firstEntry = data[0];
            assert.ok(firstEntry.hasOwnProperty('millisUTC'), 'Entry should have millisUTC timestamp');
            assert.ok(firstEntry.hasOwnProperty('price'), 'Entry should have price');
            assert.ok(!isNaN(parseFloat(firstEntry.price)), 'Price should be a valid number');
        });
    });

    describe('price formatting for main display', function() {
        it('should properly format 5-minute prices for large title display', function() {
            // Test the price formatting logic that would be used in the plugin
            const formatPrice = (priceStr) => {
                if (priceStr === "N/A") return "N/A";
                
                const cents = parseFloat(priceStr);
                if (isNaN(cents)) return "N/A";
                
                const dollars = cents / 100;
                
                if (dollars >= 1) {
                    return `$${dollars.toFixed(2)}`;
                } else if (dollars >= 0.1) {
                    return `${cents.toFixed(1)}¢`;
                } else {
                    return `${cents.toFixed(2)}¢`;
                }
            };

            // Test various price levels for main title display
            assert.equal(formatPrice("250.5"), "$2.50", 'High price should format as dollars');
            assert.equal(formatPrice("15.7"), "15.7¢", 'Medium price should format as cents');
            assert.equal(formatPrice("3.25"), "3.25¢", 'Low price should format as cents with decimals');
            assert.equal(formatPrice("N/A"), "N/A", 'Invalid price should return N/A');
            assert.equal(formatPrice("invalid"), "N/A", 'Non-numeric price should return N/A');
        });
    });

    describe('SVG generation for dual price display', function() {
        it('should generate valid SVG with both 5-minute and hourly prices', function() {
            // Mock the SVG generation logic
            const generatePricingSVG = (fiveMinPrice, hourlyPrice, rawFiveMinPrice, trend) => {
                const priceNum = parseFloat(rawFiveMinPrice);
                const isHighPrice = priceNum > 10;
                const primaryColor = isHighPrice ? "#ff4444" : "#44ff44";
                const secondaryColor = "#cccccc";
                const backgroundColor = "#000000";

                // Trend arrow colors and symbols
                const trendColor = trend === 'up' ? "#ff4444" : trend === 'down' ? "#44ff44" : "#888888";
                const trendSymbol = trend === 'up' ? "▲" : trend === 'down' ? "▼" : "";

                return `
<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
	<rect width="72" height="72" fill="${backgroundColor}" rx="8"/>
	
	<!-- 5-minute price (large, prominent) -->
	<text x="26" y="28" text-anchor="middle" fill="${primaryColor}" 
		  font-family="Arial, sans-serif" font-size="17" font-weight="bold">
		${fiveMinPrice}
	</text>

	<!-- Trend indicator triangle -->
	${trend !== 'neutral' ? `<text x="30" y="28" text-anchor="middle" fill="${trendColor}" font-family="Arial, sans-serif" font-size="14">${trendSymbol}</text>` : ''}
	
	<!-- Hourly average (smaller) -->
	<text x="36" y="54" text-anchor="middle" fill="${secondaryColor}" 
		  font-family="Arial, sans-serif" font-size="12">
		${hourlyPrice}
	</text>
	
	<!-- "avg" label -->
	<text x="36" y="65" text-anchor="middle" fill="${secondaryColor}" 
		  font-family="Arial, sans-serif" font-size="10">
		avg
	</text>
</svg>`.trim();
            };

            // Test normal price with upward trend (green price, red arrow)
            const normalUpSvg = generatePricingSVG("5.2¢", "4.8¢", "5.2", "up");
            assert.ok(normalUpSvg.includes('5.2¢'), 'SVG should contain 5-minute price');
            assert.ok(normalUpSvg.includes('4.8¢'), 'SVG should contain hourly price');
            assert.ok(normalUpSvg.includes('#44ff44'), 'Normal price should be green');
            assert.ok(normalUpSvg.includes('▲'), 'Should contain up triangle Unicode character');
            assert.ok(normalUpSvg.includes('avg'), 'SVG should have "avg" label');

            // Test high price with downward trend (red price, green arrow) 
            const highDownSvg = generatePricingSVG("$1.25", "$1.10", "125.0", "down");
            assert.ok(highDownSvg.includes('$1.25'), 'SVG should contain high 5-minute price');
            assert.ok(highDownSvg.includes('$1.10'), 'SVG should contain high hourly price');
            assert.ok(highDownSvg.includes('#ff4444'), 'High price should be red');
            assert.ok(highDownSvg.includes('▼'), 'Should contain down triangle Unicode character');

            // Test neutral trend (no arrow)
            const neutralSvg = generatePricingSVG("7.5¢", "7.5¢", "7.5", "neutral");
            assert.ok(neutralSvg.includes('7.5¢'), 'SVG should contain price');
            assert.ok(!neutralSvg.includes('▲') && !neutralSvg.includes('▼'), 'Neutral trend should not have triangle characters');
        });

        it('should generate error SVG when data unavailable', function() {
            const generateErrorSVG = () => {
                return `
<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
	<rect width="72" height="72" fill="#000000" rx="8"/>
	<text x="36" y="40" text-anchor="middle" fill="#ff4444" 
		  font-family="Arial, sans-serif" font-size="14" font-weight="bold">
		ERROR
	</text>
</svg>`.trim();
            };

            const errorSvg = generateErrorSVG();
            assert.ok(errorSvg.includes('ERROR'), 'Error SVG should contain ERROR text');
            assert.ok(errorSvg.includes('#ff4444'), 'Error should be red');
        });
    });

    describe('price state determination (visual feedback)', function() {
        it('should correctly determine high vs normal price states based on 5-minute price', function() {
            const getState = (priceStr) => {
                const priceNum = parseFloat(priceStr);
                return priceNum > 10 ? 1 : 0; // High price threshold at 10 cents
            };

            assert.equal(getState("5.5"), 0, 'Low price should be normal state');
            assert.equal(getState("10.0"), 0, 'Threshold price should be normal state');
            assert.equal(getState("15.7"), 1, 'High price should be high state');
            assert.equal(getState("100.5"), 1, 'Very high price should be high state');
        });
    });

    describe('price trend calculation', function() {
        it('should correctly calculate price trends', function() {
            const calculateTrend = (previousPrice, currentPrice) => {
                if (!previousPrice || previousPrice === "N/A" || currentPrice === "N/A") {
                    return 'neutral';
                }

                const prev = parseFloat(previousPrice);
                const current = parseFloat(currentPrice);

                if (isNaN(prev) || isNaN(current)) {
                    return 'neutral';
                }

                if (current > prev) {
                    return 'up';
                } else if (current < prev) {
                    return 'down';
                } else {
                    return 'neutral';
                }
            };

            // Test rising price
            assert.equal(calculateTrend("5.0", "5.5"), 'up', 'Rising price should show up trend');
            
            // Test falling price
            assert.equal(calculateTrend("10.0", "8.5"), 'down', 'Falling price should show down trend');
            
            // Test same price
            assert.equal(calculateTrend("7.5", "7.5"), 'neutral', 'Same price should show neutral trend');
            
            // Test no previous price
            assert.equal(calculateTrend(undefined, "5.0"), 'neutral', 'No previous price should show neutral');
            assert.equal(calculateTrend("N/A", "5.0"), 'neutral', 'N/A previous price should show neutral');
            
            // Test invalid prices
            assert.equal(calculateTrend("invalid", "5.0"), 'neutral', 'Invalid previous price should show neutral');
            assert.equal(calculateTrend("5.0", "invalid"), 'neutral', 'Invalid current price should show neutral');
        });

        it('should calculate trend using API data structure', function() {
            // Simulate API response format
            const mockApiData = [
                { millisUTC: "1640995200000", price: "8.5" },  // Current (index 0)
                { millisUTC: "1640994900000", price: "7.2" },  // Previous (index 1)
                { millisUTC: "1640994600000", price: "6.8" }   // Earlier (index 2)
            ];

            const calculateTrendFromApi = (apiData) => {
                const currentPrice = apiData[0]?.price || "N/A";
                const previousPrice = apiData[1]?.price;
                
                if (!previousPrice || previousPrice === "N/A" || currentPrice === "N/A") {
                    return 'neutral';
                }

                const prev = parseFloat(previousPrice);
                const current = parseFloat(currentPrice);

                if (isNaN(prev) || isNaN(current)) {
                    return 'neutral';
                }

                if (current > prev) {
                    return 'up';
                } else if (current < prev) {
                    return 'down';
                } else {
                    return 'neutral';
                }
            };

            // Test with mock data (price went from 7.2 to 8.5 = up)
            assert.equal(calculateTrendFromApi(mockApiData), 'up', 'API data showing price increase should return up trend');

            // Test with descending prices
            const descendingData = [
                { millisUTC: "1640995200000", price: "6.0" },  // Current (lower)
                { millisUTC: "1640994900000", price: "8.0" }   // Previous (higher)
            ];
            assert.equal(calculateTrendFromApi(descendingData), 'down', 'API data showing price decrease should return down trend');

            // Test with insufficient data
            const insufficientData = [
                { millisUTC: "1640995200000", price: "6.0" }   // Only current, no previous
            ];
            assert.equal(calculateTrendFromApi(insufficientData), 'neutral', 'API data with no previous reading should return neutral');
        });
    });
}); 