import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Phone, Building2, Shield, Droplets, Wind, ClipboardCheck, Sparkles, Leaf } from "lucide-react";
import { Button } from "./ui/button";

const processSteps = [
    {
        step: "STEP 1",
        label: "Clean",
        title: "기본 청결 관리",
        desc: "바닥 먼지 및 오염 제거, 쓰레기 분리배출, 집기류 먼지 케어",
        icon: Sparkles,
        color: "bg-blue-500",
    },
    {
        step: "STEP 2",
        label: "Disinfect",
        title: "고위험 살균 관리",
        desc: "문 손잡이, 엘리베이터 버튼, 스위치 등 교차 오염 위험 구역 집중 살균",
        icon: Shield,
        color: "bg-emerald-500",
    },
    {
        step: "STEP 3",
        label: "Air & Odor",
        title: "프리미엄 공기질",
        desc: "자체 기술을 활용한 화장실, 배수구 악취 차단 및 실내 공기 정화 솔루션",
        icon: Wind,
        color: "bg-purple-500",
    },
    {
        step: "STEP 4",
        label: "Report",
        title: "체계적인 매니지먼트",
        desc: "매 방문 시 체크리스트 작성 및 고객 요청사항 상시 반영, 정기 피드백",
        icon: ClipboardCheck,
        color: "bg-amber-500",
    },
];

const floorSteps = [
    {
        phase: "1차",
        title: "리스킹 걸레",
        subtitle: "표면 미세먼지 및 머리카락 포집",
        detail: "정전기 유도 성분이 포함된 전문 리스킹 걸레를 사용하여 바닥 전체의 미세먼지, 머리카락, 가벼운 쓰레기를 1차적으로 포집합니다.",
        effect: "넓은 면적의 먼지가 날리지 않도록 밀착 제거하여, 다음 공정에서 먼지가 뭉치거나 퍼지는 현상을 방지합니다.",
    },
    {
        phase: "2차",
        title: "진공 흡입",
        subtitle: "구석진 모서리, 책상 밑 숨은 먼지 강력 흡입",
        detail: "고성능 HEPA 필터가 장착된 청소기를 사용하여 리스킹 걸레가 닿지 않는 구석진 모서리, 책상 밑, 집기 사이의 숨은 먼지를 강력하게 흡입합니다.",
        effect: "공기 질을 떨어뜨리는 미세한 분진까지 완벽하게 제거하여 가장 기초적인 청결 상태를 만듭니다.",
    },
    {
        phase: "3차",
        title: "마대 습식 케어",
        subtitle: "찌든 때와 스팟 오염 제거, 살균 효과 증대",
        detail: "친환경 인증 정품 세정제를 희석한 물과 깨끗한 마대 걸레를 이용하여 바닥의 찌든 때와 커피 자국, 스팟 오염을 닦아냅니다.",
        effect: "수분 케어를 통해 바닥의 광택을 살리고, 살균 소독 효과를 더해 맨발로 걸어도 안심할 수 있는 쾌적한 바닥 상태를 완성합니다.",
    },
];

const colorCodes = [
    { color: "bg-blue-500", emoji: "Blue", label: "블루", area: "일반 업무 공간 (책상, 사무기기)", purpose: "먼지 흡착 및 일반 표면 세정" },
    { color: "bg-red-500", emoji: "Red", label: "레드", area: "고위험 위생 구역 (변기, 화장실 바닥)", purpose: "박테리아 오염 전이 방지" },
    { color: "bg-yellow-400", emoji: "Yellow", label: "옐로우", area: "욕실 거울 및 세면대 (수전, 타일 벽면)", purpose: "물때 제거 및 욕실 청결 유지" },
    { color: "bg-green-500", emoji: "Green", label: "그린", area: "탕비실 및 조리 공간 (싱크대, 식탁)", purpose: "음식물 관련 교차 오염 방지" },
];

const serviceScopes = [
    {
        icon: Building2,
        title: "기업 오피스 & 워크스테이션",
        desc: "책상 먼지 제거, 회의실 살균, 탕비실 위생 관리 등 업무 몰입도를 높이는 환경 조성",
    },
    {
        icon: Building2,
        title: "상업 공간 & 프랜차이즈",
        desc: "카페, 레스토랑 등 홀 바닥 및 유리창 관리. 병의원, 학원 등 높은 수준의 위생 공간 방역",
    },
    {
        icon: Building2,
        title: "교육 및 공공 시설",
        desc: "어린이집 교구, 도서관 서가, 체육관 등 대규모 공간의 먼지 및 알러지 케어",
    },
    {
        icon: Building2,
        title: "특수 관리 구역",
        desc: "고층 빌딩 외부 유리창, 카페트 세척, 대형 에어컨 필터 관리 등 전문 장비 투입",
    },
];

