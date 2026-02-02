// Consultation Form Submission Service
// This service handles form submissions - configure with your preferred backend

export interface ConsultationRequest {
    buildingType: string;
    area: string;
    address: string;
    contact: string;
    name: string;
    services: string[];
    submittedAt: string;
}

// Configuration - Update these values for your backend
const CONFIG = {
    // Option 1: Google Sheets (via Google Apps Script Web App)
    GOOGLE_SHEETS_URL: "",

    // Option 2: Email Service (e.g., EmailJS, Formspree)
    EMAIL_SERVICE_URL: "",

    // Option 3: Custom Backend API
    BACKEND_API_URL: "",

    // Fallback: Store locally (for development)
    USE_LOCAL_STORAGE: true,
};

/**
 * Submit consultation request to configured backend
 */
export async function submitConsultation(data: ConsultationRequest): Promise<{
    success: boolean;
    message: string;
}> {
    const requestData = {
        ...data,
        submittedAt: new Date().toISOString(),
    };

    // Try Google Sheets first
    if (CONFIG.GOOGLE_SHEETS_URL) {
        try {
            const response = await fetch(CONFIG.GOOGLE_SHEETS_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestData),
            });
            if (response.ok) {
                return { success: true, message: "상담 신청이 완료되었습니다." };
            }
        } catch (error) {
            console.error("Google Sheets submission failed:", error);
        }
    }

    // Try Email Service
    if (CONFIG.EMAIL_SERVICE_URL) {
        try {
            const response = await fetch(CONFIG.EMAIL_SERVICE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestData),
            });
            if (response.ok) {
                return { success: true, message: "상담 신청이 이메일로 전송되었습니다." };
            }
        } catch (error) {
            console.error("Email service submission failed:", error);
        }
    }

    // Try Custom Backend
    if (CONFIG.BACKEND_API_URL) {
        try {
            const response = await fetch(CONFIG.BACKEND_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestData),
            });
            if (response.ok) {
                return { success: true, message: "상담 신청이 완료되었습니다." };
            }
        } catch (error) {
            console.error("Backend API submission failed:", error);
        }
    }

    // Fallback: Local Storage
    if (CONFIG.USE_LOCAL_STORAGE) {
        try {
            const existing = JSON.parse(localStorage.getItem("consultations") || "[]");
            existing.push(requestData);
            localStorage.setItem("consultations", JSON.stringify(existing));
            console.log("Consultation saved to localStorage:", requestData);

            // Trigger Mailto for immediate notification (Client-side)
            const subject = `[상담신청] ${data.name}님 견적 상담 요청`;
            const body = `
[견적 상담 요청]

1. 신청인 정보
- 성함: ${data.name}
- 연락처: ${data.contact}
- 주소: ${data.address}

2. 건물 정보
- 유형: ${data.buildingType}
- 평수: ${data.area}

3. 신청 서비스
${data.services.length > 0 ? data.services.map(s => `- ${s}`).join("\n") : "- 선택 안 함"}

--------------------------------------------------
작성일: ${new Date().toLocaleString()}
            `.trim();

            const mailtoLink = `mailto:bonyeon.cs@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.location.href = mailtoLink;

            return { success: true, message: "이메일 발송 창이 열립니다. 내용을 확인 후 전송해주세요." };
        } catch (error) {
            console.error("Local storage failed:", error);
        }
    }

    return { success: false, message: "상담 신청에 실패했습니다. 잠시 후 다시 시도해주세요." };
}

/**
 * Get all stored consultations (for development/admin)
 */
export function getStoredConsultations(): ConsultationRequest[] {
    try {
        return JSON.parse(localStorage.getItem("consultations") || "[]");
    } catch {
        return [];
    }
}
