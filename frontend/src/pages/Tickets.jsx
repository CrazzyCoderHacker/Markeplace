import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTicketDetail, getTickets, createTicket, createTicketSale } from '../api'
import { useAuth } from '../context/AuthContext'
import Loader from '../components/Loader'
import Icon from '../components/Icon'

function getStatusBadge(status) {
  if (!status) return <span className="badge badge--gray">N/A</span>
  const map = {
    available: { cls: 'badge--blue', label: 'Disponible' },
    sold: { cls: 'badge--green', label: 'Vendido' },
    pending: { cls: 'badge--yellow', label: 'Pendiente' },
    completed: { cls: 'badge--green', label: 'Completado' },
    approved: { cls: 'badge--green', label: 'Aprobado' },
    rejected: { cls: 'badge--red', label: 'Rechazado' },
  }
  const info = map[status] || { cls: 'badge--gray', label: status }
  return <span className={`badge ${info.cls}`}>{info.label}</span>
}

export default function Tickets() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [searchId, setSearchId] = useState(id || '')
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [ticketsList, setTicketsList] = useState([])

  const [ticketForm, setTicketForm] = useState({
    event_id: 1,
    owner_id: user?.id || 1,
    subject: '',
    status: 'available',
  })

  const [saleForm, setSaleForm] = useState({
    ticket_id: '',
    buyer_user_id: '',
    price: '',
    currency: 'MXN',
    status: 'pending',
  })

  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (!successMessage) return
    const timer = setTimeout(() => setSuccessMessage(''), 6000)
    return () => clearTimeout(timer)
  }, [successMessage])

  const fetchTicket = async (ticketId) => {
    if (!ticketId) return
    setLoading(true)
    setError(null)
    setTicket(null)
    try {
      const result = await getTicketDetail(ticketId)
      const parsed = result?.data !== undefined ? result.data : result
      setTicket(parsed)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      setSearchId(id)
      fetchTicket(id)
    }
  }, [id])

  useEffect(() => {
    if (!id) {
      fetchTicketsList()
    }
  }, [id, user])

  useEffect(() => {
    setTicketForm((prev) => ({
      ...prev,
      owner_id: user?.id || 1,
    }))
  }, [user])

  const fetchTicketsList = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getTickets()
      const parsed = res.data !== undefined ? res.data : res
      const list = Array.isArray(parsed) ? parsed : [parsed]
      setTicketsList(list)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchId.trim()) {
      navigate(`/boletos/${searchId.trim()}`)
    }
  }

  const handleTicketFormChange = (key) => (e) => {
    setTicketForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  const handleSaleFormChange = (key) => (e) => {
    setSaleForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  const handleCreateTicket = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage('')

    try {
      const result = await createTicket({
        event_id: Number(ticketForm.event_id),
        owner_id: Number(ticketForm.owner_id),
        subject: ticketForm.subject,
        status: ticketForm.status,
      })

      const created = result?.data ?? result

      setSuccessMessage(`Boleto creado correctamente. ID: ${created?.id ?? 'N/A'}`)

      setTicketForm({
        event_id: 1,
        owner_id: user?.id || 1,
        subject: '',
        status: 'available',
      })

      await fetchTicketsList()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err.message || 'No se pudo crear el boleto')
    }
  }

  const handleCreateSale = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage('')

    try {
      const result = await createTicketSale({
        ticket_id: Number(saleForm.ticket_id),
        buyer_user_id: Number(saleForm.buyer_user_id),
        price: Number(saleForm.price),
        currency: saleForm.currency,
        status: saleForm.status,
      })

      const created = result?.data ?? result

      setSuccessMessage(`Venta registrada correctamente. ID: ${created?.id ?? 'N/A'}`)

      setSaleForm({
        ticket_id: '',
        buyer_user_id: '',
        price: '',
        currency: 'MXN',
        status: 'pending',
      })

      await fetchTicketsList()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err.message || 'No se pudo registrar la venta')
    }
  }

  const soldCount = ticketsList.filter(t => t.status === 'sold' || t.estado_venta === 'completed').length
  const pendingCount = ticketsList.filter(t => !(t.status === 'sold' || t.estado_venta === 'completed')).length

  return (
    <div className="page" id="page-tickets">
      <div className="container">
        <header className="header fade-in" style={{ marginBottom: 12 }}>
          <div>
            <h1 className="header__title">Gestión de Boletos</h1>
            <p className="header__subtitle">Consulta, crea boletos y registra ventas</p>
          </div>
        </header>

        {successMessage && (
          <div className="alert alert--success fade-in" style={{ marginBottom: 16, border: '2px solid #16a34a' }}>
            <span><Icon name="check" className="w-4 h-4" /></span> {successMessage}
          </div>
        )}

        {error && (
          <div className="alert alert--error fade-in" id="ticket-error" style={{ marginBottom: 16 }}>
            <span><Icon name="warning" className="w-4 h-4" /></span> {error}
          </div>
        )}

        {!id && (
          <>
            <div className="card fade-in" style={{ marginBottom: 16 }}>
              <h2 className="card__title" style={{ marginBottom: 12 }}>Registrar boleto</h2>

              <form onSubmit={handleCreateTicket} className="form">
                <div className="input-group">
                  <label>Event ID</label>
                  <input className="input" type="number" value={ticketForm.event_id} onChange={handleTicketFormChange('event_id')} required />
                </div>

                <div className="input-group">
                  <label>Owner ID</label>
                  <input className="input" type="number" value={ticketForm.owner_id} onChange={handleTicketFormChange('owner_id')} required />
                </div>

                <div className="input-group">
                  <label>Folio / Subject</label>
                  <input className="input" value={ticketForm.subject} onChange={handleTicketFormChange('subject')} required />
                </div>

                <div className="input-group">
                  <label>Estado</label>
                  <select className="input" value={ticketForm.status} onChange={handleTicketFormChange('status')}>
                    <option value="available">Disponible</option>
                    <option value="sold">Vendido</option>
                  </select>
                </div>

                <button type="submit" className="btn btn--green btn--block">Crear boleto</button>
              </form>
            </div>

            <div className="card fade-in" style={{ marginBottom: 16 }}>
              <h2 className="card__title" style={{ marginBottom: 12 }}>Registrar venta</h2>

              <form onSubmit={handleCreateSale} className="form">
                <div className="input-group">
                  <label>Ticket ID</label>
                  <input className="input" type="number" value={saleForm.ticket_id} onChange={handleSaleFormChange('ticket_id')} required />
                </div>

                <div className="input-group">
                  <label>Buyer User ID</label>
                  <input className="input" type="number" value={saleForm.buyer_user_id} onChange={handleSaleFormChange('buyer_user_id')} required />
                </div>

                <div className="input-group">
                  <label>Precio</label>
                  <input className="input" type="number" value={saleForm.price} onChange={handleSaleFormChange('price')} required />
                </div>

                <div className="input-group">
                  <label>Moneda</label>
                  <input className="input" value={saleForm.currency} onChange={handleSaleFormChange('currency')} />
                </div>

                <div className="input-group">
                  <label>Estado venta</label>
                  <select className="input" value={saleForm.status} onChange={handleSaleFormChange('status')}>
                    <option value="pending">Pendiente</option>
                    <option value="completed">Completada</option>
                  </select>
                </div>

                <button type="submit" className="btn btn--orange btn--block">Registrar venta</button>
              </form>
            </div>
          </>
        )}

        <form className="search-bar fade-in" onSubmit={handleSearch} id="ticket-search-form">
          <input
            type="number"
            className="input"
            placeholder="ID del boleto (ej: 2)"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            min="1"
            id="ticket-search-input"
          />
          <button type="submit" className="btn btn--orange" id="ticket-search-btn">
            Buscar
          </button>
        </form>

        {loading && <Loader text="Cargando..." />}

        {ticket && !loading && (
          <div className="slide-up">
            <div className={`status-banner ${
              ticket.estado_venta === 'completed' ? 'status-banner--success' : 'status-banner--warning'
            }`}>
              <div className="status-banner__icon">
                {ticket.estado_venta === 'completed' ? <Icon name="dollar" className="w-4 h-4" /> : <Icon name="clock" className="w-4 h-4" />}
              </div>
              <div className="status-banner__text">
                <strong>{ticket.estado_venta === 'completed' ? 'Pago recibido' : 'Pago pendiente'}</strong>
                <span>{ticket.estado_venta === 'completed'
                  ? 'El boleto está confirmado y activo'
                  : 'Esperando confirmación de pago'}</span>
              </div>
            </div>

            <div className="card" id="ticket-detail-card" style={{ textAlign: 'center' }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: 4 }}>
                {ticket.folio || `Boleto #${ticket.ticket_id}`}
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                ID: {ticket.ticket_id}
              </p>

              <div style={{
                width: 120, height: 120, margin: '0 auto 16px',
                background: 'linear-gradient(135deg, #FF5722, #f4511e)',
                borderRadius: 'var(--radius-lg)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                boxShadow: 'var(--shadow-lg)'
              }}>
                <Icon name="ticket" className="w-12 h-12 text-white" />
              </div>

              <div style={{
                background: '#f3f4f6', padding: '8px 16px',
                borderRadius: 'var(--radius-md)', display: 'inline-block',
                fontFamily: 'monospace', fontSize: '0.875rem'
              }}>
                Folio: {ticket.folio || 'N/A'}
              </div>
            </div>

            <div className="card">
              <h2 className="card__title" style={{ marginBottom: 16 }}>Información del Comprador</h2>
              <div className="icon-row">
                <div className="icon-row__icon icon-row__icon--orange"><Icon name="user" className="w-5 h-5" /></div>
                <div className="icon-row__text">
                  <strong>{ticket.nombre_comprador || 'Sin comprador asignado'}</strong>
                  <span>{ticket.nombre_comprador ? 'Comprador verificado' : 'Boleto sin vender'}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="card__title" style={{ marginBottom: 16 }}>Detalles de la Venta</h2>

              <div className="info-row">
                <span className="info-row__label">Estado del boleto</span>
                <span className="info-row__value">{getStatusBadge(ticket.estado_boleto)}</span>
              </div>
              <div className="info-row">
                <span className="info-row__label">Estado de venta</span>
                <span className="info-row__value">{getStatusBadge(ticket.estado_venta)}</span>
              </div>
              <div className="info-row">
                <span className="info-row__label">Evidencia de pago</span>
                <span className="info-row__value">
                  {ticket.evidencia_pago_url ? (
                    <a href={ticket.evidencia_pago_url} target="_blank" rel="noopener noreferrer"
                       style={{ color: 'var(--color-primary)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Icon name="paperclip" className="w-4 h-4" /> Ver comprobante
                    </a>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)' }}>Sin evidencia</span>
                  )}
                </span>
              </div>
              <div className="info-row">
                <span className="info-row__label">Estado evidencia</span>
                <span className="info-row__value">{getStatusBadge(ticket.estado_evidencia)}</span>
              </div>
            </div>
          </div>
        )}

        {!id && !loading && !error && (
          <div>
            <div className="tickets-stats-grid mb-4">
              <div className="ticket-list-card">
                <div className="ticket-list-stat-head">
                  <div className="ticket-list-stat-icon ticket-list-stat-icon--green"><Icon name="ticket" className="w-4 h-4" /></div>
                  <span className="ticket-list-stat-label">Vendidos</span>
                </div>
                <p className="ticket-list-stat-value">{soldCount}/{ticketsList.length}</p>
              </div>

              <div className="ticket-list-card">
                <div className="ticket-list-stat-head">
                  <div className="ticket-list-stat-icon ticket-list-stat-icon--yellow"><Icon name="warning" className="w-4 h-4" /></div>
                  <span className="ticket-list-stat-label">Pendientes</span>
                </div>
                <p className="ticket-list-stat-value">{pendingCount}</p>
              </div>
            </div>

            {ticketsList.length === 0 ? (
              <div className="empty-state fade-in">
                <span className="empty-state__icon"><Icon name="ticket" className="w-10 h-10" /></span>
                <p>No se encontraron boletos asignados.</p>
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                <h3 className="font-semibold text-gray-700">Boletos</h3>
                {ticketsList.map(t => (
                  <div key={t.id || t.ticket_id} onClick={() => navigate(`/boletos/${t.id || t.ticket_id}`)} className="ticket-list-card cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{t.subject || t.folio || `Boleto ${t.id}`}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.status === 'sold' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {t.status === 'sold' ? 'Vendido' : 'Disponible'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          Event ID: {t.event_id ?? '-'}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">ID {t.id || t.ticket_id}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4">
              <button onClick={() => navigate('/marketplace/publicar')} className="btn btn--green btn--block">
                Publicar en Marketplace
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
