export function EmptyState({ message = "データがありません" }: { message?: string }) {
  return (
    <div className="py-12 text-center text-sm text-muted-fg">{message}</div>
  );
}
