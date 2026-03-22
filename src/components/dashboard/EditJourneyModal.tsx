import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

interface Journey {
    id: string;
    title: string;
    description?: string;
    status: string;
}

interface EditJourneyModalProps {
    journey: Journey | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

const EditJourneyModal = ({ journey, open, onOpenChange, onSuccess }: EditJourneyModalProps) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("active");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (journey) {
            setTitle(journey.title);
            setDescription(journey.description || "");
            setStatus(journey.status || "active");
        }
    }, [journey]);

    const handleSave = async () => {
        if (!journey) return;
        if (!title.trim()) {
            toast({ title: "Title is required", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from("learning_journeys")
                .update({
                    title,
                    description,
                    status,
                    updated_at: new Date().toISOString(),
                } as any)
                .eq("id", journey.id);

            if (error) throw error;

            toast({ title: "Journey updated successfully!" });
            onSuccess();
            onOpenChange(false);
        } catch (e: any) {
            toast({ title: "Update failed", description: e.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Learning Journey</DialogTitle>
                    <DialogDescription>Update the details of your learning journey.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Journey title"
                            className="rounded-xl"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of your goals"
                            className="rounded-xl min-h-[100px]"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="paused">Paused</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter className="flex gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl flex-1 sm:flex-none">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2 flex-1 sm:flex-none">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EditJourneyModal;
