import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Phone, HardHat, Sparkles, Droplets, Wind, Wrench, Leaf, ShieldCheck, ClipboardCheck, Users, CheckCircle, Star, FileCheck } from "lucide-react";

const processSteps = [
    {
        step: "STEP 1",
        label: "Remove",
        title: "분진 및 보양지 제거",
        desc: "시공 과정에서 발생한 분진, 보양지, 잔여 자재를 체계적으로 수거하고 1차 정리합니다.",
        icon: HardHat,
        color: "bg-blue-500",
    },
    {
        step: "STEP 2",
        label: "Detail",
        title: "세부 오염 세척",
        desc: "시멘트 가루, 실리콘 자국, 페인트 묻음 등 시공 잔여물을 전문 약품으로 정밀 제거합니다.",
        icon: Sparkles,
        color: "bg-emerald-500",
    },
    {
        step: "STEP 3",
        label: "Floor Care",
        title: "마감재별 맞춤 바닥 케어",
        desc: "타일, 대리석, 에폭시, 원목 등 마감재 특성에 맞는 전용 세정제와 장비로 바닥을 복원합니다.",
        icon: Droplets,
        color: "bg-purple-500",
    },
    {
        step: "STEP 4",
        label: "Sanitize",
        title: "살균 및 탈취",
        desc: "입점 전 최종 살균 소독과 탈취 처리로 즉시 사용 가능한 청결한 공간을 완성합니다.",
        icon: Wind,
        color: "bg-amber-500",
    },
];

const corePoints = [
    {
        icon: Wrench,
        title: "전문 장비 보유",
        desc: "산업용 집진기, 고압 세척기, 폴리셔 등 준공청소 전용 장비를 자체 보유하여 현장 상황에 즉각 대응합니다.",
    },
    {
        icon: Leaf,
        title: "친환경 세제",
        desc: "마감재 손상 없이 오염만 선택적으로 제거하는 친환경 인증 전문 세정제를 사용합니다.",
    },
    {
        icon: Users,
        title: "베테랑 팀 구성",
        desc: "준공청소 경력 10년 이상의 숙련된 전문가로 팀을 구성하여 품질 편차 없는 서비스를 보장합니다.",
    },
    {
        icon: ShieldCheck,
        title: "철저한 사후 관리",
        desc: "작업 완료 후 검수 리포트 제출 및 하자 발생 시 무상 재시공을 약속합니다.",
    },
];

const section02Points = [
    {
        icon: HardHat,
        title: "대규모 분진 컨트롤",
        desc: "산업용 집진 시스템과 다단계 필터링으로 시공 현장의 미세 분진까지 완벽하게 제거합니다. 넓은 면적도 빈틈없이 처리합니다.",
        color: "bg-blue-500",
    },
    {
        icon: Sparkles,
        title: "보양지 제거 기술",
        desc: "마감재 손상 없이 보양지와 접착 잔여물을 깔끔하게 제거하는 전문 기술을 보유하고 있습니다. 바닥, 벽면, 유리 등 자재별 최적의 방법을 적용합니다.",
        color: "bg-emerald-500",
    },
    {
        icon: CheckCircle,
        title: "준공 후 즉시 입점 시스템",
        desc: "준공청소 완료 즉시 영업이 가능한 수준의 청결도를 보장합니다. 오픈 일정에 맞춘 역산 스케줄링으로 납기를 철저히 준수합니다.",
        color: "bg-purple-500",
    },
];

const section03Points = [
    {
        icon: Droplets,
        title: "맞춤형 약품 처방",
        desc: "시멘트 잔여물, 실리콘 자국, 페인트 비산 등 오염 유형별로 최적의 전문 약품을 처방하여 마감재 원래의 질감과 광택을 복원합니다.",
        color: "bg-blue-500",
    },
    {
        icon: Star,
        title: "고소 작업 & 특수 구역 케어",
        desc: "높은 천장, 대형 유리 외벽, 계단실 등 일반 청소로는 접근이 어려운 특수 구역까지 전문 장비와 안전 장구를 갖추고 꼼꼼하게 케어합니다.",
        color: "bg-emerald-500",
    },
    {
        icon: FileCheck,
        title: "검수 리포트 제공",
        desc: "작업 전후 사진 비교, 체크리스트 기반의 상세 검수 리포트를 제공하여 시공사 및 건축주에게 투명한 결과물을 보고합니다.",
        color: "bg-purple-500",
    },
];

