import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCartStore } from "../store/cartStore";
import { Button } from "./ui/button";
import { X, Send, Building, MapPin, Phone, User, Maximize, Check, Loader2 } from "lucide-react";
import { allServices } from "../data/services";
import { submitConsultation } from "../services/consultationService";

export function CartDrawer() {
    const { items, isOpen, setIsOpen, toggleItem, consultationForm } = useCartStore();

    // Form State - Initialize with store data
    const [formData, setFormData] = useState({
        buildingType: "",
        area: "",
        address: "",
        contact: "",
        name: "",
        visitType: ""
    });

    // Check if a service is selected
    const isSelected = (id: string) => items.some(item => item.id === id);

    // Sync store form data to local state when drawer opens
    // Sync store form data
    useEffect(() => {
        if (isOpen) {
            setFormData(prev => ({
                ...prev,
                ...consultationForm
            }));
        }
    }, [isOpen, consultationForm]);

    // Mobile Back Button Support
    useEffect(() => {
        if (isOpen) {
            // Push state when opened
            window.history.pushState({ cartOpen: true }, "", window.location.href);

            const handlePopState = () => {
                // If back button is pressed, close the cart
                setIsOpen(false);
            };

            window.addEventListener("popstate", handlePopState);

            return () => {
                window.removeEventListener("popstate", handlePopState);
                // If closed programmatically (not by back button), we might need to go back
                // But blindly calling back() is dangerous if the user navigated. 
                // For simplicity in this specific request context "Back button closes popup":
                // We rely on the user pressing back. If they close via X, the state remains, 
                // but that's acceptable behavior for modals in many web apps (forward button reopens it).
                // Or we can try to pop it if we know we pushed it.
            };
        }
    }, [isOpen, setIsOpen]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation (Simple check)
        if (!formData.contact || !formData.name) {
            alert("성함과 연락처는 필수 입력 항목입니다.");
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await submitConsultation({
                ...formData,
                services: items.map(i => i.name),
                submittedAt: new Date().toISOString(),
            });

            if (result.success) {
                alert(`✅ ${result.message}\n\n담당자: ${formData.name}\n연락처: ${formData.contact}\n\n신청 서비스:\n${items.length > 0 ? items.map(i => i.name).join(", ") : "선택 안 함"}`);
                setIsOpen(false);
                // Reset form
                setFormData({
                    buildingType: "",
                    area: "",
                    address: "",
                    contact: "",
                    name: "",
                    visitType: ""
                });
            } else {
                alert(`❌ ${result.message}`);
            }
        } catch (error) {
            console.error("Submission error:", error);
            alert("상담 신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 bottom-0 w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col"
                    >
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                🛒 견적 상담 신청
                            </h2>
                            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                                <X className="h-6 w-6" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Selected Services List (Now Checkable Full List) */}
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                                    서비스 선택 ({items.length})
                                </h3>

                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    {allServices.map((service) => {
                                        const selected = isSelected(service.id);
                                        return (
                                            <div
                                                key={service.id}
                                                onClick={() => toggleItem(service)}
                                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selected
                                                    ? "bg-blue-50 border-blue-200"
                                                    : "bg-white border-gray-100 hover:bg-gray-50"
                                                    }`}
                                            >
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selected ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"
                                                    }`}>
                                                    {selected && <Check className="w-3.5 h-3.5 text-white" />}
                                                </div>
                                                <img
                                                    src={service.image}
                                                    alt={service.name}
                                                    className="w-10 h-10 rounded-md object-cover"
                                                />
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm text-gray-900">{service.name}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Customer Information Form */}
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                                    상담 기본 정보
                                </h3>

                                <form id="consultation-form" onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-600">건물 유형 <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <Building className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                                <select
                                                    name="buildingType"
                                                    value={formData.buildingType}
                                                    onChange={handleInputChange}
                                                    required
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                                >
                                                    <option value="">선택해주세요</option>
                                                    <option value="사무실">사무실</option>
                                                    <option value="상가/매장">상가/매장</option>
                                                    <option value="병원">병원</option>
                                                    <option value="학원">학원</option>
                                                    <option value="공장/창고">공장/창고</option>
                                                    <option value="기타">기타</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-600">평수 (약) <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <Maximize className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    name="area"
                                                    value={formData.area}
                                                    onChange={handleInputChange}
                                                    placeholder="예: 30평"
                                                    required
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-600">주소 <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                            <input
                                                type="text"
                                                name="address"
                                                value={formData.address}
                                                onChange={handleInputChange}
                                                placeholder="상세 정보를 받으실 주소를 입력해주세요"
                                                required
                                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-600">거래 여부 <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <Check className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                            <select
                                                name="visitType"
                                                value={formData.visitType}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                            >
                                                <option value="">선택해주세요</option>
                                                <option value="첫 거래">첫 거래입니다</option>
                                                <option value="기존 고객">기존 고객입니다</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-600">담당자 성함 <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleInputChange}
                                                    placeholder="홍길동"
                                                    required
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-600">연락처 <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="tel"
                                                    name="contact"
                                                    value={formData.contact}
                                                    onChange={handleInputChange}
                                                    placeholder="010-0000-0000"
                                                    required
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>

                        <div className="p-6 border-t bg-gray-50">
                            <div className="text-xs text-gray-500 mb-4 text-center">
                                * 모든 정보는 필수 입력 항목입니다.
                            </div>
                            <Button
                                type="submit"
                                form="consultation-form"
                                className="w-full h-14 text-lg font-bold bg-[#1e2b4f] hover:bg-[#151f3a] shadow-lg disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed group transition-all"
                                disabled={!formData.buildingType || !formData.area || !formData.address || !formData.name || !formData.contact || !formData.visitType}
                            >
                                {(!formData.buildingType || !formData.area || !formData.address || !formData.name || !formData.contact || !formData.visitType) ? (
                                    <span className="mr-2">🔒</span>
                                ) : (
                                    <Send className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                )}
                                무료 견적 상담 신청하기
                            </Button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
