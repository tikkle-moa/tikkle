import type { LucideIcon } from "lucide-react";

import type { RoutePaths } from "@shared/config/router.config";

export interface MyMenuItem {
  description: string;
  icon: LucideIcon;
  label: string;
  to: RoutePaths;
}
