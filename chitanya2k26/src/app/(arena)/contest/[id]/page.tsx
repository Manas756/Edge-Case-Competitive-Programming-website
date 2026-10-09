import Arena from "./Arena";

export const metadata = { title: "Contest" };

export default async function ArenaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Arena contestId={id} />;
}
