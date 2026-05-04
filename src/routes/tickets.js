const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET detalle individual de boleto
router.get('/:id', async (req, res) => {
  try {
    const ticketId = req.params.id;

    const query = `
      SELECT
        lt.id AS ticket_id,
        lt.subject AS folio,
        lt.status AS estado_boleto,
        ts.status AS estado_venta,
        p.first_name || ' ' || p.last_name AS nombre_comprador,
        tpe.file_url AS evidencia_pago_url,
        tpe.status AS estado_evidencia
      FROM lottery_ticket lt
      LEFT JOIN ticket_sale ts ON lt.id = ts.ticket_id
      LEFT JOIN profile p ON ts.buyer_user_id = p.user_id
      LEFT JOIN ticket_payment_evidence tpe ON ts.id = tpe.ticket_sale_id
      WHERE lt.id = $1;
    `;

    const result = await db.query(query, [ticketId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Boleto no encontrado" });
    }

    res.json({
      message: "Detalle de boleto obtenido correctamente",
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Error al consultar el boleto:", error);
    res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
});

// GET lista real de boletos
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        id,
        event_id,
        user_id AS owner_id,
        (status = 'sold') AS is_sold,
        0 AS price,
        subject,
        status,
        created_at,
        updated_at
      FROM lottery_ticket
      ORDER BY id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST crear boleto real
router.post('/', async (req, res) => {
  try {
    const { event_id, owner_id, subject, status } = req.body;

    const { rows } = await db.query(
      `INSERT INTO lottery_ticket (event_id, user_id, subject, status)
       VALUES ($1, $2, $3, COALESCE($4, 'available'))
       RETURNING id, event_id, user_id AS owner_id, subject, status, created_at, updated_at`,
      [event_id, owner_id, subject, status]
    );

    res.status(201).json({
      message: 'Ticket asignado',
      data: {
        ...rows[0],
        price: 0,
        is_sold: false
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT actualizar boleto
router.put('/:id', async (req, res) => {
  try {
    const { event_id, owner_id, subject, status } = req.body;

    const { rows } = await db.query(
      `UPDATE lottery_ticket
       SET event_id = COALESCE($1, event_id),
           user_id = COALESCE($2, user_id),
           subject = COALESCE($3, subject),
           status = COALESCE($4, status),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, event_id, user_id AS owner_id, subject, status, updated_at`,
      [event_id, owner_id, subject, status, req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Ticket no encontrado' });
    }

    res.json({
      message: `Ticket ${req.params.id} actualizado`,
      data: {
        ...rows[0],
        price: 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE borrar boleto
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM lottery_ticket WHERE id = $1', [req.params.id]);
    if (rowCount === 0) {
      return res.status(404).json({ message: 'Ticket no encontrado' });
    }
    res.json({ message: `Ticket ${req.params.id} eliminado` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
