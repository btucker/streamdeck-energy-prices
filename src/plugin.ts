import streamDeck, { LogLevel } from "@elgato/streamdeck";

import { ComedPricing } from "./actions/comed-pricing";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel(LogLevel.TRACE);

// Register the ComEd pricing action.
streamDeck.actions.registerAction(new ComedPricing());

// Finally, connect to the Stream Deck.
streamDeck.connect();
