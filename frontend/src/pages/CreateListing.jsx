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
    description: '',
    status: 'published',
    imageUrl: '',
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
    return Boolean(user?.id && form.title.trim() && form.categoryId)
  }, [user, form])

  const onChange = (key) => (e) => {
    setError(null)
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
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
        status: form.status,
        published_at: form.status === 'published' ? new Date().toISOString() : null,
      }

      const createdPost = await createPost(payload)
      const createdPostData = createdPost?.data ?? createdPost

      if (form.imageUrl.trim()) {
        await createPostImage({
          post_id: createdPostData.id,
          url: form.imageUrl.trim(),
        })
      }

      setSuccess('Publicación creada correctamente')
      setTimeout(() => navigate('/marketplace'), 800)
    } catch (err) {
      setError(err.message || 'No se pudo crear la publicación')
    } finally {
      setLoading(false)
    }
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
          <div className="card__header">
            <h2 className="card__title">Nueva publicación</h2>
            <p className="card__subtitle">Este formulario usa el endpoint real POST /posts.</p>
          </div>

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
              <label htmlFor="listing-title">Título</label>
              <input
                id="listing-title"
                className="input"
                value={form.title}
                onChange={onChange('title')}
                placeholder="Ej: Servicio de diseño"
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="listing-category">Categoría</label>
              <select
                id="listing-category"
                className="input"
                value={form.categoryId}
                onChange={onChange('categoryId')}
                required
              >
                <option value="">Selecciona categoría</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label htmlFor="listing-status">Estado</label>
              <select id="listing-status" className="input" value={form.status} onChange={onChange('status')}>
                <option value="published">Publicado</option>
                <option value="draft">Borrador</option>
              </select>
            </div>

            <div className="input-group">
              <label htmlFor="listing-description">Descripción</label>
              <textarea
                id="listing-description"
                className="textarea"
                rows={4}
                value={form.description}
                onChange={onChange('description')}
                placeholder="Describe tu producto o servicio"
              />
            </div>

            <div className="input-group">
              <label htmlFor="listing-image">URL de imagen</label>
              <input
                id="listing-image"
                className="input"
                type="url"
                value={form.imageUrl}
                onChange={onChange('imageUrl')}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
            </div>

            <button type="submit" className="btn btn--green btn--block" disabled={!canSubmit || loading}>
              {loading ? 'Publicando...' : 'Publicar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
