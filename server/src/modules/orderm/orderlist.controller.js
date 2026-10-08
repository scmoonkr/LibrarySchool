import {
  createOrderListItem,
  editOrderListItem,
  getOrderList,
  getPendingPurchase,
  searchOrderBookList,
  removeOrderListItem,
  renumberOrderList,
  saveOrderListBulk,
  savePurchase,
  saveShipping,
  saveWarehousing,
  setOrderListStatus,
} from './orderlist.service.js';

export async function listItems(req, res, next) {
  try {
    const items = await getOrderList({ orderNo: req.query.orderNo });
    return res.json({ ok: true, data: items });
  } catch (error) {
    return next(error);
  }
}

// GET /api/orderm/order-list/pending — 처리현황(발주·미입고) 목록.
export async function listPendingItems(req, res, next) {
  try {
    const items = await getPendingPurchase();
    return res.json({ ok: true, data: items });
  } catch (error) {
    return next(error);
  }
}

// GET /api/orderm/order-list/search?q= — 주문도서 검색(ISBN·서명).
export async function searchItems(req, res, next) {
  try {
    const items = await searchOrderBookList(req.query.q);
    return res.json({ ok: true, data: items });
  } catch (error) {
    return next(error);
  }
}

export async function saveBulkItems(req, res, next) {
  try {
    const result = await saveOrderListBulk(req.body || {});
    return res.status(201).json({ ok: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function saveShippingItems(req, res, next) {
  try {
    const result = await saveShipping(req.body || {});
    return res.json({ ok: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function setStatusItems(req, res, next) {
  try {
    const result = await setOrderListStatus(req.body || {});
    return res.json({ ok: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function savePurchaseItems(req, res, next) {
  try {
    const result = await savePurchase(req.body || {});
    return res.json({ ok: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function saveWarehousingItems(req, res, next) {
  try {
    const result = await saveWarehousing(req.body || {});
    return res.json({ ok: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function createItem(req, res, next) {
  try {
    const saved = await createOrderListItem(req.body);
    return res.status(201).json({ ok: true, data: saved });
  } catch (error) {
    return next(error);
  }
}

export async function updateItem(req, res, next) {
  try {
    const updated = await editOrderListItem(req.params.orderNo, req.params.no, req.body);
    return res.json({ ok: true, data: updated });
  } catch (error) {
    return next(error);
  }
}

export async function renumberItems(req, res, next) {
  try {
    const result = await renumberOrderList(req.body?.orderNo);
    return res.json({ ok: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function deleteItem(req, res, next) {
  try {
    const result = await removeOrderListItem(req.params.orderNo, req.params.no);
    return res.json({ ok: true, data: result });
  } catch (error) {
    return next(error);
  }
}
