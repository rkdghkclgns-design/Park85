
import { ServiceItem } from "../store/cartStore";

// ============================================================
// 와이어프레임 기반 카테고리 구조 (드롭다운 메뉴 + 라우팅용)
// ============================================================

export interface SubService {
    id: string;
    name: string;
    description: string;
}

export interface ServiceCategory {
    id: string;
    name: string;
    description: string;
    image: string;
    subServices: SubService[];
}

export const serviceCategories: ServiceCategory[] = [
    {
        id: "regular",
        name: "정기 청소",
        description: "사무실, 병원 등 상업공간 전반의 정기 청소 서비스 제공",
        image: "./assets/services/main_regular.jpg?v=1",
        subServices: [
            { id: "regular-cleaning", name: "정기 청소", description: "사무실/상업공간 정기 청소" },
            { id: "regular-disinfection", name: "정기 소독", description: "정기 소독 및 방역 서비스" },
            { id: "glamping", name: "글램핑", description: "글램핑 시설 전문 청소" },
            { id: "pension", name: "펜션", description: "펜션 시설 전문 청소" },
        ],
    },
    {
        id: "air-purification",
        name: "공기 정화",
        description: "담배냄새, 반려동물냄새, 새집증후군 등 공기질 개선 서비스",
        image: "./assets/services/main_disinfection.jpg?v=1",
        subServices: [
            { id: "cigarette-smell", name: "담배냄새", description: "담배냄새 제거 및 탈취" },
            { id: "pet-smell", name: "반려동물냄새", description: "반려동물 냄새 제거" },
            { id: "new-house-syndrome", name: "새집증후군", description: "새집증후군 원인 물질 제거" },
        ],
    },
    {
        id: "premium",
        name: "프리미엄 청소",
        description: "준공 청소, 바닥 왁스, 에어컨 청소 등 프리미엄 클리닝 서비스",
        image: "./assets/services/main_premium.jpg?v=1",
        subServices: [
            { id: "completion-cleaning", name: "준공 청소", description: "공사 후 분진 및 오염 제거" },
            { id: "floor-wax", name: "바닥 왁스", description: "바닥 왁스 코팅 및 관리" },
            { id: "aircon-cleaning", name: "에어컨 청소", description: "에어컨 분해 세척 서비스" },
        ],
    },
    {
        id: "building",
        name: "건물 관리",
        description: "간판 청소, 외벽 청소, 유리창 청소 및 간판 수리 서비스",
        image: "./assets/services/main_building.jpg?v=1",
        subServices: [
            { id: "sign-cleaning", name: "간판 청소", description: "간판 오염 제거 및 청소" },
            { id: "exterior-cleaning", name: "외벽 청소", description: "건물 외벽 세척 관리" },
            { id: "window-cleaning", name: "유리창 청소", description: "대형 유리창 투명 관리" },
            { id: "sign-repair", name: "간판 수리", description: "간판 및 조명 보수 수리" },
        ],
    },
];

// ============================================================
// ServiceSelection 컴포넌트용 카테고리별 서비스 (이미지 포함)
// ============================================================

// 1. 정기 청소
export const regularCleaningServices: ServiceItem[] = [
    { id: "reg-1", name: "바닥청소", description: "전문 장비 활용 바닥 스크러빙", image: "./assets/services/regular_cleaning.jpg?v=30" },
    { id: "reg-2", name: "분리수거", description: "정확한 분리배출 대행", image: "./assets/services/waste_management.png?v=5" },
    { id: "reg-3", name: "쓰레기 배출", description: "사무실 폐기물 수거 및 관리", image: "./assets/services/waste_management_new.jpg?v=31" },
    { id: "reg-4", name: "화장실 청소", description: "위생적인 화장실 살균 청소", image: "./assets/services/toilet_cleaning_new.jpg?v=5" },
    { id: "reg-5", name: "탕비실 관리", description: "청결한 탕비실/라운지 유지", image: "./assets/services/pantry_management_new.jpg?v=5" },
];

// 2. 정기 소독 & 방역
export const disinfectionServices: ServiceItem[] = [
    { id: "dis-1", name: "방역 소독", description: "일반 해충 방제", image: "./assets/services/service_disinfection_new.png?v=37" },
    { id: "dis-2", name: "공간 소독", description: "사무실 전체 공간 살균 케어", image: "./assets/services/space_disinfection.jpg?v=50" },
    { id: "dis-3", name: "스팀 소독", description: "고온 스팀 살균 처리", image: "./assets/services/steam_disinfection.jpg?v=50" },
    { id: "dis-4", name: "연무 소독", description: "초미립자 연무 공간 살균", image: "./assets/services/fog_disinfection.jpg?v=50" },
    { id: "dis-5", name: "분무 소독", description: "표면 접촉부 집중 살균", image: "./assets/services/spray_disinfection.jpg?v=50" },
];

