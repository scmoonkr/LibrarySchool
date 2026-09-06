import {
  createOrderListItem,
  editOrderListItem,
  getOrderList,
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
