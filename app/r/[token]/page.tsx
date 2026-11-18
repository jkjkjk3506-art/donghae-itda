import RequestStatus from "@/components/RequestStatus";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <main className="wrap"><RequestStatus token={token} /></main>;
}
