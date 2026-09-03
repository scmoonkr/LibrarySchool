// 주문관리(/orderM/**) 화면의 상단 네비게이션 / 좌측 사이드바 메뉴 정의.
// backend(useBackendMenu)와 같은 구조로, 주문관리 하위 5개 페이지를 묶는다.
export function useOrderMenu() {
  const navItems = [
    { label: 'Home', to: '/' },
    { label: 'Backend', to: '/backend' },
    { label: '주문관리', to: '/orderM/order', current: true },
  ];

  const menuItems = [
    { key: 'order', label: '주문', to: '/orderM/order' },
    { key: 'orderList', label: '주문도서', to: '/orderM/orderList' },
    { key: 'checkPrice', label: '정가조회', to: '/orderM/checkPrice' },
    { key: 'estimate', label: '견적서', to: '/orderM/estimate' },
    { key: 'customer', label: '거래처', to: '/orderM/customer' },
  ];

  return { navItems, menuItems };
}
