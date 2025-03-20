import ChainAssignmentsList from "@/components/chain-assignments-list";

export default function ChainAssignmentsPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Task Chain Assignments</h1>
      <ChainAssignmentsList />
    </div>
  );
}