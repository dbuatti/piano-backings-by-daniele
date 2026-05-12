"use client";

import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, LogIn, Music, Shield, User, X, Home, Info, Phone, Mail, TestTube, Upload, Settings, AlertCircle, Plane, ShoppingCart, HelpCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/useAdmin";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, user } = useAdmin();

  // Handle scroll effect
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setMobileMenuOpen(false);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      navigate('/');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out",
        isScrolled 
          ? "bg-white/80 backdrop-blur-lg shadow-md py-2" 
          : "bg-[#FF00B3] py-4"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center group">
              <img 
                className={cn(
                  "h-10 md:h-14 w-auto rounded-xl shadow-md transition-all duration-500",
                  isScrolled ? "scale-90" : "scale-100"
                )} 
                src="/pasted-image-2025-09-19T05-15-20-729Z.png" 
                alt="Piano Backings By Daniele Logo"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link to="/form-page">
              <Button 
                className={cn(
                  "px-6 py-2.5 rounded-full text-sm font-black transition-all duration-300 shadow-lg hover:-translate-y-0.5 active:translate-y-0",
                  isScrolled 
                    ? "bg-[#1C0357] text-white hover:bg-[#2D0B8C]" 
                    : "bg-white text-[#FF00B3] hover:bg-gray-100"
                )}
              >
                <Music className="mr-2 h-4 w-4" />
                Order Track
              </Button>
            </Link>
            
            <Link to="/shop">
              <Button 
                variant="ghost" 
                className={cn(
                  "px-4 rounded-full font-bold transition-colors",
                  isScrolled ? "text-[#1C0357] hover:bg-[#1C0357]/5" : "text-white hover:bg-white/20",
                  isActive('/shop') && (isScrolled ? "bg-[#1C0357]/10" : "bg-white/20")
                )}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Shop
              </Button>
            </Link>

            <Link to="/about">
              <Button 
                variant="ghost" 
                className={cn(
                  "px-4 rounded-full font-bold transition-colors",
                  isScrolled ? "text-[#1C0357] hover:bg-[#1C0357]/5" : "text-white hover:bg-white/20",
                  isActive('/about') && (isScrolled ? "bg-[#1C0357]/10" : "bg-white/20")
                )}
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                About
              </Button>
            </Link>

            {user && (
              <Link to="/user-dashboard">
                <Button 
                  variant="ghost" 
                  className={cn(
                    "px-4 rounded-full font-bold transition-colors",
                    isScrolled ? "text-[#1C0357] hover:bg-[#1C0357]/5" : "text-white hover:bg-white/20",
                    isActive('/user-dashboard') && (isScrolled ? "bg-[#1C0357]/10" : "bg-white/20")
                  )}
                >
                  <User className="mr-2 h-4 w-4" />
                  My Tracks
                </Button>
              </Link>
            )}
            
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className={cn(
                      "px-4 rounded-full font-bold transition-colors",
                      isScrolled ? "text-[#1C0357] hover:bg-[#1C0357]/5" : "text-white hover:bg-white/20",
                      location.pathname.startsWith('/admin') && (isScrolled ? "bg-[#1C0357]/10" : "bg-white/20")
                    )}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Admin
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 rounded-2xl shadow-2xl border-none p-2 mt-2">
                  <DropdownMenuLabel className="px-3 py-2 text-xs font-black uppercase tracking-widest text-gray-400">Management</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                    <Link to="/admin" className="flex items-center w-full py-2">
                      <LayoutDashboard className="mr-3 h-4 w-4" /> Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                    <Link to="/admin?tab=feedback" className="flex items-center w-full py-2">
                      <AlertCircle className="mr-3 h-4 w-4" /> Feedback
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                    <Link to="/admin?tab=operations" className="flex items-center w-full py-2">
                      <Settings className="mr-3 h-4 w-4" /> Settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            <div className="pl-2 border-l border-white/20 ml-2">
              {user ? (
                <Button 
                  onClick={handleLogout}
                  variant="ghost" 
                  size="icon"
                  className={cn(
                    "rounded-full transition-colors",
                    isScrolled ? "text-[#1C0357] hover:bg-[#1C0357]/5" : "text-white hover:bg-white/20"
                  )}
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              ) : (
                <Link to="/login">
                  <Button 
                    variant="ghost" 
                    className={cn(
                      "px-4 rounded-full font-bold transition-colors",
                      isScrolled ? "text-[#1C0357] hover:bg-[#1C0357]/5" : "text-white hover:bg-white/20"
                    )}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </Button>
                </Link>
              )}
            </div>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "rounded-full transition-colors",
                isScrolled ? "text-[#1C0357] hover:bg-[#1C0357]/5" : "text-white hover:bg-white/20"
              )}
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100]">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" 
            onClick={() => setMobileMenuOpen(false)}
          />
          
          <div className="fixed inset-y-0 right-0 w-full max-w-xs transform transition-transform duration-300 ease-in-out">
            <div className="h-full flex flex-col bg-[#1C0357] text-white shadow-2xl">
              <div className="px-6 py-8 flex items-center justify-between border-b border-white/10">
                <img className="h-10 w-auto rounded-xl" src="/pasted-image-2025-09-19T05-15-20-729Z.png" alt="Logo" />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white hover:bg-white/10 rounded-full"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto py-8 px-6">
                <nav className="space-y-4">
                  <Link 
                    to="/form-page"
                    className="flex items-center gap-4 p-4 rounded-2xl bg-[#FF00B3] text-white font-black text-lg shadow-xl active:scale-95 transition-all"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Music className="h-6 w-6" /> Order Track
                  </Link>

                  <Link 
                    to="/shop"
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl font-bold text-lg transition-colors",
                      isActive('/shop') ? "bg-white/10" : "hover:bg-white/5"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <ShoppingCart className="h-6 w-6" /> Shop
                  </Link>

                  <Link 
                    to="/about"
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl font-bold text-lg transition-colors",
                      isActive('/about') ? "bg-white/10" : "hover:bg-white/5"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <HelpCircle className="h-6 w-6" /> About
                  </Link>
                  
                  {user && (
                    <Link 
                      to="/user-dashboard"
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl font-bold text-lg transition-colors",
                        isActive('/user-dashboard') ? "bg-white/10" : "hover:bg-white/5"
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User className="h-6 w-6" /> My Tracks
                    </Link>
                  )}

                  {isAdmin && (
                    <Link 
                      to="/admin"
                      className="flex items-center gap-4 p-4 rounded-2xl font-bold text-lg hover:bg-white/5"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Shield className="h-6 w-6" /> Admin Dashboard
                    </Link>
                  )}
                </nav>
              </div>
              
              <div className="p-6 border-t border-white/10">
                {user ? (
                  <Button 
                    onClick={handleLogout}
                    variant="outline" 
                    className="w-full justify-center py-6 rounded-2xl border-white/20 text-white hover:bg-white/10 font-bold"
                  >
                    <LogOut className="mr-2 h-5 w-5" /> Logout
                  </Button>
                ) : (
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full justify-center py-6 rounded-2xl bg-white text-[#1C0357] hover:bg-gray-100 font-bold">
                      <LogIn className="mr-2 h-5 w-5" /> Login
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

const LayoutDashboard = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />
  </svg>
);

export default Header;