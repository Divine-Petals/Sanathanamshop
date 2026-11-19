// The shop's WhatsApp number comes from the store settings (Admin → Inventory).

export function orderWhatsAppText(order, brandName) {
  const lines = [
    `Hi ${brandName}, I placed order ${order.order_number}.`,
    '',
    ...order.items.map((i) => `• ${i.name} × ${i.qty} — ₹${(i.price_in_inr * i.qty).toFixed(2)}`),
    '',
    `Total: ₹${Number(order.total_price).toFixed(2)}`,
  ]
  return lines.join('\n')
}

export function normalizeWhatsAppNumber(value) {
  return (value ?? '').replace(/\D/g, '')
}

// Opens a chat with the shop's number. Returns null when no number is configured,
// so the customer is never sent to WhatsApp's contact picker.
export function orderWhatsAppLink(order, brandName, shopNumber) {
  const number = normalizeWhatsAppNumber(shopNumber)
  if (!number) return null
  return `https://wa.me/${number}?text=${encodeURIComponent(orderWhatsAppText(order, brandName))}`
}
