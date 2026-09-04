import { PatientDetail } from "@/components/patients/patient-detail";

export default async function PatientDetailPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  return <PatientDetail patientId={patientId} />;
}
