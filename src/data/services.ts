import { ServiceItem } from "../store/cartStore";

export const regularServices: ServiceItem[] = [
    { id: "reg-1", name: "바닥청소", description: "전문 장비 활용 바닥 스크러빙", image: "./assets/services/regular_cleaning.png" },
    { id: "reg-2", name: "쓰레기배출", description: "사무실 폐기물 수거 및 관리", image: "./assets/services/waste_management.png" },
    { id: "reg-3", name: "분리수거", description: "정확한 분리배출 대행", image: "./assets/services/waste_management.png" },
    { id: "reg-4", name: "화장실 청소", description: "위생적인 화장실 살균 청소", image: "./assets/services/office_cleaning.png" },
    { id: "reg-5", name: "탕비실 관리", description: "청결한 탕비실/라운지 유지", image: "./assets/services/office_cleaning.png" },
    { id: "reg-6", name: "회의실 관리", description: "중요한 미팅을 위한 회의실 정리", image: "./assets/services/office_cleaning.png" },
    { id: "reg-7", name: "전자제품 관리", description: "먼지 제거 및 외관 관리", image: "./assets/services/special_cleaning.png" },
    { id: "reg-8", name: "소모품 관리", description: "휴지, 비누 등 소모품 보충", image: "./assets/services/waste_management.png" },
    { id: "reg-9", name: "청구 대행", description: "시설 관리비 청구 업무 지원", image: "./assets/services/office_cleaning.png" },
];

export const specialServices: ServiceItem[] = [
    { id: "sp-1", name: "냉난방기 청소", description: "필터 및 내부 고압 세척", image: "./assets/services/special_cleaning.png" },
    { id: "sp-2", name: "카페트 청소", description: "얼룩 제거 및 스팀 살균", image: "./assets/services/carpet_cleaning.png" },
    { id: "sp-3", name: "딥클리닝", description: "바닥 왁스 코팅 및 연마", image: "./assets/services/special_cleaning.png" },
    { id: "sp-4", name: "외벽 청소", description: "건물 외벽 유리/패널 세척", image: "./assets/services/regular_cleaning.png" },
    { id: "sp-5", name: "준공 청소", description: "공사 분진 및 오염 제거", image: "./assets/services/regular_cleaning.png" },
    { id: "sp-6", name: "유리창 청소", description: "투명하고 깨끗한 유리 관리", image: "./assets/services/office_cleaning.png" },
];

export const allServices = [...regularServices, ...specialServices];
