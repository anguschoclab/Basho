import { useMemo, useState, useCallback } from "react";
import { useGameStore } from "@/store/gameStore";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/control-center";
import { STABLE_TABS } from "@/constants/ui/navigation";
import { useGame } from "@/contexts/GameContext";
import { useRequireWorld } from "@/components/RequireWorld";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { UserPlus, ShieldCheck, Zap, Heart, Award, Briefcase, Trash2 } from "lucide-react";
import type { Staff, StaffRole } from "@/engine/types/staff";
import { toast } from "sonner";
import { toFatigueBand, toScandalBand } from "@/engine/descriptorBands";
import { FATIGUE_LABELS, SCANDAL_LABELS } from "@/constants/ui/labels";
import { getPlayerHeya } from "@/engine/queries";

const ROLE_LABELS: Record<StaffRole, string> = {
  oyakata: "Steward",
  assistant_oyakata: "Lead Coach",
  technique_coach: "Technique Specialist",
  conditioning_coach: "Conditioning Specialist",
  nutritionist: "Dietitian",
  medical_staff: "Chief Physio",
  scout: "Recruitment Scout",
  administrator: "Stable Secretary",
};

const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  oyakata: "The head of the stable, overseeing all operations.",
  assistant_oyakata: "Focuses on general training and stable discipline.",
  technique_coach: "Improves technical skill gains during practice.",
  conditioning_coach: "Enhances physical attribute growth and stamina.",
  nutritionist: "Optimizes chanko-nabe for weight and health.",
  medical_staff: "Reduces injury severity and speeds up recovery.",
  scout: "Finds and assesses better prospects in the talent pool.",
  administrator: "Reduces costs and manages institutional relationships.",
};

const BAND_COLORS: Record<string, string> = {
  monstrous: "text-primary",
  dominant: "text-primary",
  great: "text-success",
  strong: "text-success",
  serviceable: "text-west",
  limited: "text-warning",
  feeble: "text-destructive",
  respectable: "text-success",
  respected: "text-success",
  renowned: "text-primary",
  legendary: "text-primary",
  devoted: "text-success",
  unshakable: "text-primary",
};

