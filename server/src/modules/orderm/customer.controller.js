import {
  createCustomer,
  editCustomer,
  getCustomers,
  removeCustomer,
} from './customer.service.js';
import { saveUploadedFile } from './upload.util.js';

export async function listCustomerItems(req, res, next) {
  try {
    const items = await getCustomers(req.query);
    return res.json({ ok: true, data: items });
  } catch (error) {
    return next(error);
  }
}

export async function createCustomerItem(req, res, next) {
  try {
    const saved = await createCustomer(req.body);
    return res.status(201).json({ ok: true, data: saved });
  } catch (error) {
    return next(error);
  }
}

export async function updateCustomerItem(req, res, next) {
  try {
    const updated = await editCustomer(req.params.id, req.body);
    return res.json({ ok: true, data: updated });
  } catch (error) {
    return next(error);
  }
}

export async function deleteCustomerItem(req, res, next) {
  try {
    const result = await removeCustomer(req.params.id);
    return res.json({ ok: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function uploadCustomerFile(req, res, next) {
  try {
    const file = await saveUploadedFile(req);
    return res.status(201).json({ ok: true, data: file });
  } catch (error) {
    return next(error);
  }
}
