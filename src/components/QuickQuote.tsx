import { useState } from "react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { useCartStore } from "../store/cartStore";

export function QuickQuote() {
    const [area, setArea] = useState([30]);
    const [name, setName] = useState("");
    const [contact, setContact] = useState("");

    const { setConsultationForm, setIsOpen } = useCartStore();

    const handleQuickRequest = () => {
        // Update store with current values
        setConsultationForm({
            area: `${area[0]}평`,
            name: name,
            contact: contact
        });
        // Open the drawer
        setIsOpen(true);
    };

    return (
        <div className="fixed top-20 left-0 right-0 z-40 bg-gray-50 py-3 md:py-4 border-b border-gray-100 shadow-sm">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row items-center justify-center gap-3 md:gap-6">
                    <div className="text-base md:text-lg font-bold text-gray-900 whitespace-nowrap hidden sm:block">
                        간편견적
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 w-full max-w-5xl">
                        {/* Area Slider */}
                        <div className="w-full sm:w-48 px-2">
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="text-xs font-medium text-gray-500">평수</span>
                                <span className="text-sm font-bold text-blue-600">{area[0]}평{area[0] === 100 && "+"}</span>
                            </div>
                            <Slider
                                defaultValue={[30]}
                                max={100}
                                step={1}
                                value={area}
                                onValueChange={setArea}
                                className="cursor-pointer"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row w-full gap-2 sm:gap-3">
                            <input
                                type="text"
                                placeholder="담당자명"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="flex-1 px-3 sm:px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm min-w-0"
                            />
                            <input
                                type="tel"
                                placeholder="연락처"
                                value={contact}
                                onChange={(e) => setContact(e.target.value)}
                                className="flex-1 px-3 sm:px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm min-w-0"
                            />
                            <Button
                                onClick={handleQuickRequest}
                                className="bg-[#1e2b4f] hover:bg-[#151f3a] text-white px-4 sm:px-6 py-2.5 rounded-lg whitespace-nowrap font-medium h-[42px] text-sm w-full sm:w-auto"
                            >
                                상담신청
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