export default function StaffPage() {
  const { state } = useGame();
  const sendCommand = useGameStore((s) => s.sendCommand);
  const [isRecruitOpen, setIsRecruitOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<StaffRole>("assistant_oyakata");

  const world = state.world;

  const hasWorld = useRequireWorld();

  const heya = world ? getPlayerHeya(world) : undefined;

  const staffList = useMemo(() => {
    if (!world || !heya) return [];
    const list: Staff[] = [];
    for (const id of heya.staffIds || []) {
      const staffMember = world.staff.get(id);
      if (staffMember) list.push(staffMember);
    }
    return list;
  }, [world, heya]);

  const handleHire = useCallback(() => {
    if (!world || !heya) return;

    if (staffList.length >= 12) {
      toast.error("Staff capacity reached (12/12). Fire someone first.");
      return;
    }

    sendCommand({ type: "HIRE_STAFF", heyaId: heya.id, role: selectedRole });
    setIsRecruitOpen(false);
    toast.success(`Hired new ${ROLE_LABELS[selectedRole]}`);
  }, [heya, selectedRole, staffList.length, sendCommand, world]);

  const handleFire = useCallback(
    (staffId: string) => {
      if (!world || !heya) return;

      const staff = world.staff.get(staffId);
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
        {/* Header Summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mb-1">
                Monthly Cost
              </div>
              <div className="text-lg font-bold leading-none">
                ¥{(staffList.length * 150000).toLocaleString()}
              </div>
            </div>
            <div className="h-10 w-px bg-border/50 mx-2" />
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mb-1">
                Staff Capacity
              </div>
              <div className="text-lg font-bold leading-none">{staffList.length} / 12</div>
            </div>
          </div>
        </div>

        {/* Staff Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {staffList.map((staff) => (
            <StaffCard key={staff.id} staff={staff} onFire={handleFire} />
          ))}

          {/* Recruit Slot */}
          {staffList.length < 12 && (
            <Dialog open={isRecruitOpen} onOpenChange={setIsRecruitOpen}>
              <DialogTrigger asChild>
                <TooltipWrap
                  content="Hire a new specialist to improve your stable's performance"
                  side="top"
                >
                  <button
                    aria-label="Recruit Specialist"
                    className="flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed border-border/50 bg-muted/20 hover:bg-muted/30 hover:border-primary/50 transition-all group min-h-[220px]"
                  >
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
                      <UserPlus className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-bold text-lg">Recruit Specialist</h3>
                    <p className="text-xs text-muted-foreground text-center max-w-[200px] mt-1">
                      Hire a new specialist to improve stable performance.
                    </p>
                  </button>
                </TooltipWrap>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Recruit Staff Member</DialogTitle>
                  <DialogDescription>
                    Hiring a specialist costs ¥500,000 upfront. Choose the role that fits your
                    current needs.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Specialty Role</label>
                    <Select
                      value={selectedRole}
                      onValueChange={(v) => setSelectedRole(v as StaffRole)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ROLE_LABELS) as StaffRole[])
                          .filter((r) => r !== "oyakata")
                          .map((role) => (
                            <SelectItem key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-sm font-medium text-foreground mb-1">
                      {ROLE_LABELS[selectedRole]}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {ROLE_DESCRIPTIONS[selectedRole]}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleHire} className="w-full">
                    Confirm Hire (¥500,000)
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function StaffCard({ staff, onFire }: { staff: Staff; onFire: (id: string) => void }) {
  const primaryColor =
    BAND_COLORS[staff.competenceBands.primary.toLowerCase()] || "text-muted-foreground";

  const bonusText = useMemo(() => {
    const roleDescriptions: Record<StaffRole, string> = {
      oyakata: "Stable Management",
      assistant_oyakata: "All-rounder training support",
      technique_coach: "Accelerates Skill/Technique gains",
      conditioning_coach: "Accelerates Physical/Stamina gains",
      nutritionist: "Weight management & Health",
      medical_staff: "Accelerates Injury recovery",
      scout: "Improved talent discovery",
      administrator: "Reduces overhead costs",
    };

    const competenceLabels: Record<string, string> = {
      monstrous: "+50%",
      dominant: "+30%",
      great: "+20%",
      strong: "+15%",
      serviceable: "+10%",
      limited: "+5%",
      feeble: "+1%",
    };

    const value = competenceLabels[staff.competenceBands.primary.toLowerCase()] || "??";
    return `${roleDescriptions[staff.role]}: ${value}`;
  }, [staff]);

  return (
    <Card className="paper relative overflow-hidden group">
      <div
        className={cn("absolute top-0 left-0 w-1 h-full", primaryColor.replace("text-", "bg-"))}
      />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center border border-border/50">
              <Briefcase className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">{staff.name}</CardTitle>
              <CardDescription className="font-bold uppercase tracking-tighter text-[10px] text-primary/80">
                {ROLE_LABELS[staff.role]}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] capitalize">
              {staff.careerPhase}
            </Badge>
            {staff.role !== "oyakata" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100 focus-visible:ring-2"
                    aria-label={`Fire ${staff.name}`}
                    tooltip={`Fire ${staff.name}`}
                    tooltipSide="top"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove {staff.name} from your stable. You cannot undo
                      this action.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onFire(staff.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Fire {staff.name}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <TooltipWrap content={bonusText}>
              <div className="space-y-1 cursor-help">
                <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70 flex items-center gap-1.5">
                  <Zap className="h-3 w-3" /> Competence
                </span>
                <div className={cn("text-xs font-bold leading-none", primaryColor)}>
                  {staff.competenceBands.primary.toUpperCase()}
                </div>
              </div>
            </TooltipWrap>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70 flex items-center gap-1.5">
                <Award className="h-3 w-3" /> Reputation
              </span>
              <div
                className={cn(
                  "text-xs font-bold leading-none",
                  BAND_COLORS[staff.reputationBand.toLowerCase()]
                )}
              >
                {staff.reputationBand.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70 flex items-center gap-1.5">
                <Heart className="h-3 w-3" /> Loyalty
              </span>
              <div
                className={cn(
                  "text-xs font-bold leading-none",
                  BAND_COLORS[staff.loyaltyBand.toLowerCase()]
                )}
              >
                {staff.loyaltyBand.toUpperCase()}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70 flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3" /> Tenure
              </span>
              <div className="text-xs font-bold leading-none">{staff.yearsAtBeya} YEARS</div>
            </div>
          </div>
        </div>

        <Separator className="bg-border/30" />

        <div className="grid grid-cols-2 gap-6 pt-1">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Fatigue</span>
              <span
                className={cn(
                  toFatigueBand(staff.fatigue) === "spent" ||
                    toFatigueBand(staff.fatigue) === "exhausted" ||
                    toFatigueBand(staff.fatigue) === "worn"
                    ? "text-destructive"
                    : "text-foreground"
                )}
              >
                {FATIGUE_LABELS[toFatigueBand(staff.fatigue)]}
              </span>
            </div>
            <Progress value={staff.fatigue} className="h-1" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Scandal</span>
              <span className={cn(staff.scandalExposure > 50 ? "text-warning" : "text-foreground")}>
                {SCANDAL_LABELS[toScandalBand(staff.scandalExposure)]}
              </span>
            </div>
            <Progress value={staff.scandalExposure} className="h-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
