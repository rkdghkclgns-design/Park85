
import { ServiceItem } from "../store/cartStore";

// ============================================================
// 와이어프레임 기반 카테고리 구조 (단일 데이터 소스)
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

// 카트(견적 상담 신청) 서비스 목록 - serviceCategories에서 자동 생성
export const allServices: ServiceItem[] = serviceCategories.flatMap(category =>
    category.subServices.map(sub => ({
        id: sub.id,
        name: sub.name,
        description: sub.description,
        image: category.image,
    }))
);
