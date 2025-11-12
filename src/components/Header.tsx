import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, LogOut, User, Settings, ShoppingCart, LayoutDashboard, Bell, Music } from "lucide-react"; // Added Music
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { fetchUnreadIssueReportsCount } from "@/utils/admin-helpers"; // Updated import path
import { useHolidayMode } from "@/hooks/useHolidayMode";

const Header: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isHolidayModeActive } = useHolidayMode();

  const { data: unreadCount } = useQuery<number | undefined>({ // Explicitly type unreadCount
    queryKey: ['unreadIssueReportsCount'],
    queryFn: fetchUnreadIssueReportsCount,
    refetchInterval: 30000, // Refetch every 30 seconds
    enabled: isAdmin, // Only fetch if user is admin
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email);
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
        } else {
          setIsAdmin(profile?.is_admin || false);
        }
      } else {
        setUserEmail(null);
        setIsAdmin(false);
      }
    };

    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserEmail(session.user.email);
        // Re-fetch admin status on auth state change
        supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile, error }) => {
            if (error) console.error("Error fetching profile on auth change:", error);
            setIsAdmin(profile?.is_admin || false);
          });
      } else {
        setUserEmail(null);
        setIsAdmin(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError(`Error logging out: ${error.message}`);
    } else {
      showSuccess("Logged out successfully.");
      navigate("/login");
    }
  };

  const navItems = [
    { name: "Home", path: "/" },
    { name: "Request a Backing", path: "/form-page" },
    { name: "Shop", path: "/shop" },
    // { name: "Test Backings", path: "/test-backings" },
    // { name: "Test Email", path: "/test-email" },
    // { name: "Test Dropbox", path: "/test-dropbox" },
    // { name: "Test Dropbox Credentials", path: "/test-dropbox-credentials" },
    // { name: "Dropbox Monitor", path: "/dropbox-monitor" },
    // { name: "Test Email Notification", path: "/test-email-notification" },
    // { name: "Data Importer", path: "/data-importer" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-[#1C0357]">
          <Music className="h-6 w-6" />
          <span>Backing Tracks</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-4">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`text-sm font-medium transition-colors hover:text-[#F538BC] ${
                location.pathname === item.path ? "text-[#F538BC]" : "text-gray-600"
              }`}
            >
              {item.name}
            </Link>
          ))}
          {userEmail && (
            <Link
              to="/user-dashboard"
              className={`text-sm font-medium transition-colors hover:text-[#F538BC] ${
                location.pathname === "/user-dashboard" ? "text-[#F538BC]" : "text-gray-600"
              }`}
            >
              My Dashboard
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/admin"
              className={`text-sm font-medium transition-colors hover:text-[#F538BC] ${
                location.pathname.startsWith("/admin") ? "text-[#F538BC]" : "text-gray-600"
              } flex items-center`}
            >
              Admin
              {unreadCount !== undefined && unreadCount > 0 && ( // Check for undefined and then > 0
                <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                  {unreadCount}
                </span>
              )}
            </Link>
          )}
        </nav>

        {/* User/Auth Controls */}
        <div className="flex items-center gap-4">
          {userEmail ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${userEmail}`} alt="User Avatar" />
                    <AvatarFallback>{userEmail[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userEmail}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {isAdmin ? "Administrator" : "User"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/user-dashboard")}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>My Dashboard</span>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Admin Dashboard</span>
                    {unreadCount !== undefined && unreadCount > 0 && ( // Check for undefined and then > 0
                      <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/login">
              <Button variant="outline" size="sm">Log In</Button>
            </Link>
          )}

          {/* Mobile Navigation Toggle */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <nav className="flex flex-col gap-4 py-6">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`text-lg font-medium hover:text-[#F538BC] ${
                      location.pathname === item.path ? "text-[#F538BC]" : "text-gray-600"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
                {userEmail && (
                  <Link
                    to="/user-dashboard"
                    className={`text-lg font-medium hover:text-[#F538BC] ${
                      location.pathname === "/user-dashboard" ? "text-[#F538BC]" : "text-gray-600"
                    }`}
                  >
                    My Dashboard
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className={`text-lg font-medium hover:text-[#F538BC] ${
                      location.pathname.startsWith("/admin") ? "text-[#F538BC]" : "text-gray-600"
                    } flex items-center`}
                  >
                    Admin
                    {unreadCount !== undefined && unreadCount > 0 && ( // Check for undefined and then > 0
                      <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                )}
                {!userEmail && (
                  <Link to="/login" className="text-lg font-medium hover:text-[#F538BC]">
                    Log In
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;