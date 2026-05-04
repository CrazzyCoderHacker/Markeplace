const express = require('express');
const router = express.Router();
const db = require('../config/db');

const postSelectFields = `
  p.id,
  p.category_id,
  p.author_user_id,
  p.title,
  p.slug,
  p.content,
  p.status,
  p.published_at,
  p.created_at,
  p.updated_at,
  p.price,
  p.includes_ticket,
  COALESCE(
    json_agg(
      json_build_object(
        'id', pi.id,
        'post_id', pi.post_id,
        'url', pi.url,
        'alt_text', pi.alt_text,
        'sort_order', pi.sort_order
      )
      ORDER BY pi.sort_order, pi.id
    ) FILTER (WHERE pi.id IS NOT NULL),
    '[]'::json
  ) AS images
`;

const postGroupFields = `
  p.id,
  p.category_id,
  p.author_user_id,
  p.title,
  p.slug,
  p.content,
  p.status,
  p.published_at,
  p.created_at,
  p.updated_at,
  p.price,
  p.includes_ticket
`;

function normalizePrice(price) {
  if (price === undefined || price === null || price === '') {
    return null;
  }

  const numericPrice = Number(price);

  if (Number.isNaN(numericPrice) || numericPrice < 0) {
    return NaN;
  }

  return numericPrice;
}

function normalizeBoolean(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT ${postSelectFields}
      FROM post p
      LEFT JOIN post_image pi ON pi.post_id = p.id
      GROUP BY ${postGroupFields}
      ORDER BY p.id;
    `);

    res.json(rows);
  } catch (err) {
    console.error('Error al obtener posts:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT ${postSelectFields}
      FROM post p
      LEFT JOIN post_image pi ON pi.post_id = p.id
      WHERE p.id = $1
      GROUP BY ${postGroupFields}
      ORDER BY p.id;
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Post no encontrado' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error al obtener post:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      category_id,
      author_user_id,
      title,
      slug,
      content,
      status,
      published_at,
      price,
      includes_ticket
    } = req.body;

    if (!category_id || !author_user_id || !title || !slug) {
      return res.status(400).json({
        message: 'Faltan campos obligatorios: category_id, author_user_id, title y slug'
      });
    }

    const normalizedPrice = normalizePrice(price);

    if (Number.isNaN(normalizedPrice)) {
      return res.status(400).json({
        message: 'El precio debe ser un número válido mayor o igual a 0'
      });
    }

    const { rows } = await db.query(
      `INSERT INTO post (
        category_id,
        author_user_id,
        title,
        slug,
        content,
        status,
        published_at,
        price,
        includes_ticket
      )
      VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'draft'), $7, $8, $9)
      RETURNING *`,
      [
        Number(category_id),
        Number(author_user_id),
        title.trim(),
        slug.trim(),
        content || null,
        status || 'draft',
        published_at || null,
        normalizedPrice,
        normalizeBoolean(includes_ticket)
      ]
    );

    res.status(201).json({
      message: 'Post creado',
      data: {
        ...rows[0],
        images: []
      }
    });
  } catch (err) {
    console.error('Error al crear post:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      category_id,
      title,
      slug,
      content,
      status,
      published_at,
      price,
      includes_ticket
    } = req.body;

    const normalizedPrice = normalizePrice(price);

    if (Number.isNaN(normalizedPrice)) {
      return res.status(400).json({
        message: 'El precio debe ser un número válido mayor o igual a 0'
      });
    }

    const normalizedIncludesTicket =
      includes_ticket === undefined || includes_ticket === null
        ? null
        : normalizeBoolean(includes_ticket);

    const { rows } = await db.query(
      `UPDATE post
       SET category_id = COALESCE($1, category_id),
           title = COALESCE($2, title),
           slug = COALESCE($3, slug),
           content = COALESCE($4, content),
           status = COALESCE($5, status),
           published_at = COALESCE($6, published_at),
           price = COALESCE($7, price),
           includes_ticket = COALESCE($8, includes_ticket),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        category_id ? Number(category_id) : null,
        title ? title.trim() : null,
        slug ? slug.trim() : null,
        content,
        status,
        published_at,
        normalizedPrice,
        normalizedIncludesTicket,
        req.params.id
      ]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Post no encontrado' });
    }

    res.json({
      message: `Post ${req.params.id} actualizado`,
      data: {
        ...rows[0],
        images: []
      }
    });
  } catch (err) {
    console.error('Error al actualizar post:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM post WHERE id = $1', [req.params.id]);

    if (rowCount === 0) {
      return res.status(404).json({ message: 'Post no encontrado' });
    }

    res.json({ message: `Post ${req.params.id} eliminado` });
  } catch (err) {
    console.error('Error al eliminar post:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
