import { ClientForm } from "./ClientForm";

export default function ClientNewPage() {
  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-0">
        <span className="text-sm font-bold text-text">顧客登録</span>
      </div>
      <ClientForm />
    </div>
  );
}
