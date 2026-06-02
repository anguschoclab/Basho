// Sidebar barrel — implementation decomposed into sidebar/ directory.

export { useSidebar, SidebarProvider } from "./sidebar/provider";
export {
  Sidebar,
  SidebarTrigger,
  SidebarRail,
  SidebarInset,
} from "./sidebar/core";
export {
  SidebarInput,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  SidebarContent,
} from "./sidebar/primitives";
export {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarGroupContent,
} from "./sidebar/group";
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
} from "./sidebar/menu";
