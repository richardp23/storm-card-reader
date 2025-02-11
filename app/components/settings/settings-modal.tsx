import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { AutoSaveToggle } from "./auto-save-toggle";
import { useSettingsStore } from "@/app/lib/storage/settings-store";
import { useIsTauri } from "@/app/lib/hooks/use-is-tauri";
import { X } from "lucide-react";
import { Button } from "@/app/components/ui/button";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const isTauri = useIsTauri();
  const { directEdit, setDirectEdit } = useSettingsStore();

  if (!isTauri) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-gray-900 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
        <DialogHeader className="relative flex flex-row items-center justify-between">
          <DialogTitle>Settings</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Direct Edit Mode Toggle */}
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={directEdit}
                  onChange={(e) => setDirectEdit(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Direct Edit Mode {directEdit ? 'On' : 'Off'}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-14">
              {directEdit 
                ? "Changes are written directly to the source file" 
                : "Changes are kept in memory until exported"}
            </p>
          </div>

          {/* Auto Save Toggle - Only enabled when Direct Edit is off */}
          <div className={`bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg ${directEdit ? "opacity-50" : ""}`}>
            <AutoSaveToggle />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 