// 3. 프리미엄 클리닝
export const deepCleaningServices: ServiceItem[] = [
    { id: "deep-1", name: "준공 청소", description: "공사 분진 및 오염 제거", image: "./assets/services/completion_cleaning.jpg?v=50" },
    { id: "deep-2", name: "펜션&글램핑 청소", description: "펜션/글램핑 시설 전문 청소", image: "./assets/services/pension_glamping_cleaning.jpg?v=50" },
    { id: "deep-3", name: "냉난방 공조기", description: "냉난방 공조기 분해 세척", image: "./assets/services/hvac_cleaning.jpg?v=50" },
    { id: "deep-4", name: "대형 유리", description: "대형 유리창 투명 관리", image: "./assets/services/large_glass.jpg?v=50" },
    { id: "deep-5", name: "카페트", description: "얼룩 제거 및 스팀 살균", image: "./assets/services/carpet_cleaning.jpg?v=50" },
    { id: "deep-6", name: "패브릭 의자", description: "패브릭 의자 세탁 및 살균", image: "./assets/services/fabric_chair.jpg?v=50" },
];

// 4. 건물 관리
export const buildingManagementServices: ServiceItem[] = [
    { id: "bld-1", name: "건물 외벽", description: "건물 외벽 유리/패널 세척", image: "./assets/services/building_exterior.jpg?v=50" },
    { id: "bld-2", name: "외부 창문", description: "고소 작업 외부 창문 청소", image: "./assets/services/exterior_window.jpg?v=50" },
    { id: "bld-3", name: "간판 청소", description: "간판 오염 제거 및 청소", image: "./assets/services/sign_cleaning.jpg?v=50" },
    { id: "bld-4", name: "어닝 청소", description: "어닝 오염 제거 및 세척", image: "./assets/services/awning_cleaning.jpg?v=50" },
    { id: "bld-5", name: "LED 간판&조명 수리", description: "조명 시설 유지 보수 및 수리", image: "./assets/services/led_sign_repair.jpg?v=50" },
    { id: "bld-6", name: "LED전광판 청소", description: "LED 전광판 세척 관리", image: "./assets/services/led_billboard_cleaning.jpg?v=50" },
];

// 카트(견적 상담 신청) 서비스 목록 - 전체 플랫 리스트
export const allServices: ServiceItem[] = [
    { id: "svc-1", name: "정기 청소", description: "사무실/상업공간 정기 청소", image: "./assets/services/regular_cleaning.jpg?v=30" },
    { id: "svc-2", name: "정기 소독", description: "정기 소독 및 방역 서비스", image: "./assets/services/space_disinfection.jpg?v=50" },
    { id: "svc-3", name: "펜션, 글램핑 청소", description: "펜션/글램핑 시설 청소", image: "./assets/services/pension_glamping_cleaning.jpg?v=50" },
    { id: "svc-4", name: "준공 청소", description: "공사 후 분진 및 오염 제거", image: "./assets/services/completion_cleaning.jpg?v=50" },
    { id: "svc-5", name: "냉난방기 청소", description: "냉난방 공조기 분해 세척", image: "./assets/services/hvac_cleaning.jpg?v=50" },
    { id: "svc-6", name: "건물 외벽 청소", description: "건물 외벽 유리/패널 세척", image: "./assets/services/building_exterior.jpg?v=50" },
    { id: "svc-7", name: "건물 외부 창문 청소", description: "고소 작업 외부 창문 청소", image: "./assets/services/exterior_window.jpg?v=50" },
    { id: "svc-8", name: "간판 및 조명 수리", description: "간판·조명 보수 및 수리", image: "./assets/services/led_sign_repair.jpg?v=50" },
    { id: "svc-9", name: "간판 및 어닝 청소", description: "간판·어닝 오염 제거 청소", image: "./assets/services/sign_cleaning.jpg?v=50" },
    { id: "svc-10", name: "LED 전광판 청소", description: "LED 전광판 세척 관리", image: "./assets/services/led_billboard_cleaning.jpg?v=50" },
    { id: "svc-11", name: "유리창 청소", description: "대형 유리창 투명 관리", image: "./assets/services/large_glass.jpg?v=50" },
    { id: "svc-12", name: "카페트 청소", description: "카페트 얼룩 제거 및 살균", image: "./assets/services/carpet_cleaning.jpg?v=50" },
    { id: "svc-13", name: "의자 청소", description: "패브릭 의자 세탁 및 살균", image: "./assets/services/fabric_chair.jpg?v=50" },
];
