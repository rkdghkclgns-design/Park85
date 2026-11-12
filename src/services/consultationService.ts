export interface ConsultationRequest {
    buildingType: string;
    area: string;
    address: string;
    contact: string;
    name: string;
    visitType: string;
    services: string[];
}

const consultationEndpoint = "https://bonyeon-control.cleaning-autopost-slack-relay.workers.dev/api/consultation";

export async function submitConsultation(data: ConsultationRequest, submissionId: string) {
    const response = await fetch(consultationEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, submissionId }),
        signal: AbortSignal.timeout(12000),
    });
    const receipt = await response.json().catch(() => null);
    if (!response.ok || receipt?.accepted !== true || receipt?.submissionId !== submissionId) {
        throw new Error(receipt?.error || "상담을 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
    return receipt.submissionId as string;
}
