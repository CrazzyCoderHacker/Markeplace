import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPost, createPostImage, getCategories } from '../api'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function CreateListing() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [form, setForm] = useState({
    title: '',
    categoryId: '',
    price: '',
    description: '',
    status: 'published',
    imageUrl: '',
    includesTicket: false,
  })

  useEffect(() => {
    let alive = true
    getCategories()
      .then((res) => {
        if (!alive) return
        const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : [])
        setCategories(list)
      })
      .catch((err) => {
        if (!alive) return
        setError(err.message || 'No se pudieron cargar las categorías')
      })
    return () => { alive = false }
  }, [])

  const canSubmit = useMemo(() => {
    return Boolean(
      user?.id &&
      form.title.trim() &&
      form.categoryId &&
      form.description.trim()
    )
  }, [user, form])

  const onChange = (key) => (e) => {
    setError(null)
    const value = key === 'includesTicket' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const submitWithStatus = async (nextStatus) => {
    if (!canSubmit) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const now = Date.now()
      const slugBase = slugify(form.title) || 'publicacion'

      const payload = {
        category_id: Number(form.categoryId),
        author_user_id: Number(user.id),
        title: form.title.trim(),
        slug: `${slugBase}-${now}`,
        content: form.description.trim() || null,
        status: nextStatus,
        published_at: nextStatus === 'published' ? new Date().toISOString() : null,
        price: form.price !== '' ? Number(form.price) : null,
        includes_ticket: Boolean(form.includesTicket),
      }

      const createdPost = await createPost(payload)
      const createdPostData = createdPost?.data ?? createdPost

      if (form.imageUrl.trim()) {
        await createPostImage({
          post_id: createdPostData.id,
          url: form.imageUrl.trim(),
        })
      }

      setSuccess(nextStatus === 'draft'
        ? 'Borrador guardado correctamente'
        : 'Publicación creada correctamente')

      setTimeout(() => navigate('/marketplace'), 1000)
    } catch (err) {
      setError(err.message || 'No se pudo crear la publicación')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await submitWithStatus('published')
  }

  const handleSaveDraft = async () => {
    await submitWithStatus('draft')
  }

  return (
    <div className="page" id="page-create-listing">
      <div className="container">
        <header className="header fade-in" style={{ marginBottom: 12, justifyContent: 'space-between' }}>
          <button className="header__back" onClick={() => navigate('/marketplace')} aria-label="Volver">
            <Icon name="chevron-left" className="w-5 h-5" />
          </button>
          <h1 className="header__title">Publicar en Marketplace</h1>
          <div style={{ width: 40 }} />
        </header>

        <div className="card fade-in">
          {error && (
            <div className="alert alert--error">
              <span><Icon name="warning" className="w-4 h-4" /></span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert--success">
              <span><Icon name="check" className="w-4 h-4" /></span>
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="form">
            <div className="input-group">
              <label htmlFor="listing-image">Imagen (URL por ahora)</label>
              <input
                id="listing-image"
                className="input"
                type="url"
                value={form.imageUrl}
                onChange={onChange('imageUrl')}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
            </div>

            <div className="input-group">
              <label htmlFor="listing-title">Título *</label>
              <input
                id="listing-title"
                className="input"
                value={form.title}
                onChange={onChange('title')}
                placeholder="Ej: iPhone 13 Pro Max 128GB"
                maxLength={100}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="listing-category">Categoría *</label>
              <select
                id="listing-category"
                className="input"
                value={form.categoryId}
                onChange={onChange('categoryId')}
                required
              >
                <option value="">Selecciona una categoría</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label htmlFor="listing-price">Precio (MXN)</label>
              <input
                id="listing-price"
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={onChange('price')}
                placeholder="0.00"
              />
            </div>

            <div className="input-group">
              <label htmlFor="listing-description">Descripción *</label>
              <textarea
                id="listing-description"
                className="textarea"
                rows={5}
                value={form.description}
                onChange={onChange('description')}
                placeholder="Describe tu producto o servicio con detalle..."
                required
              />
            </div>

            <div className="card card--bordered" style={{ padding: 16, marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.includesTicket}
                  onChange={onChange('includesTicket')}
                  style={{ marginTop: 4 }}
                />
                <div>
                  <strong>Incluye boleto del sorteo UDLAP</strong>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>
                    Marca esta opción si tu publicación incluye un boleto del sorteo institucional
                  </p>
                </div>
              </label>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <button type="submit" className="btn btn--green btn--block" disabled={!canSubmit || loading}>
                {loading ? 'Publicando...' : 'Publicar'}
              </button>

              <button
                type="button"
                className="btn btn--gray btn--block"
                onClick={handleSaveDraft}
                disabled={!canSubmit || loading}
              >
                Guardar borrador
              </button>

              <button
                type="button"
                className="btn btn--outline btn--block"
                onClick={() => navigate('/marketplace')}
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
