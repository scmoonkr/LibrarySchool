import {
  deleteCustomerById,
  findCustomerById,
  getNextCustomerId,
  insertCustomer,
  listCustomers,
  updateCustomerById,
} from './customer.repository.js';

function appError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function str(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

// 담당자 배열 정규화: { name, phone, email, dept }
function normalizeIncharge(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((p) => ({
      name: str(p?.name, 80),
      phone: str(p?.phone, 40),
      email: str(p?.email, 120),
      dept: str(p?.dept, 80),
    }))
    // 완전히 빈 담당자 행은 버린다.
    .filter((p) => p.name || p.phone || p.email || p.dept);
}

function normalizeCustomer(body = {}) {
  const name = str(body.name, 120);
  if (!name) {
    throw appError('법인명(name)은 필수입니다.', 400);
  }

  return {
    name,
    branch: str(body.branch, 120),
    bizno: str(body.bizno, 40),
    incharge: normalizeIncharge(body.incharge),
    email: str(body.email, 120),
    phone: str(body.phone, 40),
    zipcode: str(body.zipcode, 20),
    address: str(body.address, 300),
    image: str(body.image, 500), // 사업자등록증 파일 URL
    note: str(body.note, 2000),
  };
}

export async function getCustomers(query = {}) {
  return listCustomers({ q: query.q });
}

export async function createCustomer(body = {}) {
  const now = new Date().toISOString();
  const document = {
    id: await getNextCustomerId(),
    ...normalizeCustomer(body),
    createdAt: now,
    updatedAt: now,
  };

  return insertCustomer(document);
}

export async function editCustomer(id, body = {}) {
  const existing = await findCustomerById(id);
  if (!existing) {
    throw appError('거래처를 찾을 수 없습니다.', 404);
  }

  const fields = {
    ...normalizeCustomer(body),
    updatedAt: new Date().toISOString(),
  };

  return updateCustomerById(id, fields);
}

export async function removeCustomer(id) {
  const deleted = await deleteCustomerById(id);
  if (!deleted) {
    throw appError('거래처를 찾을 수 없습니다.', 404);
  }
  return { ok: true };
}
