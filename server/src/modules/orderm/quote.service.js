// 주문 하나로 견적서와 비교견적서 PDF 를 만든다.
//
// 렌더링은 CMS 의 보험 설계서와 같은 방식(puppeteer 로 HTML → PDF)이고,
// 결과 파일은 uploads/<YYYY>/<MM>/pdf/ 아래에 떨어뜨린 뒤 URL 을 돌려준다.
//
// 두 문서는 양식과 공급자, 할인가가 다르다.
//   견적서     : 우리(도서관학교) 명의. 할인가는 주문도서에 저장된 값.
//   비교견적서 : 비교 업체 명의. 할인가를 정가의 5% 만큼 더 비싸게 잡는다.
// 두 문서 모두 할인가는 10원 미만을 버린다. (15,165 → 15,160)
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getConfig } from '../cms/config.mjs';
import { findOrderByNo, updateOrderByNo } from './order.repository.js';
import { listOrderList } from './orderlist.repository.js';

// 견적서 도장 이미지 위치: apps/libraryschool/public/Images/
//   libraryschool.png — 견적서(도서관학교) 도장
//   aladin.png        — 비교견적서(알라딘) 도장
// (server/src/modules/orderm → 저장소 루트 → apps/…, dist 빌드에서도 동일하게 해석됨)
const STAMP_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../apps/libraryschool/public/Images',
);

// 도장 이미지를 data URI(base64)로 읽는다. 파일이 없으면 ''(도장 없이 렌더).
async function loadStampDataUri(filename) {
  try {
    const buf = await readFile(path.join(STAMP_DIR, filename));
    const ext = path.extname(filename).toLowerCase();
    const mime = ext === '.jpg' || ext === '.jpeg'
      ? 'image/jpeg'
      : ext === '.svg' ? 'image/svg+xml' : 'image/png';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return '';
  }
}

// 견적서(우리) 공급자 정보. 양식에 그대로 찍히는 값이라 여기서만 고친다.
const SUPPLIER = {
  name: '사회적협동조합 도서관학교',
  bizNo: '598-82-00013',
  ceoLabel: '이사장',
  ceo: '정연대',
  address: '인천시 미추홀구 낙섬중로 129\nLH미추홀 303동 109호',
  bizType: '서비스,제조,도소매',
  bizItem: '교육,도서,출판,인쇄',
  tel: '032-201-7009',
  fax: '0505-172-1004',
  email: 'clibraryschool@gmail.com',
  banner: '사회적협동조합,  사회적기업 인증 기업',
  account: '301-0169-2079-91(농협)',
  accountHolder: '사회적협동조합 도서관학교',
  homepage: 'www.libraryschool.kr',
};

// 비교견적서에 찍히는 업체 정보.
const COMPARE_SUPPLIER = {
  bizNo: '201-81-23094',
  name: '㈜알라딘커뮤니케이션',
  ceo: '조 유 식',
  address: '서울시 중구 중림동 157-2',
  contact: '☎6913-2655  (Fax)6913-2663',
};

// 비교견적서 할인가는 정가의 이만큼을 견적서 할인가에 더한 값이다.
const COMPARE_MARKUP_RATE = 0.05;

function appError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function won(n) {
  return (Number(n) || 0).toLocaleString('ko-KR');
}

// 10원 미만 절사. 15,165 → 15,160
function floor10(n) {
  return Math.floor((Number(n) || 0) / 10) * 10;
}

