import {
  createOrder,
  editOrder,
  getOrders,
  removeOrder,
} from './order.service.js';
import { generateQuotePdf } from './quote.service.js';

export async function generateQuote(req, res, next) {
  try {
    const result = await generateQuotePdf(req.params.orderno);
    return res.json({ ok: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function listOrderItems(req, res, next) {
  try {
    const items = await getOrders();
    return res.json({ ok: true, data: items });
  } catch (error) {
    return next(error);
  }
}

export async function createOrderItem(req, res, next) {
  try {
    const saved = await createOrder(req.body);
    return res.status(201).json({ ok: true, data: saved });
  } catch (error) {
    return next(error);
  }
}

export async function updateOrderItem(req, res, next) {
  try {
    const updated = await editOrder(req.params.orderno, req.body);
    return res.json({ ok: true, data: updated });
  } catch (error) {
    return next(error);
  }
}

export async function deleteOrderItem(req, res, next) {
  try {
    const result = await removeOrder(req.params.orderno);
    return res.json({ ok: true, data: result });
  } catch (error) {
    return next(error);
  }
}
