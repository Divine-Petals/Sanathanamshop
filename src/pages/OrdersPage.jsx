import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const PAYMENT_STATUSES = ['unpaid', 'paid', 'cod', 'refunded']

const STATUS_STYLES = {
  unpaid:   'bg-red-100 text-red-700',
  paid:     'bg-green-100 text-green-700',
  cod:      'bg-blue-100 text-blue-700',
  refunded: 'bg-earth-100 text-earth-600',
}

export default function OrdersPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    setOrders(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const updateLocal = (id, key, value) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, [key]: value } : o)))
  }

  const saveOrder = async (order) => {
    setSaving((p) => ({ ...p, [order.id]: true }))
    await supabase
      .from('orders')
      .update({
        customer_name: order.customer_name ?? null,
        phone_number: order.phone_number ?? null,
        payment_status: order.payment_status ?? 'unpaid',
      })
      .eq('id', order.id)
    setSaving((p) => ({ ...p, [order.id]: false }))
    setSaved((p) => ({ ...p, [order.id]: true }))
    setTimeout(() => setSaved((p) => ({ ...p, [order.id]: false })), 2000)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-deep-green">Orders</h1>
          <p className="text-earth-500 text-sm mt-1">
            {orders.length} order{orders.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchOrders}
            className="min-h-[44px] border border-earth-200 text-earth-600 hover:bg-earth-50 font-semibold px-4 rounded-xl text-sm transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={() => { logout(); navigate('/admin/login') }}
            className="min-h-[44px] border border-earth-200 text-earth-600 hover:bg-earth-50 font-semibold px-4 rounded-xl text-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Admin tabs */}
      <div className="flex gap-1 mb-6 bg-earth-100 rounded-xl p-1 w-fit">
        <Link
          to="/admin/inventory"
          className="px-4 py-2 rounded-lg text-sm font-medium text-earth-600 hover:bg-white transition-colors"
        >
          Inventory
        </Link>
        <Link
          to="/admin/orders"
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-white text-deep-green shadow-sm"
        >
          Orders
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-20 text-earth-400 text-sm">Loading orders…</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-earth-400 text-sm">
          <span className="text-5xl block mb-3">📦</span>
          No orders yet. They will appear here once customers place orders.
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-earth-100 shadow-sm p-5"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="font-mono text-xs font-bold text-saffron-600 tracking-wider">
                      {order.order_number}
                    </p>
                    <p className="text-xs text-earth-400 mt-0.5">
                      {new Date(order.created_at).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                  <p className="font-bold text-deep-green text-lg">₹{Number(order.total_price).toFixed(2)}</p>
                </div>

                {/* Items */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {(order.items ?? []).map((item, i) => (
                    <span
                      key={i}
                      className="bg-earth-50 text-earth-700 text-xs px-2.5 py-1 rounded-full border border-earth-100"
                    >
                      {item.name} ×{item.qty}
                    </span>
                  ))}
                </div>

                {/* Editable fields */}
                <div className="grid grid-cols-3 gap-3 items-end">
                  {/* Customer name */}
                  <div>
                    <label className="block text-xs font-semibold text-earth-600 mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={order.customer_name ?? ''}
                      onChange={(e) => updateLocal(order.id, 'customer_name', e.target.value)}
                      placeholder="Enter name…"
                      className="w-full min-h-[40px] px-3 py-2 border border-earth-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-saffron-300 text-deep-green"
                    />
                  </div>


                  {/* Payment status + Save */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-earth-600 mb-1">
                        Payment
                      </label>
                      <select
                        value={order.payment_status ?? 'unpaid'}
                        onChange={(e) => updateLocal(order.id, 'payment_status', e.target.value)}
                        className="w-full min-h-[40px] px-3 py-2 border border-earth-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-saffron-300 text-deep-green bg-white capitalize"
                      >
                        {PAYMENT_STATUSES.map((s) => (
                          <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => saveOrder(order)}
                      disabled={saving[order.id]}
                      className="min-h-[40px] px-5 bg-deep-green hover:bg-earth-800 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors whitespace-nowrap"
                    >
                      {saving[order.id] ? 'Saving…' : saved[order.id] ? '✓ Saved' : 'Save'}
                    </button>
                  </div>
                </div>

                {/* Payment badge */}
                <div className="mt-3">
                  <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize ${STATUS_STYLES[order.payment_status ?? 'unpaid']}`}>
                    {order.payment_status ?? 'unpaid'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-earth-100 shadow-sm p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-mono text-xs font-bold text-saffron-600">{order.order_number}</p>
                    <p className="text-[10px] text-earth-400 mt-0.5">
                      {new Date(order.created_at).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-deep-green">₹{Number(order.total_price).toFixed(2)}</p>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[order.payment_status ?? 'unpaid']}`}>
                      {order.payment_status ?? 'unpaid'}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {(order.items ?? []).map((item, i) => (
                    <span key={i} className="bg-earth-50 text-earth-700 text-[10px] px-2 py-0.5 rounded-full border border-earth-100">
                      {item.name} ×{item.qty}
                    </span>
                  ))}
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={order.customer_name ?? ''}
                    onChange={(e) => updateLocal(order.id, 'customer_name', e.target.value)}
                    placeholder="Customer name…"
                    className="w-full min-h-[44px] px-3 py-2 border border-earth-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-saffron-300 text-deep-green"
                  />
                  <input
                    type="tel"
                    value={order.phone_number ?? ''}
                    onChange={(e) => updateLocal(order.id, 'phone_number', e.target.value)}
                    placeholder="Phone number…"
                    className="w-full min-h-[44px] px-3 py-2 border border-earth-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-saffron-300 text-deep-green"
                  />
                  <div className="flex gap-2">
                    <select
                      value={order.payment_status ?? 'unpaid'}
                      onChange={(e) => updateLocal(order.id, 'payment_status', e.target.value)}
                      className="flex-1 min-h-[44px] px-3 py-2 border border-earth-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-saffron-300 text-deep-green bg-white"
                    >
                      {PAYMENT_STATUSES.map((s) => (
                        <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => saveOrder(order)}
                      disabled={saving[order.id]}
                      className="min-h-[44px] px-5 bg-deep-green hover:bg-earth-800 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
                    >
                      {saving[order.id] ? '…' : saved[order.id] ? '✓' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
