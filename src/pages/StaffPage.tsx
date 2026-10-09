import { useMemo, useState, useCallback } from "react";
import { useGameStore } from "@/store/gameStore";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/control-center";
import { EmptyState } from "@/components/ui/EmptyState";
import { STABLE_TABS } from "@/constants/ui/navigation";
import { useGame } from "@/contexts/useGame";
import { useRequireWorld } from "@/hooks/useRequireWorld";
import { compareBy, type SortDirection } from "@/lib/sortUtils";
import { Briefcase } from "lucide-react";
import type { Staff, StaffRole } from "@/engine/types/staff";
import { toast } from "sonner";
import { getPlayerHeya } from "@/presenters/engineAccess";
import { getStaffMember } from "@/presenters/worldAccess";
import { ROLE_LABELS, STAFF_ACCESSOR } from "@/components/staff/staffMeta";
import { StaffCard } from "@/components/staff/StaffCard";
import { StaffSummary, RecruitSlot } from "@/components/staff/StaffPageSections";

export default function StaffPage() {
  const { state } = useGame();
  const sendCommand = useGameStore((s) => s.sendCommand);
  const [isRecruitOpen, setIsRecruitOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<StaffRole>("assistant_oyakata");
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<SortDirection>("asc");

  const world = state.world;

  const hasWorld = useRequireWorld();

  const heya = world ? getPlayerHeya(world) : undefined;

  const staffList = useMemo(() => {
    if (!world || !heya) return [];
    const list: Staff[] = [];
    for (const id of heya.staffIds || []) {
      const staffMember = getStaffMember(world, id);
      if (staffMember) list.push(staffMember);
    }
    const fn = STAFF_ACCESSOR[sortKey];
    if (!fn) return list;
    return [...list].sort((a, b) => compareBy(a, b, fn, sortOrder));
  }, [world, heya, sortKey, sortOrder]);

  const handleHire = useCallback(() => {
    if (!world || !heya) return;

    sendCommand({ type: "HIRE_STAFF", heyaId: heya.id, role: selectedRole });
    setIsRecruitOpen(false);
    toast.success(`Hired new ${ROLE_LABELS[selectedRole]}`);
  }, [heya, selectedRole, sendCommand, world]);

  const handleFire = useCallback(
    (staffId: string) => {
      if (!world || !heya) return;

      const staff = getStaffMember(world, staffId);
      if (staff?.role === "oyakata") {
        toast.error("You cannot fire the Oyakata.");
        return;
      }

      sendCommand({ type: "FIRE_STAFF", heyaId: heya.id, staffId });
      toast.success("Staff member released.");
    },
    [world, heya, sendCommand]
  );

  if (!hasWorld || !heya) return null;

  return (
    <AppLayout subNavTabs={STABLE_TABS} activeSubTab="staff" pageTitle="Support Staff">
      <div className="space-y-8">
        <PageHeader
          eyebrow="── MY STABLE ──"
          title="Staff Management"
          lede="Manage the specialists who shape your heya's future."
        />
        <StaffSummary
          staffCount={staffList.length}
          onSortChange={(key, order) => {
            setSortKey(key);
            setSortOrder(order);
          }}
        />

        {/* Staff Grid */}
        {staffList.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No Staff Members"
            description="Your stable currently has no specialized staff. Hire experts to improve training, reduce costs, and discover new talent."
            action={{
              label: "Recruit Specialist",
              onClick: () => setIsRecruitOpen(true),
            }}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {staffList.map((staff) => (
              <StaffCard key={staff.id} staff={staff} onFire={handleFire} />
            ))}

            {/* Recruit Slot */}
            {staffList.length < 12 && (
              <RecruitSlot
                isOpen={isRecruitOpen}
                onOpenChange={setIsRecruitOpen}
                selectedRole={selectedRole}
                onRoleChange={setSelectedRole}
                onHire={handleHire}
              />
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
