type StatCardProps = {
  icon: string;
  label: string;
  value: string;
};

export default function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="text-2xl">{icon}</div>
      <p className="mt-4 text-sm text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}