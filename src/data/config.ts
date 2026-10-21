import type { ApprovalRule, NotificationPreference, PromoRules } from '@/types/domain'

/** Illustrative tester/sample policy — editable in Administration › Workflow Rules. */
export const defaultPromoRules: PromoRules = {
  enabled: true,
  version: 'Draft v0.3 (illustrative)',
  testerPerUnits: 6,
  samplesPerBlock: 4,
  sampleBlockUnits: 12,
  sampleSizeMl: 1.2,
  eligibleCategories: ['Eau de Parfum', 'Extrait de Parfum', 'Eau de Toilette'],
}

/** Value bands decide how many approval levels a request needs (values in USD). */
export const defaultApprovalRules: ApprovalRule[] = [
  { id: 'ar-1', name: 'Standard request', minValueUsd: 0, maxValueUsd: 25_000, stages: ['Territory Manager'], slaHours: 24, active: true },
  { id: 'ar-2', name: 'Elevated value', minValueUsd: 25_000, maxValueUsd: 100_000, stages: ['Territory Manager', 'Regional Manager'], slaHours: 24, active: true },
  { id: 'ar-3', name: 'Strategic order', minValueUsd: 100_000, maxValueUsd: null, stages: ['Territory Manager', 'Regional Manager', 'General Manager'], slaHours: 48, active: true },
]

export const defaultNotificationPrefs: NotificationPreference[] = [
  { id: 'np-1', event: 'Request awaiting my approval', description: 'A sales order request enters an approval stage assigned to you.', inApp: true, email: true, roles: ['territory_manager', 'regional_manager', 'general_manager'] },
  { id: 'np-2', event: 'Approval SLA breached', description: 'A request has waited longer than the configured SLA.', inApp: true, email: true, roles: ['territory_manager', 'regional_manager', 'general_manager', 'sales_coordinator'] },
  { id: 'np-3', event: 'Request status changed', description: 'Approved, rejected or changes requested on a request you created.', inApp: true, email: true, roles: ['distributor', 'sales_coordinator'] },
  { id: 'np-4', event: 'Proforma invoice issued', description: 'A proforma invoice is ready for payment.', inApp: true, email: true, roles: ['distributor', 'finance'] },
  { id: 'np-5', event: 'Payment receipt uploaded', description: 'A customer uploaded proof of payment for verification.', inApp: true, email: false, roles: ['finance'] },
  { id: 'np-6', event: 'Ready for collection', description: 'Goods and documents are ready at the warehouse.', inApp: true, email: true, roles: ['distributor', 'logistics'] },
  { id: 'np-7', event: 'New distributor application', description: 'A new registration was submitted through the portal.', inApp: true, email: false, roles: ['sales_coordinator', 'territory_manager'] },
  { id: 'np-8', event: 'Integration failure', description: 'A record failed to synchronise with the ERP (simulated).', inApp: true, email: true, roles: ['admin', 'finance'] },
]
