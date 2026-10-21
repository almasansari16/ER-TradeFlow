import type { DemoUser, Region, RoleId, Territory } from '@/types/domain'
import { ago } from '@/utils/time'

export const users: DemoUser[] = [
  { id: 'u-dist', name: 'Omar Haddad', email: 'omar.haddad@gulfhorizon.example', title: 'Purchasing Director, Gulf Horizon Trading', role: 'distributor', customerId: 'c-001', active: true, lastActiveAt: ago(0, 1) },
  { id: 'u-sc', name: 'Priya Nair', email: 'priya.nair@tradeflow.example', title: 'Sales Coordinator', role: 'sales_coordinator', active: true, lastActiveAt: ago(0, 0.2) },
  { id: 'u-tm1', name: 'Daniel Okafor', email: 'daniel.okafor@tradeflow.example', title: 'Territory Manager — Gulf', role: 'territory_manager', territoryIds: ['t-uae', 't-gcc'], active: true, lastActiveAt: ago(0, 2) },
  { id: 'u-tm2', name: 'Faisal Rahman', email: 'faisal.rahman@tradeflow.example', title: 'Territory Manager — Saudi Arabia', role: 'territory_manager', territoryIds: ['t-ksa'], active: true, lastActiveAt: ago(0, 5) },
  { id: 'u-tm3', name: 'Sofia Lindqvist', email: 'sofia.lindqvist@tradeflow.example', title: 'Territory Manager — UK & Western Europe', role: 'territory_manager', territoryIds: ['t-uk', 't-weu'], active: true, lastActiveAt: ago(1) },
  { id: 'u-tm4', name: 'Ken Tanaka', email: 'ken.tanaka@tradeflow.example', title: 'Territory Manager — Asia', role: 'territory_manager', territoryIds: ['t-sea', 't-sa'], active: true, lastActiveAt: ago(0, 7) },
  { id: 'u-tm5', name: 'Amara Mensah', email: 'amara.mensah@tradeflow.example', title: 'Territory Manager — East Africa', role: 'territory_manager', territoryIds: ['t-eaf'], active: true, lastActiveAt: ago(2) },
  { id: 'u-rm1', name: 'Layla Mansour', email: 'layla.mansour@tradeflow.example', title: 'Regional Manager — Middle East', role: 'regional_manager', regionId: 'r-me', active: true, lastActiveAt: ago(0, 3) },
  { id: 'u-rm2', name: 'Henrik Bauer', email: 'henrik.bauer@tradeflow.example', title: 'Regional Manager — Europe', role: 'regional_manager', regionId: 'r-eu', active: true, lastActiveAt: ago(0, 9) },
  { id: 'u-rm3', name: 'Mei Lin Wong', email: 'meilin.wong@tradeflow.example', title: 'Regional Manager — Asia Pacific', role: 'regional_manager', regionId: 'r-apac', active: true, lastActiveAt: ago(1, 2) },
  { id: 'u-rm4', name: 'Kwame Asante', email: 'kwame.asante@tradeflow.example', title: 'Regional Manager — Africa', role: 'regional_manager', regionId: 'r-af', active: false, lastActiveAt: ago(16) },
  { id: 'u-gm', name: 'Marcus Chen', email: 'marcus.chen@tradeflow.example', title: 'General Manager', role: 'general_manager', active: true, lastActiveAt: ago(0, 4) },
  { id: 'u-fin', name: 'Aisha Siddiqui', email: 'aisha.siddiqui@tradeflow.example', title: 'Finance Officer', role: 'finance', active: true, lastActiveAt: ago(0, 1) },
  { id: 'u-log', name: 'Carlos Mendes', email: 'carlos.mendes@tradeflow.example', title: 'Logistics Coordinator', role: 'logistics', active: true, lastActiveAt: ago(0, 2) },
  { id: 'u-admin', name: 'Elena Petrova', email: 'elena.petrova@tradeflow.example', title: 'Platform Administrator', role: 'admin', active: true, lastActiveAt: ago(0, 6) },
  { id: 'u-system', name: 'TradeFlow Workflow', email: 'workflow@tradeflow.example', title: 'System', role: 'admin', active: true, lastActiveAt: ago(0) },
]

/** Which seeded user represents each demo role in the role switcher. */
export const DEMO_USER_BY_ROLE: Record<RoleId, string> = {
  distributor: 'u-dist',
  sales_coordinator: 'u-sc',
  territory_manager: 'u-tm1',
  regional_manager: 'u-rm1',
  general_manager: 'u-gm',
  finance: 'u-fin',
  logistics: 'u-log',
  admin: 'u-admin',
}

export const regions: Region[] = [
  { id: 'r-me', name: 'Middle East', managerId: 'u-rm1' },
  { id: 'r-eu', name: 'Europe', managerId: 'u-rm2' },
  { id: 'r-apac', name: 'Asia Pacific', managerId: 'u-rm3' },
  { id: 'r-af', name: 'Africa', managerId: 'u-rm4' },
]

const ALL_BRANDS = ['b-velour', 'b-oud', 'b-noire', 'b-cedar', 'b-aurelle']

export const territories: Territory[] = [
  { id: 't-uae', name: 'UAE & Oman', regionId: 'r-me', countries: ['United Arab Emirates', 'Oman'], managerId: 'u-tm1', defaultCurrency: 'AED', visibleBrandIds: ALL_BRANDS },
  { id: 't-gcc', name: 'Qatar, Bahrain & Kuwait', regionId: 'r-me', countries: ['Qatar', 'Bahrain', 'Kuwait'], managerId: 'u-tm1', defaultCurrency: 'QAR', visibleBrandIds: ALL_BRANDS },
  { id: 't-ksa', name: 'Saudi Arabia', regionId: 'r-me', countries: ['Saudi Arabia'], managerId: 'u-tm2', defaultCurrency: 'SAR', visibleBrandIds: ALL_BRANDS },
  { id: 't-uk', name: 'UK & Ireland', regionId: 'r-eu', countries: ['United Kingdom', 'Ireland'], managerId: 'u-tm3', defaultCurrency: 'GBP', visibleBrandIds: ['b-velour', 'b-noire', 'b-cedar', 'b-aurelle'] },
  { id: 't-weu', name: 'Western Europe', regionId: 'r-eu', countries: ['France', 'Germany', 'Belgium', 'Netherlands'], managerId: 'u-tm3', defaultCurrency: 'EUR', visibleBrandIds: ['b-velour', 'b-noire', 'b-cedar', 'b-aurelle'] },
  { id: 't-sea', name: 'Southeast Asia', regionId: 'r-apac', countries: ['Singapore', 'Malaysia'], managerId: 'u-tm4', defaultCurrency: 'SGD', visibleBrandIds: ALL_BRANDS },
  { id: 't-sa', name: 'South Asia', regionId: 'r-apac', countries: ['Pakistan', 'India', 'Sri Lanka'], managerId: 'u-tm4', defaultCurrency: 'USD', visibleBrandIds: ['b-velour', 'b-oud', 'b-aurelle'] },
  { id: 't-eaf', name: 'East Africa', regionId: 'r-af', countries: ['Kenya', 'Tanzania'], managerId: 'u-tm5', defaultCurrency: 'USD', visibleBrandIds: ['b-velour', 'b-oud', 'b-cedar'] },
]

export const COUNTRIES = territories.flatMap((t) => t.countries.map((c) => ({ country: c, territoryId: t.id }))).sort((a, b) => a.country.localeCompare(b.country))

export const WAREHOUSES = ['Jebel Ali DC — Dubai', 'Rotterdam DC — Netherlands', 'Tuas DC — Singapore']
