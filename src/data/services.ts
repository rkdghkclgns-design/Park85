
import { ServiceItem } from "../store/cartStore";

// 1. 정기 청소
export const regularCleaningServices: ServiceItem[] = [
    { id: "reg-1", name: "바닥청소", description: "전문 장비 활용 바닥 스크러빙", image: "./assets/services/regular_cleaning.png" },
    { id: "reg-2", name: "분리수거", description: "정확한 분리배출 대행", image: "./assets/services/waste_management.png" },
    { id: "reg-3", name: "쓰레기 배출", description: "사무실 폐기물 수거 및 관리", image: "./assets/services/waste_management.png" },
    { id: "reg-4", name: "화장실 청소", description: "위생적인 화장실 살균 청소", image: "./assets/services/toilet_cleaning_new.jpg" },
    { id: "reg-5", name: "탕비실 관리", description: "청결한 탕비실/라운지 유지", image: "./assets/services/pantry_management_new.jpg" },
];

// 2. 정기 소독 & 방역
export const disinfectionServices: ServiceItem[] = [
    { id: "dis-1", name: "감염병 예방", description: "법정 의무 소독 및 증명서 발급", image: "./assets/services/special_cleaning.png" },
    { id: "dis-2", name: "공간 소독", description: "사무실 전체 공간 살균 케어", image: "./assets/services/special_cleaning.png" },
    { id: "dis-3", name: "스팀 소독", description: "고온 스팀 살균 처리", image: "./assets/services/special_cleaning.png" },
    { id: "dis-4", name: "연무 소독", description: "초미립자 연무 공간 살균", image: "./assets/services/special_cleaning.png" },
    { id: "dis-5", name: "분무 소독", description: "표면 접촉부 집중 살균", image: "./assets/services/special_cleaning.png" },
];

// 3. 딥 클리닝
export const deepCleaningServices: ServiceItem[] = [
    { id: "deep-1", name: "준공 청소", description: "공사 분진 및 오염 제거", image: "./assets/services/regular_cleaning.png" },
    { id: "deep-2", name: "에어컨 청소", description: "필터 및 내부 고압 세척", image: "./assets/services/special_cleaning.png" },
    { id: "deep-3", name: "대형 유리창", description: "투명하고 깨끗한 유리 관리", image: "./assets/services/office_cleaning.png" },
    { id: "deep-4", name: "매장 출입구", description: "첫인상을 위한 출입구 청소", image: "./assets/services/regular_cleaning.png" },
    { id: "deep-5", name: "카페트", description: "얼룩 제거 및 스팀 살균", image: "./assets/services/carpet_cleaning.png" },
    { id: "deep-6", name: "의자", description: "패브릭 의자 세탁 및 살균", image: "./assets/services/special_cleaning.png" },
];

// 4. 건물 관리
export const buildingManagementServices: ServiceItem[] = [
    { id: "bld-1", name: "건물 외벽", description: "건물 외벽 유리/패널 세척", image: "./assets/services/regular_cleaning.png" },
    { id: "bld-2", name: "창문", description: "고소 작업 및 창문 청소", image: "./assets/services/office_cleaning.png" },
    { id: "bld-3", name: "간판", description: "간판 오염 제거 및 청소", image: "./assets/services/special_cleaning.png" },
    { id: "bld-4", name: "LED", description: "조명 시설 유지 보수 및 청소", image: "./assets/services/office_cleaning.png" },
];

export const allServices = [
    ...regularCleaningServices,
    ...disinfectionServices,
    ...deepCleaningServices,
    ...buildingManagementServices
];
