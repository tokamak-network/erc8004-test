import { Header } from "@/components/header";
import { ProposalForm } from "@/components/proposal-form";
import { ProposalList } from "@/components/proposal-list";

export default function Home() {
  return (
    <>
      <Header />
      <main className="container mx-auto p-4 space-y-8">
        <ProposalForm />
        <ProposalList />
      </main>
    </>
  );
}
