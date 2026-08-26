import { MockExamScreen } from "@/components/mock/exam-screen";

/** S-5 試験中画面(specs/05)。実体は client component(復元は /api/mock/sessions/current) */
export default function MockSessionPage() {
  return <MockExamScreen />;
}