function SectionTitle({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
    return (
        <div className="mb-8">
            <span className="text-sm font-bold text-blue-600 tracking-wider">{number}</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{title}</h2>
            <p className="text-gray-500 mt-2 max-w-2xl">{subtitle}</p>
        </div>
    );
}

export function RegularCleaningDetail() {
    const navigate = useNavigate();

    return (
        <div className="bg-white">
            {/* Hero Banner */}
            <section className="relative bg-[#1e2b4f] text-white overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1e2b4f] via-[#2a3a6b] to-[#1e2b4f]" />
                <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <button
                            onClick={() => navigate("/")}
                            className="flex items-center gap-2 text-white/70 hover:text-white mb-8 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="text-sm">메인으로 돌아가기</span>
                        </button>

                        <p className="text-blue-300 font-medium text-sm tracking-widest mb-3">BONYEON SUBSCRIPTION CARE</p>
                        <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4">
                            정기 관리 서비스
                        </h1>
                        <p className="text-lg sm:text-xl text-white/80 max-w-2xl leading-relaxed">
                            보이지 않는 곳까지 맑게, 공간 본연의 가치를 완성합니다.
                        </p>
                        <p className="text-base text-white/60 mt-4 max-w-2xl leading-relaxed">
                            매일 머무는 공간이 언제나 쾌적하고 건강할 수 있도록, 본연(BONYEON)이 체계적인 정기 관리 솔루션을 제공합니다.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 mt-8">
                            <a
                                href="tel:01027401734"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-[#1e2b4f] rounded-lg font-bold hover:bg-gray-100 transition-colors"
                            >
                                <Phone className="w-4 h-4" />
                                전화 상담하기
                            </a>
                            <Button
                                onClick={() => {
                                    navigate("/");
                                    setTimeout(() => {
                                        document.getElementById("section-services")?.scrollIntoView({ behavior: "smooth" });
                                    }, 100);
                                }}
                                variant="outline"
                                className="border-white/30 text-white hover:bg-white/10 px-6 py-3 rounded-lg"
                            >
                                다른 서비스 보기
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 01. Service Scope */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="01"
                            title="서비스 대상"
                            subtitle="공간의 목적과 구성원의 동선을 분석하여 맞춤형 프로세스를 적용합니다."
                        />
                        <div className="grid sm:grid-cols-2 gap-4">
                            {serviceScopes.map((scope, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-gray-50 rounded-xl p-6 hover:bg-blue-50/50 transition-colors"
                                >
                                    <scope.icon className="w-8 h-8 text-blue-500 mb-3" />
                                    <h3 className="font-bold text-gray-900 mb-2">{scope.title}</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">{scope.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 02. BONYEON Process */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="02"
                            title="본연만의 정기 관리 프로세스"
                            subtitle="4단계 통합 케어 시스템을 통해 공간의 본질적인 청결을 회복합니다."
                        />
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {processSteps.map((step, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className={`w-12 h-12 ${step.color} rounded-xl flex items-center justify-center mb-4`}>
                                        <step.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <p className="text-xs font-bold text-gray-400 mb-1">{step.step}</p>
                                    <p className="text-xs text-blue-600 font-medium mb-2">[{step.label}]</p>
                                    <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 03. Value Proposition */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="03"
                            title="정기 관리가 필요한 이유"
                            subtitle="전문적인 정기 관리는 비용이 아닌, 공간의 자산 가치를 높이는 전략적 투자입니다."
                        />
                        <div className="grid sm:grid-cols-3 gap-6">
                            {[
                                {
                                    title: "비용 및 시간 절감",
                                    desc: "비전문적 청소로 인한 마감재 손상 방지, 내부 직원의 업무 몰입도 향상으로 인건비 효율 극대화",
                                    icon: "💰",
                                },
                                {
                                    title: "브랜드 가치 향상",
                                    desc: "방문객에게 전달되는 깨끗한 첫인상은 업체의 신용과 직결되며 신뢰받는 브랜드 이미지를 형성",
                                    icon: "⭐",
                                },
                                {
                                    title: "건강한 업무 환경",
                                    desc: "미세먼지와 세균이 억제된 공간은 호흡기 질환 및 피로도를 줄여 구성원의 생산성 향상",
                                    icon: "🌿",
                                },
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="text-center p-6 rounded-xl bg-gradient-to-b from-blue-50/50 to-white border border-gray-100"
                                >
                                    <div className="text-4xl mb-4">{item.icon}</div>
                                    <h3 className="font-bold text-gray-900 mb-3">{item.title}</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 04. Core Commitment */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="04"
                            title="본연의 3대 핵심 원칙"
                            subtitle="단순한 용역 계약을 넘어, 공간의 건강과 위생을 책임지는 차별화된 시스템을 고집합니다."
                        />

                        {/* Point 1: Floor Deep Cleaning */}
                        <div className="mb-12">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                    <Droplets className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Point 1. 바닥 정밀 케어 3단계 공정</h3>
                                    <p className="text-sm text-gray-500">Floor Deep Cleaning</p>
                                </div>
                            </div>
                            <p className="text-gray-600 mb-6 italic border-l-4 border-blue-200 pl-4">
                                "바닥의 광택은 기초부터 다릅니다. 본연은 세 번의 공정을 거쳐 보이지 않는 먼지 한 톨까지 잡아냅니다."
                            </p>

                            <div className="space-y-4">
                                {floorSteps.map((fs, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -15 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.15 }}
                                        className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <span className="text-blue-600 font-bold text-lg">{fs.phase}</span>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900">{fs.title}</h4>
                                                <p className="text-sm text-blue-600 mb-2">{fs.subtitle}</p>
                                                <p className="text-sm text-gray-600 leading-relaxed mb-1">
                                                    <span className="font-medium text-gray-700">작업 내용:</span> {fs.detail}
                                                </p>
                                                <p className="text-sm text-gray-600 leading-relaxed">
                                                    <span className="font-medium text-gray-700">효과:</span> {fs.effect}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Point 2: Color-Coded Cleaning */}
                        <div className="mb-12">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Point 2. 교차 오염 방지 컬러 코딩 시스템</h3>
                                    <p className="text-sm text-gray-500">Color-Coded Cleaning</p>
                                </div>
                            </div>
                            <p className="text-gray-600 mb-4 italic border-l-4 border-emerald-200 pl-4">
                                "화장실을 닦던 걸레로 대표님의 책상을 닦지 않습니다."
                            </p>
                            <p className="text-sm text-gray-600 mb-6">
                                일반적인 청소 방식은 하나의 걸레로 여러 구역을 닦으며 세균과 오염물을 옮기는 '교차 오염'의 위험이 있습니다. 본연은 작업 공간별로 지정된 색상의 극세사 타월만을 사용합니다.
                            </p>

                            <div className="grid sm:grid-cols-2 gap-3">
                                {colorCodes.map((cc, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.1 }}
                                        className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-start gap-3"
                                    >
                                        <div className={`w-8 h-8 ${cc.color} rounded-full flex-shrink-0 mt-0.5`} />
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm">{cc.label} ({cc.emoji})</h4>
                                            <p className="text-xs text-gray-600 mt-1">{cc.area}</p>
                                            <p className="text-xs text-blue-600 mt-1">{cc.purpose}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Point 3: Eco-Friendly Care */}
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                                    <Leaf className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Point 3. 친환경 인증 정품 세정제</h3>
                                    <p className="text-sm text-gray-500">Eco-Friendly Care</p>
                                </div>
                            </div>
                            <p className="text-gray-600 mb-6 italic border-l-4 border-green-200 pl-4">
                                "청소 후 독한 냄새가 아닌, 건강한 숨결이 남아야 합니다."
                            </p>

                            <div className="grid sm:grid-cols-3 gap-4">
                                {[
                                    {
                                        title: "안전성이 검증된 친환경 인증 제품",
                                        items: [
                                            "환경부 친환경 마크 획득 정부 인증 제품 사용",
                                            "무독성/무자극 솔루션으로 잔류 화학 성분 원천 차단",
                                            "알러지 유발 물질 배제, 어린이집/민감 공간 안심",
                                        ],
                                    },
                                    {
                                        title: "공간의 수명을 늘리는 정품 세정제",
                                        items: [
                                            "자재별 맞춤형 케어로 고급 자재 부식/변색 방지",
                                            "오염물만 선택적으로 제거, 본연의 광택 보존",
                                        ],
                                    },
                                    {
                                        title: "작업자와 고객 모두를 위한 가치",
                                        items: [
                                            "독한 약품 냄새 없는 쾌적한 작업 환경",
                                            "환경 오염 최소화, 지속 가능한 깨끗함 추구",
                                        ],
                                    },
                                ].map((group, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 15 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.1 }}
                                        className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                                    >
                                        <h4 className="font-bold text-gray-900 mb-3 text-sm">{group.title}</h4>
                                        <ul className="space-y-2">
                                            {group.items.map((item, j) => (
                                                <li key={j} className="text-xs text-gray-600 leading-relaxed flex items-start gap-2">
                                                    <span className="text-green-500 mt-0.5 flex-shrink-0">&#10003;</span>
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-16 px-4 sm:px-6 bg-[#1e2b4f] text-white text-center">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                        공간의 가치를 높이는 정기 관리, 지금 시작하세요
                    </h2>
                    <p className="text-white/70 mb-8">
                        전문 상담을 통해 귀사에 최적화된 정기 관리 플랜을 제안해 드립니다.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <a
                            href="tel:01027401734"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#1e2b4f] rounded-lg font-bold hover:bg-gray-100 transition-colors"
                        >
                            <Phone className="w-5 h-5" />
                            010-2740-1734
                        </a>
                        <Button
                            onClick={() => navigate("/")}
                            variant="outline"
                            className="border-white/30 text-white hover:bg-white/10 px-8 py-4 rounded-lg"
                        >
                            메인으로 돌아가기
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
