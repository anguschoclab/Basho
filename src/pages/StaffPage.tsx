import { useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Zap, 
  Heart, 
  Award, 
  AlertCircle,
  Briefcase
} from "lucide-react";
import type { Staff, StaffRole } from "@/engine/types/staff";

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

const BAND_COLORS: Record<string, string> = {
  monstrous: "text-purple-500",
  dominant: "text-primary",
  great: "text-emerald-500",
  strong: "text-green-500",
  serviceable: "text-blue-500",
  limited: "text-orange-500",
  feeble: "text-red-500",
  respectable: "text-emerald-500",
  respected: "text-emerald-500",
  renowned: "text-primary",
  legendary: "text-purple-500",
  devoted: "text-emerald-500",
  unshakable: "text-purple-500",
};

export default function StaffPage() {
  const { state } = useGame();
  const world = state.world;
  const heya = world?.heyas.get(state.playerHeyaId || "");

  const staffList = useMemo(() => {
    if (!world || !heya) return [];
    return (heya.staffIds || [])
      .map(id => world.staff.get(id))
      .filter(Boolean) as Staff[];
  }, [world, heya]);

  const managementTabs = [
    { id: "stable", label: "Overview", href: "/stable" },
    { id: "roster", label: "Roster", href: "/stable/roster" },
    { id: "training", label: "Training", href: "/stable/training" },
    { id: "medical", label: "Medical", href: "/stable/medical" },
    { id: "staff", label: "Staff", href: "/stable/staff" },
  ];

  if (!heya) return null;

  return (
    <AppLayout subNavTabs={managementTabs} activeSubTab="staff">
      <div className="space-y-6">
        {/* Header Summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Staff Management</h1>
            <p className="text-sm text-muted-foreground">Manage the specialists who shape your heya's future.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mb-1">Total Maintenance</div>
              <div className="text-lg font-bold leading-none">¥1,450,000 / mo</div>
            </div>
            <div className="h-10 w-px bg-border/50 mx-2" />
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mb-1">Staff Capacity</div>
              <div className="text-lg font-bold leading-none">{staffList.length} / 12</div>
            </div>
          </div>
        </div>

        {/* Staff Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {staffList.map((staff) => (
            <StaffCard key={staff.id} staff={staff} />
          ))}

          {/* Recruit Slot */}
          <button className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-border/50 bg-muted/20 hover:bg-muted/30 hover:border-primary/50 transition-all group min-h-[220px]">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-bold text-lg">Recruit Specialist</h3>
            <p className="text-xs text-muted-foreground text-center max-w-[200px] mt-1">Available vacancies based on Stable Stature.</p>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

function StaffCard({ staff }: { staff: Staff }) {
  const primaryColor = BAND_COLORS[staff.competenceBands.primary.toLowerCase()] || "text-muted-foreground";
  
  return (
    <Card className="paper relative overflow-hidden group">
      <div className={cn("absolute top-0 left-0 w-1 h-full", primaryColor.replace("text-", "bg-"))} />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center border border-border/50">
              <Briefcase className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">{staff.name}</CardTitle>
              <CardDescription className="font-bold uppercase tracking-tighter text-[10px] text-primary/80">
                {ROLE_LABELS[staff.role]}
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px] capitalize">{staff.careerPhase}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
             <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70 flex items-center gap-1.5">
                  <Zap className="h-3 w-3" /> Competence
                </span>
                <div className={cn("text-xs font-bold leading-none", primaryColor)}>
                  {staff.competenceBands.primary.toUpperCase()}
                </div>
             </div>
             <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70 flex items-center gap-1.5">
                  <Award className="h-3 w-3" /> Reputation
                </span>
                <div className={cn("text-xs font-bold leading-none", BAND_COLORS[staff.reputationBand.toLowerCase()])}>
                  {staff.reputationBand.toUpperCase()}
                </div>
             </div>
          </div>

          <div className="space-y-3">
             <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70 flex items-center gap-1.5">
                  <Heart className="h-3 w-3" /> Loyalty
                </span>
                <div className={cn("text-xs font-bold leading-none", BAND_COLORS[staff.loyaltyBand.toLowerCase()])}>
                  {staff.loyaltyBand.toUpperCase()}
                </div>
             </div>
             <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70 flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3" /> Tenure
                </span>
                <div className="text-xs font-bold leading-none">
                  {staff.yearsAtBeya} YEARS
                </div>
             </div>
          </div>
        </div>

        <Separator className="bg-border/30" />

        <div className="grid grid-cols-2 gap-6 pt-1">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Fatigue</span>
              <span className={cn(staff.fatigue > 70 ? "text-destructive" : "text-foreground")}>{staff.fatigue}%</span>
            </div>
            <Progress value={staff.fatigue} className="h-1" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Scandal</span>
              <span className={cn(staff.scandalExposure > 50 ? "text-warning" : "text-foreground")}>{staff.scandalExposure}%</span>
            </div>
            <Progress value={staff.scandalExposure} className="h-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