// 688470 -> '육십팔만팔천사백칠십'
export function numberToKorean(num) {
  const n = Math.floor(Math.abs(Number(num) || 0));
  if (!n) return '영';
  const D = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const S = ['', '십', '백', '천'];
  const B = ['', '만', '억', '조', '경'];

  const groups = [];
  let rest = n;
  while (rest > 0) {
    groups.push(rest % 10000);
    rest = Math.floor(rest / 10000);
  }

  let out = '';
  for (let g = groups.length - 1; g >= 0; g -= 1) {
    const v = groups[g];
    if (!v) continue;
    const s = String(v).padStart(4, '0');
    let part = '';
    for (let i = 0; i < 4; i += 1) {
      const d = Number(s[i]);
      if (!d) continue;
      const pos = 3 - i;
      // 십/백/천 자리의 1 은 '일' 을 생략한다. (일십 X, 십 O)
      part += d === 1 && pos > 0 ? S[pos] : D[d] + S[pos];
    }
    out += part + B[g];
  }
  return out;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 견적서/비교견적서/거래명세서에 들어갈 값들을 주문/주문도서에서 뽑아낸다.
// options.docTitle: 문서 제목(기본 '견적서'). options.dateSource: 'delivery' 면 출고일자를 일자로 쓴다.
export async function buildQuoteData(orderNo, options = {}) {
  const on = Number(orderNo);
  if (!Number.isFinite(on) || on <= 0) {
    throw appError('주문번호(orderNo)가 필요합니다.', 400);
  }

  const order = await findOrderByNo(on);
  if (!order) throw appError('주문을 찾을 수 없습니다.', 404);

  const books = await listOrderList({ orderNo: on });
  if (!books.length) throw appError('주문에 등록된 도서가 없습니다.', 400);

  const rows = books.map((b, i) => {
    const qty = Number(b.qty) || 0;
    const price = Number(b.price) || 0;
    // 할인가가 비어 있으면 정가로 본다. (정가 판매)
    const dcPrice = floor10(Number(b.dc_price) || price);
    // 비교견적가는 정가의 5% 만큼 비싸게. 단 정가를 넘길 수는 없으므로,
    // 할인 없이 정가로 파는 도서(100%)는 비교견적서도 정가 그대로다.
    const comparePrice = Math.min(floor10(dcPrice + price * COMPARE_MARKUP_RATE), price);
    return {
      no: i + 1,
      title: b.title || '',
      publisher: b.publisher || '',
      qty,
      price,
      dcPrice,
      comparePrice,
      amount: dcPrice * qty,
      compareAmount: comparePrice * qty,
      note: b.note || '',
    };
  });

  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  const compareTotal = rows.reduce((sum, r) => sum + r.compareAmount, 0);

  const date = options.dateSource === 'delivery'
    ? (order.delivery_date || todayStr())
    : (order.quote_date || order.order_date || todayStr());

  return {
    orderNo: on,
    docTitle: options.docTitle || '견적서',
    receiver: order.customer || '',
    reference: order.branch || '',
    date,
    projectName: order.ordername || '',
    total,
    totalKorean: numberToKorean(total),
    compareTotal,
    compareTotalKorean: numberToKorean(compareTotal),
    rows,
    supplier: SUPPLIER,
    compareSupplier: COMPARE_SUPPLIER,
  };
}

// 두 양식이 공유하는 스타일. variant 로 세부만 갈린다.
const BASE_CSS = `
  @page { size: A4 portrait; margin: 14mm 10mm 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', Pretendard, sans-serif;
    font-size: 10pt;
    color: #000;
  }
  h1.doc-title {
    margin: 0 0 18px;
    border: 1px solid #000;
    padding: 14px 0;
    text-align: center;
    font-size: 26pt;
    font-weight: 700;
    letter-spacing: 18px;
    text-indent: 18px;
  }
  .head { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 14px; }
  .head-left { flex: 1; min-width: 0; }
  .head-left .line { display: flex; gap: 4px; margin-bottom: 9px; font-size: 10.5pt; }
  .head-left .lbl { width: 46px; flex: none; letter-spacing: 2px; white-space: nowrap; }
  .head-left .val { font-weight: 700; border-bottom: 1px solid #000; padding: 0 4px 1px; min-width: 90px; white-space: nowrap; }

  table.items { border-collapse: collapse; width: 100%; }
  table.items th, table.items td { border: 1px solid #000; padding: 3px 5px; font-size: 9.5pt; }
  table.items thead th { background: #f2f2f2; text-align: center; font-weight: 700; }
  table.items tbody td { height: 20px; }
  .c-no    { width: 30px;  text-align: center; }
  .c-title { text-align: left; }
  .c-pub   { width: 120px; text-align: left; }
  .c-num   { width: 62px;  text-align: right; }
  th.c-num { text-align: center; }
  .c-note  { width: 48px; }

  /* 공급자 표 + 도장 오버레이 */
  .supplier-wrap { position: relative; flex: none; }
  .supplier-wrap .stamp {
    position: absolute;
    pointer-events: none;
    /* 스캔 도장의 흰 배경을 투명처럼 보이게(빨강만 남김) */
    mix-blend-mode: multiply;
  }
  .supplier-wrap .stamp-quote   { width: 18mm; height: 18mm; top: -3px; right: 4px; }
  .supplier-wrap .stamp-compare { width: 18mm; height: 18mm; top: 11px; right: 16px; }
`;

const QUOTE_CSS = `
  table.supplier { border-collapse: collapse; width: 370px; flex: none; }
  table.supplier th, table.supplier td {
    border: 1px solid #000; padding: 3px 6px; font-size: 8.5pt; font-weight: 400; text-align: left;
  }
  table.supplier th { background: #fff; text-align: center; white-space: nowrap; letter-spacing: 1px; }
  table.supplier td { font-weight: 700; white-space: nowrap; }
  table.supplier td.addr { font-weight: 400; white-space: pre-line; line-height: 1.35; }
  table.supplier .side { width: 18px; text-align: center; letter-spacing: 0; }
  table.supplier td.email { text-align: center; font-weight: 700; }

  .banner {
    border: 1px solid #000; border-bottom: 0;
    background: #ffff00; text-align: center; font-weight: 700; padding: 6px 0; font-size: 11pt;
  }
  tr.total-row td {
    background: #3f3f3f; color: #fff; text-align: center; font-weight: 700; letter-spacing: 6px;
  }
  tr.total-row td.total-label { background: #fdeada; color: #000; letter-spacing: 0; }
  tr.total-row td.total-value { background: #fdeada; color: #000; text-align: right; letter-spacing: 0; }
  tr.blank-row td { height: 34px; }
  .foot { margin-top: 18px; display: flex; gap: 28px; font-size: 9.5pt; }
  .foot b { font-weight: 700; }
`;

const COMPARE_CSS = `
  table.supplier { border-collapse: collapse; width: 380px; flex: none; }
  table.supplier th, table.supplier td {
    border: 1px solid #000; padding: 4px 8px; font-size: 9pt; text-align: left;
  }
  table.supplier th {
    background: #fff; text-align: center; white-space: nowrap; letter-spacing: 1px; font-weight: 400;
  }
  table.supplier td { white-space: nowrap; }
  tr.total-row td { background: #d9d9d9; font-weight: 700; }
  tr.total-row td.total-label { text-align: center; }
  tr.total-row td.total-value { text-align: right; }
`;

function itemRowsHtml(rows, compare) {
  return rows.map((r) => `
      <tr>
        <td class="c-no">${r.no}</td>
        <td class="c-title">${esc(r.title)}</td>
        <td class="c-pub">${esc(r.publisher)}</td>
        <td class="c-num">${r.qty}</td>
        <td class="c-num">${won(r.price)}</td>
        <td class="c-num">${won(compare ? r.comparePrice : r.dcPrice)}</td>
        <td class="c-num">${won(compare ? r.compareAmount : r.amount)}</td>
        <td class="c-note">${esc(r.note)}</td>
      </tr>`).join('');
}

const ITEM_HEAD_HTML = `
    <thead>
      <tr>
        <th class="c-no">No</th>
        <th class="c-title">도서명</th>
        <th class="c-pub">출판사</th>
        <th class="c-num">수량</th>
        <th class="c-num">정가</th>
        <th class="c-num">할인가</th>
        <th class="c-num">합계</th>
        <th class="c-note">비고</th>
      </tr>
    </thead>`;

// variant: 'quote' | 'compare'
export function buildQuoteHtml(data, variant = 'quote') {
  const compare = variant === 'compare';
  const s = data.supplier;
  const cs = data.compareSupplier;

  const headLeft = compare ? `
      <div class="line"><span class="lbl">수신처</span>: <span class="val">${esc(data.receiver)}</span></div>
      <div class="line"><span class="lbl">참 조</span>: <span class="val">${esc(data.reference)}</span></div>
      <div class="line"><span class="lbl">견적일</span>: <span class="val">${esc(data.date)}</span></div>
      <div class="line"><span class="lbl">견적명</span>: <span class="val">${esc(data.projectName)}</span></div>
      <div class="line"><span class="lbl">견적가</span>: <span class="val">${esc(data.compareTotalKorean)}원</span></div>` : `
      <div class="line"><span class="lbl">수신처</span>: <span class="val">${esc(data.receiver)}</span></div>
      <div class="line"><span class="lbl">참 조</span>: <span class="val">${esc(data.reference)}</span></div>
      <div class="line"><span class="lbl">일 자</span>: <span class="val">${esc(data.date)}</span></div>
      <div class="line"><span class="lbl">사업명</span>: <span class="val">${esc(data.projectName)}</span></div>
      <div class="line"><span class="lbl">금 액</span>: <span class="val">\\${won(data.total)}원(${esc(data.totalKorean)}원)</span></div>`;

  const supplierTable = compare ? `
    <table class="supplier">
      <tr><th>사업자등록번호</th><td>${esc(cs.bizNo)}</td></tr>
      <tr><th>상 &nbsp; 호 &nbsp; 명</th><td>${esc(cs.name)}</td></tr>
      <tr><th>대 표 이 사</th><td>${esc(cs.ceo)}</td></tr>
      <tr><th>사업장소재지</th><td>${esc(cs.address)}</td></tr>
      <tr><th>연 &nbsp; 락 &nbsp; 처</th><td>${esc(cs.contact)}</td></tr>
    </table>` : `
    <table class="supplier">
      <tr>
        <th colspan="2">업 체 명</th>
        <td colspan="3">${esc(s.name)}</td>
      </tr>
      <tr>
        <th colspan="2">사업번호</th>
        <td>${esc(s.bizNo)}</td>
        <th>${esc(s.ceoLabel)}</th>
        <td>${esc(s.ceo)}</td>
      </tr>
      <tr>
        <th class="side" rowspan="4">공<br />급<br />자</th>
        <th>주 &nbsp; 소</th>
        <td class="addr" colspan="3">${esc(s.address)}</td>
      </tr>
      <tr>
        <th>업 &nbsp; 태</th>
        <td>${esc(s.bizType)}</td>
        <th>종 &nbsp; 목</th>
        <td>${esc(s.bizItem)}</td>
      </tr>
      <tr>
        <th>전 &nbsp; 화</th>
        <td>${esc(s.tel)}</td>
        <th>팩 &nbsp; 스</th>
        <td>${esc(s.fax)}</td>
      </tr>
      <tr>
        <th>이 메 일</th>
        <td class="email" colspan="3">${esc(s.email)}</td>
      </tr>
    </table>`;

  // 합계 줄. 견적서는 '비 고' 검은 바 + 합계, 비교견적서는 회색 한 줄.
  const totalRow = compare ? `
      <tr><td class="c-no"></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr class="total-row">
        <td colspan="4"></td>
        <td class="total-label" colspan="2">합계</td>
        <td class="total-value">${won(data.compareTotal)}</td>
        <td></td>
      </tr>` : `
      <tr><td class="c-no"></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr class="total-row">
        <td colspan="5">비 고</td>
        <td class="total-label">합계</td>
        <td class="total-value" colspan="2">${won(data.total)}</td>
      </tr>
      <tr class="blank-row"><td colspan="8"></td></tr>`;

  // 도장 오버레이: 견적서는 도서관학교 도장, 비교견적서는 알라딘 도장.
  const stampSrc = compare ? data.stampCompare : data.stampQuote;
  const stampImg = stampSrc
    ? `<img class="stamp ${compare ? 'stamp-compare' : 'stamp-quote'}" src="${stampSrc}" alt="" />`
    : '';
  const supplierBox = `<div class="supplier-wrap">${supplierTable}${stampImg}</div>`;

  const banner = compare ? '' : `<div class="banner">${esc(s.banner)}</div>`;
  const foot = compare ? '' : `
  <div class="foot">
    <span>계좌번호: <b>${esc(s.account)}</b></span>
    <span>예금주: <b>${esc(s.accountHolder)}</b></span>
    <span>홈페이지: <b>${esc(s.homepage)}</b></span>
  </div>`;

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<style>${BASE_CSS}${compare ? COMPARE_CSS : QUOTE_CSS}</style>
</head>
<body>
  <h1 class="doc-title">${esc(data.docTitle || '견적서')}</h1>

  <div class="head">
    <div class="head-left">${headLeft}
    </div>
${supplierBox}
  </div>

  ${banner}
  <table class="items">${ITEM_HEAD_HTML}
    <tbody>${itemRowsHtml(data.rows, compare)}${totalRow}
    </tbody>
  </table>
${foot}
</body>
</html>`;
}

function sanitizeFilename(name) {
  return String(name || 'quote')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || 'quote';
}

async function renderPdf(page, html) {
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  return page.pdf({
    printBackground: true,
    format: 'A4',
    // 표가 길어지면 자동으로 넘어가고, thead 는 브라우저가 페이지마다 반복해 준다.
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate:
      '<div style="width:100%;font-size:8pt;text-align:center;color:#000;">'
      + '<span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    margin: { top: '14mm', right: '10mm', bottom: '16mm', left: '10mm' },
  });
}

// puppeteer 로 여러 variant 를 PDF 로 렌더해 UPLOAD_DIR/<subdir> 에 저장한다.
// urlPath 는 /api/file/<subdir>/... 로 내려 어디서나 열리게 한다.
async function renderVariantsToPdf(data, variants, subdir) {
  let puppeteer;
  try {
    const mod = await import('puppeteer');
    puppeteer = mod.default;
  } catch {
    throw appError('puppeteer가 설치되지 않았습니다. pnpm install 을 실행하세요.', 500);
  }

  const launchOpts = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  };
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOpts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const dir = path.resolve(getConfig().uploadDir, subdir);
  await mkdir(dir, { recursive: true });

  const stamp = Date.now();
  const suffix = `${data.receiver || data.orderNo}_${data.date}`;

  const browser = await puppeteer.launch(launchOpts);
  try {
    const page = await browser.newPage();
    const out = {};
    for (const v of variants) {
      const buf = await renderPdf(page, buildQuoteHtml(data, v.variant));
      const filename = `${sanitizeFilename(`${v.label}_${suffix}`)}.pdf`;
      await writeFile(path.join(dir, filename), buf);
      out[v.key] = {
        label: v.label,
        filename,
        urlPath: `/api/file/${subdir}/${encodeURIComponent(filename)}?t=${stamp}`,
      };
    }
    return out;
  } finally {
    await browser.close();
  }
}

// 생성된 문서 링크를 주문(order.quoteFiles)에 저장한다. 라벨 기준으로 최신 것 교체.
// drawer 를 다시 열 때 '견적서/비교견적서/거래명세서 보기' 로 확인할 수 있게 한다.
async function persistOrderDocs(orderNo, files) {
  const order = await findOrderByNo(Number(orderNo));
  if (!order) return;
  const existing = Array.isArray(order.quoteFiles) ? order.quoteFiles : [];
  const map = new Map(existing.map((f) => [f.label, f]));
  for (const f of files) {
    if (f) map.set(f.label, { label: f.label, filename: f.filename, urlPath: f.urlPath });
  }
  await updateOrderByNo(Number(orderNo), { quoteFiles: [...map.values()] });
}

// 견적서 + 비교견적서를 한 번에 만든다. → UPLOAD_DIR/estimate
export async function generateQuotePdf(orderNo) {
  const data = await buildQuoteData(orderNo);

  // 도장 이미지(있으면 오버레이). 견적서=도서관학교, 비교견적서=알라딘.
  data.stampQuote = await loadStampDataUri('libraryschool.png');
  data.stampCompare = await loadStampDataUri('aladin.png');

  const out = await renderVariantsToPdf(data, [
    { key: 'quote', variant: 'quote', label: '견적서' },
    { key: 'compare', variant: 'compare', label: '비교견적서' },
  ], 'estimate');

  await persistOrderDocs(orderNo, [out.quote, out.compare]);

  return {
    ...out,
    count: data.rows.length,
    total: data.total,
    compareTotal: data.compareTotal,
  };
}

// 거래명세서(도서관학교 명의, 제목 '거래명세서', 일자=출고일자). → UPLOAD_DIR/estimate
export async function generateStatementPdf(orderNo) {
  const data = await buildQuoteData(orderNo, { docTitle: '거래명세서', dateSource: 'delivery' });
  data.stampQuote = await loadStampDataUri('libraryschool.png');

  const out = await renderVariantsToPdf(data, [
    { key: 'statement', variant: 'quote', label: '거래명세서' },
  ], 'estimate');

  await persistOrderDocs(orderNo, [out.statement]);

  return {
    ...out,
    count: data.rows.length,
    total: data.total,
  };
}
