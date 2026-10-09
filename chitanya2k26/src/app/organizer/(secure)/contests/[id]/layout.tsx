import ContestTabs from "@/components/org/ContestTabs";

export default async function ContestLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <ContestTabs id={id} />
      <div className="org-content">{children}</div>
    </>
  );
}
