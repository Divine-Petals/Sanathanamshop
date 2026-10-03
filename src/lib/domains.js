/** Shop collections on the single sanathanamshop catalog. */
export const PRODUCT_DOMAINS = ['Jewels', 'Soaps', 'Arts']

export function normalizeProductDomain(value) {
  if (!value) return ''
  const needle = String(value).trim().toLowerCase()
  return PRODUCT_DOMAINS.find((d) => d.toLowerCase() === needle) ?? ''
}
