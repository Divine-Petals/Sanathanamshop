/** Offer price, with the MRP struck out and the discount when the MRP is higher. */
export function priceInfo(product) {
  const offer = Number(product.price_in_inr) || 0
  const mrp = Number(product.mrp) || 0
  const onOffer = mrp > offer && offer > 0
  return { offer, mrp, onOffer, percentOff: onOffer ? Math.round((1 - offer / mrp) * 100) : 0 }
}

const fmt = (n) => `₹${Number.isInteger(n) ? n : n.toFixed(2)}`

export default function Price({ product, className = '', mrpClassName = 'text-earth-400', badgeClassName = 'text-green-700' }) {
  const { offer, mrp, onOffer, percentOff } = priceInfo(product)
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      <span className={className}>{fmt(offer)}</span>
      {onOffer && (
        <>
          <s className={`text-xs font-normal ${mrpClassName}`} aria-label={`MRP ${fmt(mrp)}`}>
            {fmt(mrp)}
          </s>
          <span className={`text-[11px] font-semibold ${badgeClassName}`}>{percentOff}% off</span>
        </>
      )}
    </span>
  )
}
