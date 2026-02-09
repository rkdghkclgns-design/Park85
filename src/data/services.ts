
import { ServiceItem } from "../store/cartStore";

// 카트(견적 상담 신청) 서비스 목록 - 플랫 리스트
export const allServices: ServiceItem[] = [
    { id: "svc-1", name: "정기 청소", description: "사무실/상업공간 정기 청소", image: "./assets/services/regular_cleaning.png" },
    { id: "svc-2", name: "정기 소독", description: "정기 소독 및 방역 서비스", image: "./assets/services/special_cleaning.png" },
    { id: "svc-3", name: "펜션, 글램핑 청소", description: "펜션/글램핑 시설 청소", image: "./assets/services/regular_cleaning.png" },
    { id: "svc-4", name: "준공 청소", description: "공사 후 분진 및 오염 제거", image: "./assets/services/regular_cleaning.png" },
    { id: "svc-5", name: "냉난방기 청소", description: "냉난방 공조기 분해 세척", image: "./assets/services/special_cleaning.png" },
    { id: "svc-6", name: "건물 외벽 청소", description: "건물 외벽 유리/패널 세척", image: "./assets/services/regular_cleaning.png" },
    { id: "svc-7", name: "건물 외부 창문 청소", description: "고소 작업 외부 창문 청소", image: "./assets/services/office_cleaning.png" },
    { id: "svc-8", name: "간판 및 조명 수리", description: "간판·조명 보수 및 수리", image: "./assets/services/special_cleaning.png" },
    { id: "svc-9", name: "간판 및 어닝 청소", description: "간판·어닝 오염 제거 청소", image: "./assets/services/special_cleaning.png" },
    { id: "svc-10", name: "LED 전광판 청소", description: "LED 전광판 세척 관리", image: "./assets/services/office_cleaning.png" },
    { id: "svc-11", name: "유리창 청소", description: "대형 유리창 투명 관리", image: "./assets/services/office_cleaning.png" },
    { id: "svc-12", name: "카페트 청소", description: "카페트 얼룩 제거 및 살균", image: "./assets/services/carpet_cleaning.png" },
    { id: "svc-13", name: "의자 청소", description: "패브릭 의자 세탁 및 살균", image: "./assets/services/special_cleaning.png" },
];

// ServiceSelection 컴포넌트용 카테고리별 서비스
// 1. 정기 청소
export const regularCleaningServices: ServiceItem[] = [
    { id: "reg-1", name: "바닥청소", description: "전문 장비 활용 바닥 스크러빙", image: "./assets/services/regular_cleaning.png" },
    { id: "reg-2", name: "분리수거", description: "정확한 분리배출 대행", image: "./assets/services/waste_management.png?v=2" },
    { id: "reg-3", name: "쓰레기 배출", description: "사무실 폐기물 수거 및 관리", image: "./assets/services/waste_management.png?v=2" },
    { id: "reg-4", name: "화장실 청소", description: "위생적인 화장실 살균 청소", image: "./assets/services/toilet_cleaning_new.jpg?v=2" },
    { id: "reg-5", name: "탕비실 관리", description: "청결한 탕비실/라운지 유지", image: "./assets/services/pantry_management_new.jpg?v=2" },
];

// 2. 정기 소독 & 방역
export const disinfectionServices: ServiceItem[] = [
    { id: "dis-1", name: "감염병 예방", description: "법정 의무 소독 및 증명서 발급", image: "./assets/services/special_cleaning.png" },
    { id: "dis-2", name: "공간 소독", description: "사무실 전체 공간 살균 케어", image: "./assets/services/special_cleaning.png" },
    { id: "dis-3", name: "스팀 소독", description: "고온 스팀 살균 처리", image: "./assets/services/special_cleaning.png" },
    { id: "dis-4", name: "연무 소독", description: "초미립자 연무 공간 살균", image: "./assets/services/special_cleaning.png" },
    { id: "dis-5", name: "분무 소독", description: "표면 접촉부 집중 살균", image: "./assets/services/special_cleaning.png" },
];

// 3. 프리미엄 클리닝 (구 딥 클리닝)
export const deepCleaningServices: ServiceItem[] = [
    { id: "deep-1", name: "준공 청소", description: "공사 분진 및 오염 제거", image: "./assets/services/regular_cleaning.png" },
    { id: "deep-2", name: "펜션&글램핑 청소", description: "펜션/글램핑 시설 전문 청소", image: "./assets/services/regular_cleaning.png" },
    { id: "deep-3", name: "냉난방 공조기", description: "냉난방 공조기 분해 세척", image: "./assets/services/special_cleaning.png" },
    { id: "deep-4", name: "대형 유리", description: "대형 유리창 투명 관리", image: "./assets/services/office_cleaning.png" },
    { id: "deep-5", name: "카페트", description: "얼룩 제거 및 스팀 살균", image: "./assets/services/carpet_cleaning.png" },
    { id: "deep-6", name: "패브릭 의자", description: "패브릭 의자 세탁 및 살균", image: "./assets/services/special_cleaning.png" },
];

// 4. 건물 관리
export const buildingManagementServices: ServiceItem[] = [
    { id: "bld-1", name: "건물 외벽", description: "건물 외벽 유리/패널 세척", image: "./assets/services/regular_cleaning.png" },
    { id: "bld-2", name: "외부 창문", description: "고소 작업 외부 창문 청소", image: "./assets/services/office_cleaning.png" },
    { id: "bld-3", name: "간판 청소", description: "간판 오염 제거 및 청소", image: "./assets/services/special_cleaning.png" },
    { id: "bld-4", name: "어닝 청소", description: "어닝 오염 제거 및 세척", image: "./assets/services/special_cleaning.png" },
    { id: "bld-5", name: "LED 간판&조명 수리", description: "조명 시설 유지 보수 및 수리", image: "./assets/services/office_cleaning.png" },
    { id: "bld-6", name: "LED전광판 청소", description: "LED 전광판 세척 관리", image: "./assets/services/office_cleaning.png" },
];
