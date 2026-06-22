import CampaignDetailClient from "./CampaignDetailClient";

export function generateStaticParams() {
  return [
    { id: "camp-demo-001" },
    { id: "camp-demo-002" },
    { id: "camp-demo-003" },
  ];
}

export default function Page({ params }: { params: { id: string } }) {
  return <CampaignDetailClient id={params.id} />;
}
