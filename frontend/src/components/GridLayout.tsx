export default function GridLayout({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 ${className}`}>
      {children}
    </div>
  );
}
