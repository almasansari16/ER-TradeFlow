/**
 * Product brand configuration.
 * Change the name, tagline or category here — every screen reads from this file.
 */
export const BRAND = {
  name: 'TradeFlow',
  /** Two-tone wordmark: first part in ink, second in slate (matches the logo artwork). */
  wordmark: ['Trade', 'Flow'] as const,
  /** Logo assets live in public/brand/. */
  markSrc: '/brand/tradeflow-mark.png',
  category: 'B2B Distribution & Sales Management Platform',
  tagline: 'From Customer Request to Fulfillment.',
  supportEmail: 'support@tradeflow.example',
  /** Shown wherever the app needs to be explicit that it is a prototype. */
  demoNotice: 'Frontend prototype — all data is illustrative and every action is simulated locally.',
} as const
