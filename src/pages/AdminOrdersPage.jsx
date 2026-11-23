import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useAdminSite } from '../context/AdminSiteContext'

const STATUSES = ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled']
const PAYMENTS = ['unpaid', 'paid', 'refunded']

const STATUS_STYLE = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  packed: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
  closed: 'bg-earth-200 text-earth-700',
}
const PAYMENT_STYLE = {
  unpaid: 'bg-red-50 text-red-700 border-red-200',
  paid: 'bg-green-50 text-green-700 border-green-200',
  refunded: 'bg-earth-100 text-earth-600 border-earth-200',
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'closed', label: 'Closed' },
  { key: 'unpaid', label: 'Unpaid' },
]

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const rupees = (n) => `₹${Number(n).toFixed(2)}`
const when = (iso) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function OrderCard({ order, busy, onStatus, onPayment, onClose, onReopen }) {
  const closed = order.status === 'closed'
  const cancelled = order.status === 'cancelled'
  const ship = order.shipping ?? {}
  const address = [ship.shipping_line1, ship.shipping_city, ship.shipping_pincode].filter(Boolean).join(', ')

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm ${closed ? 'bg-earth-50 border-earth-200' : 'bg-white border-earth-100'}`}
      aria-label={`Order ${order.order_number}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-deep-green">{order.order_number}</p>
          <p className="text-xs text-earth-500">{when(order.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[order.status] ?? 'bg-earth-100'}`}>
            {cap(order.status)}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${PAYMENT_STYLE[order.payment_status] ?? ''}`}>
            {cap(order.payment_status)}
          </span>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="text-sm">
          <ul className="space-y-0.5">
            {order.items.map((i, idx) => (
              <li key={idx} className="flex justify-between gap-3">
                <span>{i.name} × {i.qty}</span>
                <span className="text-earth-600">{rupees(i.price_in_inr * i.qty)}</span>
              </li>
            ))}
          </ul>
          <p className="flex justify-between font-bold mt-2 pt-2 border-t border-earth-100">
            <span>Total</span>
            <span>{rupees(order.total_price)}</span>
          </p>
        </div>
        <div className="text-sm text-earth-600">
          <p>
            <a href={`tel:${order.phone}`} className="text-deep-green font-medium underline underline-offset-2">{order.phone}</a>
          </p>
          {ship.shipping_name && <p>{ship.shipping_name}</p>}
          <p className="text-xs">{address || 'No address given (customer shares it on WhatsApp).'}</p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-earth-100 flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-earth-600">
          Order status
          <select
            value={closed ? '' : order.status}
            disabled={closed || busy}
            onChange={(e) => onStatus(order, e.target.value)}
            className="mt-1 block min-h-[40px] px-2 border border-earth-200 rounded-xl text-sm font-normal text-deep-green bg-white disabled:bg-earth-100 disabled:text-earth-400"
          >
            {closed && <option value="">Closed</option>}
            {STATUSES.map((s) => (
              <option key={s} value={s}>{cap(s)}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-earth-600">
          Payment
          <select
            value={order.payment_status}
            disabled={closed || busy}
            onChange={(e) => onPayment(order, e.target.value)}
            className="mt-1 block min-h-[40px] px-2 border border-earth-200 rounded-xl text-sm font-normal text-deep-green bg-white disabled:bg-earth-100 disabled:text-earth-400"
          >
            {PAYMENTS.map((p) => (
              <option key={p} value={p}>{cap(p)}</option>
            ))}
          </select>
        </label>
        <div className="ml-auto">
          {closed ? (
            <button
              type="button"
              onClick={() => onReopen(order)}
              disabled={busy}
              className="min-h-[40px] px-4 border border-earth-300 rounded-xl text-sm font-semibold text-earth-700 hover:bg-white disabled:opacity-50"
            >
              Reopen order
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onClose(order)}
              disabled={busy || cancelled}
              title={cancelled ? 'A cancelled order can’t be closed' : undefined}
              className="min-h-[40px] px-4 bg-deep-green text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40"
            >
              Close order
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export default function AdminOrdersPage() {
  const { activeSite, site } = useAdminSite()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [filter, setFilter] = useState('open')
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setOrders((await api.adminOrders()) ?? [])
    } catch (err) {
      setError(err.message ?? 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [])

  // Reload when the store tab changes (same switcher as Inventory).
  useEffect(() => {
    setNotice('')
    load()
  }, [activeSite, load])

  // Apply the server's answer to the row, so the page shows what is really saved.
  const apply = (res) =>
    setOrders((prev) =>
      prev.map((o) => (o.id === res.id ? { ...o, status: res.status, payment_status: res.payment_status } : o)),
    )

  const run = async (order, fn, done) => {
    setBusyId(order.id)
    setError('')
    setNotice('')
    try {
      apply(await fn())
      if (done) setNotice(done)
    } catch (err) {
      setError(err.message)
      await load() // another admin may have changed it: show the real state
    } finally {
      setBusyId(null)
    }
  }

  const onStatus = (order, status) => run(order, () => api.adminPatchOrder(order.id, status))
  const onPayment = (order, payment) => run(order, () => api.adminPatchOrderPayment(order.id, payment))
  const onClose = (order) => {
    if (
      order.payment_status === 'unpaid' &&
      !window.confirm(`${order.order_number} is still unpaid. Close it anyway? Closing locks the order.`)
    )
      return
    run(order, () => api.adminPatchOrder(order.id, 'closed'), `${order.order_number} closed.`)
  }
  const onReopen = (order) =>
    run(order, () => api.adminPatchOrder(order.id, 'confirmed'), `${order.order_number} reopened as Confirmed.`)

  const counts = useMemo(
    () => ({
      all: orders.length,
      open: orders.filter((o) => o.status !== 'closed' && o.status !== 'cancelled').length,
      closed: orders.filter((o) => o.status === 'closed').length,
      unpaid: orders.filter((o) => o.payment_status === 'unpaid' && o.status !== 'cancelled').length,
    }),
    [orders],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return orders.filter((o) => {
      if (filter === 'open' && (o.status === 'closed' || o.status === 'cancelled')) return false
      if (filter === 'closed' && o.status !== 'closed') return false
      if (filter === 'unpaid' && (o.payment_status !== 'unpaid' || o.status === 'cancelled')) return false
      if (!q) return true
      return (
        o.order_number.toLowerCase().includes(q) ||
        (o.phone ?? '').includes(q) ||
        (o.shipping?.shipping_name ?? '').toLowerCase().includes(q)
      )
    })
  }, [orders, filter, query])

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-deep-green">{site.name} — Orders</h1>
          <p className="text-earth-500 text-sm mt-1">
            {loading ? 'Loading…' : `${counts.all} order${counts.all !== 1 ? 's' : ''} · ${counts.open} open`}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="min-h-[40px] px-4 border border-earth-200 rounded-xl text-sm font-semibold text-deep-green hover:bg-earth-50 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={`min-h-[36px] px-3 rounded-full text-sm font-semibold border transition-colors ${
              filter === f.key
                ? 'bg-deep-green text-white border-deep-green'
                : 'bg-white text-earth-600 border-earth-200 hover:border-saffron-300'
            }`}
          >
            {f.label} <span className="opacity-70">{counts[f.key]}</span>
          </button>
        ))}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search order no., phone or name"
          className="ml-auto w-full sm:w-64 min-h-[40px] px-3 border border-earth-200 rounded-xl text-sm text-deep-green focus:outline-none focus:ring-2 focus:ring-saffron-300"
        />
      </div>

      {notice && (
        <p className="mb-4 text-sm text-green-800 bg-green-50 border border-green-100 rounded-xl px-3 py-2">{notice}</p>
      )}
      {error && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      {loading ? (
        <p className="text-center py-16 text-earth-400 text-sm">Loading orders…</p>
      ) : visible.length === 0 ? (
        <p className="text-center py-16 text-earth-400 text-sm">
          {orders.length === 0 ? 'No orders yet for this store.' : 'No orders match this filter.'}
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              busy={busyId === o.id}
              onStatus={onStatus}
              onPayment={onPayment}
              onClose={onClose}
              onReopen={onReopen}
            />
          ))}
        </div>
      )}
    </div>
  )
}
