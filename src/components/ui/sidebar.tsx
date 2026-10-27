// Sidebar barrel — implementation decomposed into sidebar/ directory.

export { useSidebar } from "@/components/ui/sidebar/context";
export {
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_MOBILE,
  SIDEBAR_WIDTH_ICON,
  SIDEBAR_COOKIE_NAME,
  SIDEBAR_COOKIE_MAX_AGE,
} from "@/components/ui/sidebar/constants";
export { SidebarProvider } from "@/components/ui/sidebar/provider";
export { Sidebar, SidebarTrigger, SidebarRail, SidebarInset } from "@/components/ui/sidebar/core";
export {
  SidebarInput,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  SidebarContent,
} from "@/components/ui/sidebar/primitives";
export {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarGroupContent,
} from "@/components/ui/sidebar/group";
export {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar/menu";
