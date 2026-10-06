import { toast } from "@/components/ui/use-toast";

export function notifySuccess(title, description) {
  toast({ title, description, variant: "default" });
}

export function notifyError(title, description) {
  toast({ title, description, variant: "destructive" });
}

export function notifySaved(what) {
  toast({ title: `${what} saved`, variant: "default" });
}