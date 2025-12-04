import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Plus, 
  Trash2, 
  Scale,
  Building2,
  IndianRupee,
  Trophy,
  Calendar
} from "lucide-react";

interface JobOffer {
  id: string;
  company: string;
  role: string;
  base_salary: number;
  bonus: number;
  equity: string | null;
  benefits: string[];
  location: string | null;
  remote_policy: string | null;
  offer_deadline: string | null;
  status: string;
}

export const OfferComparison = () => {
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newOffer, setNewOffer] = useState({
    company: "",
    role: "",
    base_salary: "",
    bonus: "",
    equity: "",
    benefits: "",
    location: "",
    remote_policy: "hybrid",
    offer_deadline: "",
    notes: "",
  });

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("job_offers")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error("Error fetching offers:", error);
      toast.error("Failed to load offers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddOffer = async () => {
    if (!newOffer.company || !newOffer.role || !newOffer.base_salary) {
      toast.error("Please fill in company, role, and base salary");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in first");
        return;
      }

      const { error } = await supabase.from("job_offers").insert({
        user_id: user.id,
        company: newOffer.company,
        role: newOffer.role,
        base_salary: parseFloat(newOffer.base_salary),
        bonus: newOffer.bonus ? parseFloat(newOffer.bonus) : 0,
        equity: newOffer.equity || null,
        benefits: newOffer.benefits.split(",").map(b => b.trim()).filter(Boolean),
        location: newOffer.location || null,
        remote_policy: newOffer.remote_policy,
        offer_deadline: newOffer.offer_deadline || null,
        notes: newOffer.notes || null,
      });

      if (error) throw error;

      toast.success("Offer added successfully!");
      setIsDialogOpen(false);
      setNewOffer({
        company: "",
        role: "",
        base_salary: "",
        bonus: "",
        equity: "",
        benefits: "",
        location: "",
        remote_policy: "hybrid",
        offer_deadline: "",
        notes: "",
      });
      fetchOffers();
    } catch (error) {
      console.error("Error adding offer:", error);
      toast.error("Failed to add offer");
    }
  };

  const handleDeleteOffer = async (id: string) => {
    try {
      const { error } = await supabase.from("job_offers").delete().eq("id", id);
      if (error) throw error;
      
      toast.success("Offer removed");
      fetchOffers();
    } catch (error) {
      console.error("Error deleting offer:", error);
      toast.error("Failed to delete offer");
    }
  };

  const formatSalary = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)} LPA`;
    }
    return `₹${amount.toLocaleString()}`;
  };

  const getTotalComp = (offer: JobOffer) => {
    return offer.base_salary + (offer.bonus || 0);
  };

  const getBestOffer = () => {
    if (offers.length === 0) return null;
    return offers.reduce((best, current) => 
      getTotalComp(current) > getTotalComp(best) ? current : best
    );
  };

  const bestOffer = getBestOffer();

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Compare Offers
          </h2>
          <p className="text-sm text-muted-foreground">
            Add your job offers to compare them side by side
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Offer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Job Offer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company *</Label>
                  <Input
                    placeholder="e.g., Google"
                    value={newOffer.company}
                    onChange={(e) => setNewOffer({ ...newOffer, company: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role *</Label>
                  <Input
                    placeholder="e.g., Software Engineer"
                    value={newOffer.role}
                    onChange={(e) => setNewOffer({ ...newOffer, role: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Base Salary (Annual) *</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 1500000"
                    value={newOffer.base_salary}
                    onChange={(e) => setNewOffer({ ...newOffer, base_salary: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bonus (Annual)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 200000"
                    value={newOffer.bonus}
                    onChange={(e) => setNewOffer({ ...newOffer, bonus: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Equity/Stock Options</Label>
                <Input
                  placeholder="e.g., 50000 RSUs over 4 years"
                  value={newOffer.equity}
                  onChange={(e) => setNewOffer({ ...newOffer, equity: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g., Bangalore"
                    value={newOffer.location}
                    onChange={(e) => setNewOffer({ ...newOffer, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Remote Policy</Label>
                  <Select
                    value={newOffer.remote_policy}
                    onValueChange={(value) => setNewOffer({ ...newOffer, remote_policy: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remote">Fully Remote</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="onsite">On-site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Benefits (comma-separated)</Label>
                <Input
                  placeholder="e.g., Health Insurance, 401k, Gym"
                  value={newOffer.benefits}
                  onChange={(e) => setNewOffer({ ...newOffer, benefits: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Offer Deadline</Label>
                <Input
                  type="date"
                  value={newOffer.offer_deadline}
                  onChange={(e) => setNewOffer({ ...newOffer, offer_deadline: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Any additional notes..."
                  value={newOffer.notes}
                  onChange={(e) => setNewOffer({ ...newOffer, notes: e.target.value })}
                />
              </div>

              <Button onClick={handleAddOffer} className="w-full">
                Add Offer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Offers Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading offers...
        </div>
      ) : offers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Scale className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold mb-2">No offers yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your job offers to compare compensation packages
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Offer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer) => (
            <Card 
              key={offer.id} 
              className={`relative ${bestOffer?.id === offer.id ? "border-primary ring-2 ring-primary/20" : ""}`}
            >
              {bestOffer?.id === offer.id && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="gap-1 bg-primary">
                    <Trophy className="h-3 w-3" />
                    Best Offer
                  </Badge>
                </div>
              )}
              
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {offer.company}
                    </CardTitle>
                    <CardDescription>{offer.role}</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteOffer(offer.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Total Comp */}
                <div className="p-3 rounded-lg bg-primary/10">
                  <p className="text-xs text-muted-foreground mb-1">Total Compensation</p>
                  <p className="text-2xl font-bold text-primary flex items-center">
                    <IndianRupee className="h-5 w-5" />
                    {formatSalary(getTotalComp(offer))}
                  </p>
                </div>

                {/* Breakdown */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base Salary</span>
                    <span className="font-medium">{formatSalary(offer.base_salary)}</span>
                  </div>
                  {offer.bonus > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bonus</span>
                      <span className="font-medium">{formatSalary(offer.bonus)}</span>
                    </div>
                  )}
                  {offer.equity && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Equity</span>
                      <span className="font-medium text-right text-xs">{offer.equity}</span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex flex-wrap gap-1">
                  {offer.location && (
                    <Badge variant="outline" className="text-xs">
                      {offer.location}
                    </Badge>
                  )}
                  {offer.remote_policy && (
                    <Badge variant="secondary" className="text-xs">
                      {offer.remote_policy}
                    </Badge>
                  )}
                </div>

                {/* Benefits */}
                {offer.benefits && offer.benefits.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {offer.benefits.slice(0, 3).map((benefit, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {benefit}
                      </Badge>
                    ))}
                    {offer.benefits.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{offer.benefits.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* Deadline */}
                {offer.offer_deadline && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Deadline: {new Date(offer.offer_deadline).toLocaleDateString()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
