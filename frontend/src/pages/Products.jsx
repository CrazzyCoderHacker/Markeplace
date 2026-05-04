import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPostDetail } from '../api'
import Loader from '../components/Loader'
import Icon from '../components/Icon'

export default function Products() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchId, setSearchId] = useState(id || '')
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchProduct = async (productId) => {
    if (!productId) return
    setLoading(true)
    setError(null)
    setProduct(null)

    try {
      const result = await getPostDetail(productId)
      const parsed = result?.data !== undefined ? result.data : result
      setProduct(parsed)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      setSearchId(id)
      fetchProduct(id)
    }
  }, [id])

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchId.trim()) {
      navigate(`/productos/${searchId.trim()}`)
    }
  }

  const getStatusBadge = (status) => {
    const map = {
      available: { cls: 'badge--green', text: 'Disponible' },
      sold: { cls: 'badge--red', text: 'Vendido' },
      reserved: { cls: 'badge--yellow', text: 'Reservado' },
      draft: { cls: 'badge--gray', text: 'Borrador' },
      published: { cls: 'badge--green', text: 'Publicado' },
    }
    const info = map[status] || { cls: 'badge--gray', text: status || 'N/A' }
    return <span className={`badge ${info.cls}`}>{info.text}</span>
  }

  const renderPrice = () => {
    const rawPrice = product?.price ?? product?.amount
    if (rawPrice === undefined || rawPrice === null || rawPrice === '') {
      return 'Sin precio'
    }
    const numeric = Number(rawPrice)
    return Number.isNaN(numeric) ? `${rawPrice} MXN` : `$${numeric.toLocaleString('es-MX')} MXN`
  }

  return (
    <div className="page" id="page-products">
      <div className="container">
        <div className="page-header fade-in">
          <h1 className="page-header__title">Detalles del Producto</h1>
          <p className="page-header__subtitle">
            Busca un producto por su ID para ver información completa
          </p>
        </div>

        <form className="search-bar fade-in" onSubmit={handleSearch} id="product-search-form">
          <input
            type="number"
            className="input"
            placeholder="ID del producto (ej: 1)"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            min="1"
            id="product-search-input"
          />
          <button type="submit" className="btn btn--orange" id="product-search-btn">
            Buscar
          </button>
        </form>

        {loading && <Loader text="Cargando producto..." />}

        {error && (
          <div className="alert alert--error fade-in" id="product-error">
            <span><Icon name="warning" className="w-4 h-4" /></span> {error}
          </div>
        )}

        {product && !loading && (
          <div className="slide-up" id="product-detail">
            <div className="product-detail__image-wrapper" style={{ marginBottom: 16 }}>
              {product.images && product.images.length > 0 ? (
                <img src={product.images[0].url} alt={product.title} />
              ) : (
                <Icon name="box" className="w-12 h-12 text-gray-300" />
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span className="badge badge--orange">Categoría #{product.category_id}</span>
              {product.includes_ticket && (
                <span className="badge badge--green"><Icon name="ticket" className="w-3 h-3" /> Incluye boleto</span>
              )}
              {getStatusBadge(product.status)}
            </div>

            <h2 className="product-detail__title">{product.title}</h2>
            <p className="product-detail__price">{renderPrice()}</p>

            {product.includes_ticket && (
              <div className="status-banner status-banner--success" style={{ marginTop: 16 }}>
                <div className="status-banner__icon"><Icon name="ticket" className="w-4 h-4" /></div>
                <div className="status-banner__text">
                  <strong style={{ color: 'var(--color-green-text)' }}>Incluye 1 boleto del Sorteo UDLAP</strong>
                  <span>Este producto incluye un boleto oficial del sorteo institucional</span>
                </div>
              </div>
            )}

            <div className="card" style={{ marginTop: 16, padding: 16 }}>
              <button className="btn btn--green btn--block btn--lg" id="product-buy-btn">
                <Icon name="bag" className="w-4 h-4" /> Comprar ahora
              </button>
            </div>

            <div className="card">
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 8 }}>Vendido por:</p>
              <div className="icon-row" style={{ padding: 0 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: '#e5e7eb', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0
                }}>
                  <Icon name="user" />
                </div>
                <div className="icon-row__text">
                  <strong>Vendedor #{product.seller_id || product.author_user_id || 'N/A'}</strong>
                  <span>Miembro de la comunidad UDLAP</span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="info-row">
                <span className="info-row__label">ID del producto</span>
                <span className="info-row__value">{product.id}</span>
              </div>
              <div className="info-row">
                <span className="info-row__label">Categoría</span>
                <span className="info-row__value">#{product.category_id}</span>
              </div>
              {product.images && product.images.length > 0 && (
                <div className="info-row">
                  <span className="info-row__label">Imágenes</span>
                  <span className="info-row__value">{product.images.length} imagen(es)</span>
                </div>
              )}
            </div>

            <div className="card">
              <h3 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: 12 }}>Descripción</h3>
              <p className="product-detail__description">
                {product.description || product.content || 'Sin descripción disponible.'}
              </p>
            </div>
          </div>
        )}

        {!loading && !error && !product && !id && (
          <div className="empty-state fade-in">
            <span className="empty-state__icon"><Icon name="search" /></span>
            <p>Ingresa un ID de producto para consultar su detalle</p>
          </div>
        )}
      </div>
    </div>
  )
}
