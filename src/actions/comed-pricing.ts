import { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";

/**
 * ComEd pricing data structure from their API
 */
interface ComedPriceData {
	millisUTC: string;
	price: string;
}

/**
 * Action that displays current ComEd energy prices with 5-minute and hourly average data
 */
@action({ UUID: "com.quotably.comed-pricing.display" })
export class ComedPricing extends SingletonAction {
	private updateInterval?: NodeJS.Timeout;
	private static readonly UPDATE_INTERVAL_MS = 60000; // Update every minute
	private static readonly FIVE_MIN_API = "https://hourlypricing.comed.com/api?type=5minutefeed&format=json";
	private static readonly HOURLY_API = "https://hourlypricing.comed.com/api?type=currenthouraverage&format=json";

	/**
	 * When the action appears, start fetching and displaying ComEd pricing data
	 */
	override async onWillAppear(ev: WillAppearEvent): Promise<void> {
		// Initial fetch
		await this.updatePricing(ev.action);
		
		// Set up periodic updates
		this.updateInterval = setInterval(async () => {
			await this.updatePricing(ev.action);
		}, ComedPricing.UPDATE_INTERVAL_MS);
	}

	/**
	 * Clean up interval when action disappears
	 */
	override onWillDisappear(): void {
		if (this.updateInterval) {
			clearInterval(this.updateInterval);
			this.updateInterval = undefined;
		}
	}

	/**
	 * Manual refresh on key press
	 */
	override async onKeyDown(ev: KeyDownEvent): Promise<void> {
		await this.updatePricing(ev.action);
	}

	/**
	 * Fetch latest pricing data and update the display
	 */
	private async updatePricing(action: any): Promise<void> {
		try {
			// Fetch both APIs in parallel
			const [fiveMinResponse, hourlyResponse] = await Promise.all([
				fetch(ComedPricing.FIVE_MIN_API),
				fetch(ComedPricing.HOURLY_API)
			]);

			if (!fiveMinResponse.ok || !hourlyResponse.ok) {
				throw new Error('API request failed');
			}

			const fiveMinData = await fiveMinResponse.json() as ComedPriceData[];
			const hourlyData = await hourlyResponse.json() as ComedPriceData[];

			// Get the most recent prices
			const currentFiveMinPrice = fiveMinData[0]?.price || "N/A";
			const currentHourlyPrice = hourlyData[0]?.price || "N/A";

			// Determine trend using current vs previous 5-minute reading from API
			const previousFiveMinPrice = fiveMinData[1]?.price;
			const trend = this.calculateTrend(previousFiveMinPrice, currentFiveMinPrice);

			// Format both prices
			const fiveMinFormatted = this.formatPrice(currentFiveMinPrice);
			const hourlyFormatted = this.formatPrice(currentHourlyPrice);
			
			// Generate SVG with both prices and trend indicator
			const svg = this.generatePricingSVG(fiveMinFormatted, hourlyFormatted, currentFiveMinPrice, trend);
			await action.setImage(`data:image/svg+xml,${encodeURIComponent(svg)}`);

			// Clear title to let SVG handle all display
			await action.setTitle("");

			// Store prices in settings for reference
			const settings = {
				fiveMinPrice: currentFiveMinPrice,
				hourlyPrice: currentHourlyPrice,
				fiveMinFormatted: fiveMinFormatted,
				hourlyFormatted: hourlyFormatted,
				trend: trend,
				lastUpdate: Date.now()
			};
			await action.setSettings(settings);

			// Set state based on price level (normal vs high price)
			const fiveMinPriceNum = parseFloat(currentFiveMinPrice);
			const state = fiveMinPriceNum > 10 ? 1 : 0; // High price threshold at 10 cents
			await action.setState(state);

		} catch (error) {
			console.error('Error fetching ComEd pricing:', error);
			await action.setTitle('Error');
			// Show error in SVG too
			const errorSvg = this.generateErrorSVG();
			await action.setImage(`data:image/svg+xml,${encodeURIComponent(errorSvg)}`);
		}
	}

	/**
	 * Calculate price trend compared to previous reading
	 */
	private calculateTrend(previousPrice: string | undefined, currentPrice: string): 'up' | 'down' | 'neutral' {
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
	}

	/**
	 * Format price from cents to dollars with appropriate precision
	 */
	private formatPrice(priceStr: string): string {
		if (priceStr === "N/A") return "N/A";
		
		const cents = parseFloat(priceStr);
		if (isNaN(cents)) return "N/A";
		
		const dollars = cents / 100;
		
		// Use different formatting based on price magnitude
		if (dollars >= 1) {
			return `$${dollars.toFixed(2)}`;
		} else {
			return `${cents.toFixed(1)}¢`;
		}
	}

	/**
	 * Generate SVG displaying both prices with trend indicator
	 */
	private generatePricingSVG(fiveMinPrice: string, hourlyPrice: string, rawFiveMinPrice: string, trend: 'up' | 'down' | 'neutral'): string {
		// Determine colors based on price level
		const priceNum = parseFloat(rawFiveMinPrice);
		const isHighPrice = priceNum > 10;
		const primaryColor = isHighPrice ? "#ff4444" : "#44ff44"; // Red for high, green for normal
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
		  font-family="Arial, sans-serif" font-size="18" font-weight="bold">
		${fiveMinPrice}
	</text>

  ${trend !== 'neutral' ? `<text x="60" y="28" text-anchor="middle" fill="${trendColor}" font-family="Arial, sans-serif" font-size="14">${trendSymbol}</text>` : ''}

	<!-- Hourly average (smaller) -->
	<text x="36" y="54" text-anchor="middle" fill="${secondaryColor}" 
		  font-family="Arial, sans-serif" font-size="14">
		${hourlyPrice} avg
	</text>
</svg>`.trim();
	}

	/**
	 * Generate error SVG
	 */
	private generateErrorSVG(): string {
		return `
<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
	<rect width="72" height="72" fill="#000000" rx="8"/>
	<text x="36" y="40" text-anchor="middle" fill="#ff4444" 
		  font-family="Arial, sans-serif" font-size="14" font-weight="bold">
		ERROR
	</text>
</svg>`.trim();
	}
} 