const whyBonyeon = [
    {
        icon: Sparkles,
        title: "압도적 디테일",
        desc: "눈에 보이지 않는 틈새, 몰딩 안쪽, 배관 뒤편까지 꼼꼼하게 처리하는 집요한 디테일로 차원이 다른 준공청소를 완성합니다.",
        color: "bg-blue-500",
    },
    {
        icon: Wrench,
        title: "전문 장비 & 인력",
        desc: "산업용 장비와 숙련된 인력의 조합으로 대규모 현장도 빠르고 정확하게 처리합니다. 규모에 관계없이 일관된 품질을 보장합니다.",
        color: "bg-emerald-500",
    },
    {
        icon: Leaf,
        title: "친환경 프리미엄",
        desc: "입점 고객과 방문객의 건강을 최우선으로 고려한 친환경 인증 세정제를 사용하여, 깨끗함과 안전함을 동시에 제공합니다.",
        color: "bg-purple-500",
    },
    {
        icon: ShieldCheck,
        title: "책임 시공제",
        desc: "준공청소 완료 후에도 하자 발생 시 무상 재시공을 약속합니다. 검수 리포트를 기반으로 한 체계적인 사후 관리 시스템을 운영합니다.",
        color: "bg-amber-500",
    },
];

function SectionTitle({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
    return (
        <div className="mb-8">
            <span className="text-[60px] sm:text-[75px] font-black text-blue-600/15 tracking-wider leading-none">{number}</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{title}</h2>
            <p className="text-gray-500 mt-2 max-w-2xl">{subtitle}</p>
        </div>
    );
}

export function CompletionCleaningDetail() {
    const navigate = useNavigate();

    return (
        <div className="bg-white">
            {/* Hero Banner */}
            <section className="relative bg-[#1e2b4f] text-white overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: "url('./assets/services/completion_hero_bg.jpg')" }}
                />
                <div className="absolute inset-0 bg-[#1e2b4f]/70" />
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

                        <p className="text-blue-300 font-medium text-sm tracking-widest mb-3">BONYEON COMPLETION CLEANING</p>
                        <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4">
                            준공 청소 서비스
                        </h1>
                        <p className="text-lg sm:text-xl text-white/80 max-w-2xl leading-relaxed">
                            "보이지 않는 곳의 디테일이 브랜드의 품격을 결정합니다"
                        </p>
                        <p className="text-base text-white/60 mt-4 max-w-2xl leading-relaxed">
                            신축 및 리모델링 후 남은 시멘트 분진, 실리콘 자국, 페인트 비산 등 시공 잔여물을 전문 장비와 약품으로 완벽하게 제거합니다.
                            건물의 첫인상을 결정짓는 준공청소, 본연(BONYEON)이 책임집니다.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 mt-8">
                            <a
                                href="tel:01027401734"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-[#1e2b4f] rounded-lg font-bold hover:bg-gray-100 transition-colors"
                            >
                                <Phone className="w-4 h-4" />
                                전화 상담하기
                            </a>
                            <button
                                onClick={() => {
                                    navigate("/");
                                    setTimeout(() => {
                                        document.getElementById("section-services")?.scrollIntoView({ behavior: "smooth" });
                                    }, 100);
                                }}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-white text-white rounded-lg font-bold hover:bg-white hover:text-[#1e2b4f] transition-colors"
                            >
                                다른 서비스 보기
                            </button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 01. 상업시설 준공청소란? */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="01"
                            title="상업시설 준공청소란?"
                            subtitle="신축 및 리모델링 공사 후 발생하는 분진, 자재 잔여물, 오염물을 전문적으로 제거하여 즉시 입점 가능한 청결한 공간을 만드는 서비스입니다."
                        />

                        <div className="bg-gray-50 rounded-xl p-6 mb-8">
                            <p className="text-gray-600 leading-relaxed">
                                건축 및 인테리어 공사가 끝난 후에는 눈에 보이는 먼지뿐 아니라, 시멘트 분진, 실리콘 자국, 페인트 비산, 접착제 잔여물 등
                                일반 청소로는 제거가 어려운 다양한 오염이 남아 있습니다. 준공청소는 이러한 시공 잔여물을 전문 장비와 약품을 활용하여
                                체계적으로 제거하고, 마감재 본연의 질감과 광택을 복원하는 전문 서비스입니다.
                            </p>
                        </div>

                        {/* Process Steps */}
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                            {processSteps.map((step, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-gray-50 rounded-xl p-6 hover:bg-blue-50/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`w-12 h-12 ${step.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                            <step.icon className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 mb-0.5">{step.step}</p>
                                            <p className="text-xs text-blue-600 font-medium mb-0.5">[{step.label}]</p>
                                            <h3 className="font-bold text-gray-900">{step.title}</h3>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                                </motion.div>
                            ))}
                        </div>

                        {/* 핵심 포인트 */}
                        <h3 className="text-xl font-bold text-gray-900 mb-4">핵심 포인트</h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                            {corePoints.map((point, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-gray-50 rounded-xl p-6 hover:bg-blue-50/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <point.icon className="w-8 h-8 text-blue-500 flex-shrink-0" />
                                        <h3 className="font-bold text-gray-900">{point.title}</h3>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">{point.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 02. 신축 상업시설 전문 */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="02"
                            title="신축 상업시설 전문"
                            subtitle="대규모 신축 현장부터 소규모 인테리어 리모델링까지, 규모와 상황에 맞는 최적의 준공청소 솔루션을 제공합니다."
                        />

                        <p className="text-gray-600 mb-8 italic border-l-4 border-blue-200 pl-4">
                            "준공청소는 건축의 마침표가 아닌, 비즈니스의 시작점입니다."
                        </p>

                        <div className="grid sm:grid-cols-3 gap-6">
                            {section02Points.map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <item.icon className={`w-8 h-8 text-white p-1.5 rounded-lg ${item.color} flex-shrink-0`} />
                                        <h3 className="font-bold text-gray-900">{item.title}</h3>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 03. 프리미엄 & 디테일 */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="03"
                            title="프리미엄 & 디테일"
                            subtitle="고객이 인지하지 못하는 미세한 부분까지 관리하는 것이 본연의 프리미엄입니다."
                        />

                        <p className="text-gray-600 mb-8 italic border-l-4 border-blue-200 pl-4">
                            "고객은 사소한 불결함에서 브랜드의 신뢰도를 결정합니다."
                        </p>

                        <div className="grid sm:grid-cols-3 gap-6">
                            {section03Points.map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-gray-50 rounded-xl p-6 hover:bg-blue-50/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <item.icon className={`w-8 h-8 text-white p-1.5 rounded-lg ${item.color} flex-shrink-0`} />
                                        <h3 className="font-bold text-gray-900">{item.title}</h3>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 04. 왜 본연이어야 하는가? */}
            <section className="py-16 px-4 sm:px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <SectionTitle
                            number="04"
                            title="왜 본연이어야 하는가?"
                            subtitle="준공청소의 품질은 곧 건물의 첫인상이자 비즈니스의 시작입니다. 본연이 다른 이유를 확인하세요."
                        />

                        <div className="grid sm:grid-cols-2 gap-4">
                            {whyBonyeon.map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <item.icon className={`w-8 h-8 text-white p-1.5 rounded-lg ${item.color} flex-shrink-0`} />
                                        <h3 className="font-bold text-gray-900">{item.title}</h3>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-16 px-4 sm:px-6 bg-[#1e2b4f] text-white text-center">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                        준공청소는 건물의 첫인상을 결정합니다
                    </h2>
                    <p className="text-white/70 mb-8">
                        전문 상담을 통해 현장에 최적화된 준공청소 플랜을 제안해 드립니다.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <a
                            href="tel:01027401734"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#1e2b4f] rounded-lg font-bold hover:bg-gray-100 transition-colors"
                        >
                            <Phone className="w-5 h-5" />
                            010-2740-1734
                        </a>
                        <button
                            onClick={() => navigate("/")}
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white text-white rounded-lg font-bold hover:bg-white hover:text-[#1e2b4f] transition-colors"
                        >
                            메인으로 돌아가기
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
