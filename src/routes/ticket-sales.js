const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM ticket_sale ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener ventas:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM ticket_sale WHERE id = $1', [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error al obtener venta:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { ticket_id, buyer_user_id, price, currency, status } = req.body;

    if (!ticket_id || !buyer_user_id || price === undefined || price === null || price === '') {
      return res.status(400).json({
        message: 'Faltan campos obligatorios: ticket_id, buyer_user_id y price'
      });
    }

    const numericPrice = Number(price);

    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({
        message: 'El precio debe ser un número válido mayor a 0'
      });
    }

    const ticketResult = await db.query(
      'SELECT id, status FROM lottery_ticket WHERE id = $1',
      [Number(ticket_id)]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ message: 'Boleto no encontrado' });
    }

    const ticket = ticketResult.rows[0];

    if (ticket.status === 'sold') {
      return res.status(409).json({ message: 'Este boleto ya está vendido' });
    }

    const saleResult = await db.query(
      `INSERT INTO ticket_sale (ticket_id, buyer_user_id, price, currency, status)
       VALUES ($1, $2, $3, COALESCE($4, 'MXN'), COALESCE($5, 'completed'))
       RETURNING *`,
      [
        Number(ticket_id),
        Number(buyer_user_id),
        numericPrice,
        currency || 'MXN',
        status || 'completed'
      ]
    );

    const ticketUpdateResult = await db.query(
      `UPDATE lottery_ticket
       SET status = 'sold',
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, event_id, user_id AS owner_id, subject, status, created_at, updated_at`,
      [Number(ticket_id)]
    );

    res.status(201).json({
      message: 'Venta registrada y boleto marcado como vendido',
      data: saleResult.rows[0],
      ticket: ticketUpdateResult.rows[0]
    });
  } catch (err) {
    console.error('Error al registrar venta:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { ticket_id, buyer_user_id, price, currency, status } = req.body;

    const { rows } = await db.query(
      `UPDATE ticket_sale
       SET ticket_id = COALESCE($1, ticket_id),
           buyer_user_id = COALESCE($2, buyer_user_id),
           price = COALESCE($3, price),
           currency = COALESCE($4, currency),
           status = COALESCE($5, status),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [ticket_id, buyer_user_id, price, currency, status, req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    res.json({ message: `Venta ${req.params.id} actualizada`, data: rows[0] });
  } catch (err) {
    console.error('Error al actualizar venta:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM ticket_sale WHERE id = $1', [req.params.id]);

    if (rowCount === 0) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    res.json({ message: `Venta ${req.params.id} eliminada` });
  } catch (err) {
    console.error('Error al eliminar venta:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
