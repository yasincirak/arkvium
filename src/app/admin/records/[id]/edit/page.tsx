import { notFound } from "next/navigation";
import EditRecordForm from "@/components/admin/EditRecordForm";
import { getRecordById } from "@/lib/store";

type Props = {
  params: {
    id: string;
  };
};

export default async function EditRecordPage({ params }: Props) {
  const record = await getRecordById(params.id);

  if (!record) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Kaydı Düzenle</h1>

        <p className="mt-2 text-sm text-white/50">
          Kayıt bilgilerini güncelleyin.
        </p>
      </div>

      <EditRecordForm record={record} />
    </div>
  );
}