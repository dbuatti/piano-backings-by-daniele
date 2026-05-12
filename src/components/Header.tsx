"use client";

import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, LogIn, Music, Shield, User, X, Home, Info, Phone, Mail, TestTube, Upload, Settings, AlertCircle, Plane, ShoppingCart, HelpCircle } from "lucide-react";
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
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, user } = useAdmin();

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
    <header className="bg-[#FF00B3] text-white shadow-lg sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center group">
              <img 
                className="h-12 md:h-16 w-auto rounded-xl shadow-md group-hover:scale-105 transition-transform duration-300" 
                src="/pasted-image-2025-09-19T05-15-20-729Z.png" 
                alt="Piano Backings By Daniele Logo"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-2">
            <Link to="/form-page">
              <Button 
                className={cn(
                  "px-5 py-2.5 rounded-full text-sm font-black transition-all duration-300",
                  "bg-white text-[#FF00B3] hover:bg-gray-100 hover:text-[#1C0357]",
                  "border-2 border-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0",
                  "transform"
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
                  "text-white hover:bg-white/20 flex items-center px-4 rounded-full font-bold",
                  isActive('/shop') && "bg-white/20 shadow-inner"
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
                  "text-white hover:bg-white/20 flex items-center px-4 rounded-full font-bold",
                  isActive('/about') && "bg-white/20 shadow-inner"
                )}
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                About & FAQ
              </Button>
            </Link>

            {user && (
              <Link to="/user-dashboard">
                <Button 
                  variant="ghost" 
                  className={cn(
                    "text-white hover:bg-white/20 flex items-center px-4 rounded-full font-bold",
                    isActive('/user-dashboard') && "bg-white/20 shadow-inner"
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
                      "text-white hover:bg-white/20 flex items-center px-4 rounded-full font-bold",
                      location.pathname.startsWith('/admin') && "bg-white/20 shadow-inner"
                    )}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Admin <Settings className="ml-1 h-3 w-3 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 rounded-2xl shadow-2xl border-none p-2">
                  <DropdownMenuLabel className="px-3 py-2 text-xs font-black uppercase tracking-widest text-gray-400">Admin Tools</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem asChild className="rounded-xl focus:bg-[#D1AAF2]/20 focus:text-[#1C0357] cursor-pointer">
                    <Link to="/admin" className="flex items-center w-full py-2">
                      <Shield className="mr-3 h-4 w-4" />
                      Admin Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl focus:bg-[#D1AAF2]/20 focus:text-[#1C0357] cursor-pointer">
                    <Link to="/admin?tab=issue-reports" className="flex items-center w-full py-2">
                      <AlertCircle className="mr-3 h-4 w-4" />
                      Issue Reports
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl focus:bg-[#D1AAF2]/20 focus:text-[#1C0357] cursor-pointer">
                    <Link to="/admin?tab=system-config" className="flex items-center w-full py-2">
                      <Settings className="mr-3 h-4 w-4" />
                      App Settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {user ? (
              <Button 
                onClick={handleLogout}
                variant="ghost" 
                className="text-white hover:bg-white/20 flex items-center px-4 rounded-full font-bold"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Logout
              </Button>
            ) : (
              <Link to="/login">
                <Button 
                  variant="ghost" 
                  className={cn(
                    "text-white hover:bg-white/20 flex items-center px-4 rounded-full font-bold",
                    isActive('/login') && "bg-white/20 shadow-inner"
                  )}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </Button>
              </Link>
            )}
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20 rounded-full"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open menu</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" 
            onClick={() => setMobileMenuOpen(false)}
          />
          
          <div className="fixed inset-y-0 right-0 max-w-full flex">
            <div className="relative w-screen max-w-xs transform transition-transform duration-300 ease-in-out">
              <div className="h-full flex flex-col bg-[#FF00B3] shadow-2xl">
                <div className="px-6 py-6 bg-[#1C0357]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <img 
                        className="h-10 w-auto rounded-xl shadow-lg" 
                        src="/pasted-image-2025-09-19T05-15-20-729Z.png" 
                        alt="Piano Backings By Daniele Logo"
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-white hover:bg-white/20 rounded-full"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <X className="h-6 w-6" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto py-8 px-6">
                  <nav className="space-y-2">
                    <div className="pb-6">
                      <Link 
                        to="/form-page"
                        className={cn(
                          "block w-full px-6 py-4 rounded-2xl text-lg font-black text-center flex items-center justify-center shadow-xl",
                          "bg-white text-[#FF00B3] hover:bg-gray-100 active:scale-95 transition-all"
                        )}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Music className="mr-3 h-6 w-6" />
                        Order Track
                      </Link>
                    </div>

                    <Link 
                      to="/shop"
                      className={cn(
                        "block px-6 py-4 rounded-2xl text-lg font-bold flex items-center transition-colors",
                        isActive('/shop') ? "bg-white/20 text-white" : "text-white/90 hover:bg-white/10"
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <ShoppingCart className="mr-4 h-6 w-6" />
                      Shop
                    </Link>

                    <Link 
                      to="/about"
                      className={cn(
                        "block px-6 py-4 rounded-2xl text-lg font-bold flex items-center transition-colors",
                        isActive('/about') ? "bg-white/20 text-white" : "text-white/90 hover:bg-white/10"
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <HelpCircle className="mr-4 h-6 w-6" />
                      About & FAQ
                    </Link>
                    
                    {user && (
                      <Link 
                        to="/user-dashboard"
                        className={cn(
                          "block px-6 py-4 rounded-2xl text-lg font-bold flex items-center transition-colors",
                          isActive('/user-dashboard') ? "bg-white/20 text-white" : "text-white/90 hover:bg-white/10"
                        )}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <User className="mr-4 h-6 w-6" />
                        My Tracks
                      </Link>
                    )}
                    
                    {isAdmin && (
                      <div className="pt-4 mt-4 border-t border-white/20">
                        <h3 className="text-white/50 font-black text-xs uppercase tracking-[0.2em] mb-4 px-6">Admin Tools</h3>
                        <Link 
                          to="/admin"
                          className={cn(
                            "block px-6 py-4 rounded-2xl text-lg font-bold flex items-center transition-colors",
                            location.pathname.startsWith('/admin') ? "bg-white/20 text-white" : "text-white/90 hover:bg-white/10"
                          )}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Shield className="mr-4 h-6 w-6" />
                          Dashboard
                        </Link>
                      </div>
                    )}
                    
                    <div className="pt-4 mt-4 border-t border-white/20">
                      {user ? (
                        <Button 
                          onClick={handleLogout}
                          variant="ghost" 
                          className="w-full justify-start px-6 py-4 text-lg font-bold text-white hover:bg-white/10 rounded-2xl flex items-center"
                        >
                          <LogIn className="mr-4 h-6 w-6" />
                          Logout
                        </Button>
                      ) : (
                        <Link 
                          to="/login"
                          className={cn(
                            "block px-6 py-4 rounded-2xl text-lg font-bold flex items-center transition-colors",
                            isActive('/login') ? "bg-white/20 text-white" : "text-white/90 hover:bg-white/10"
                          )}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <LogIn className="mr-4 h-6 w-6" />
                          Login
                        </Link>
                      )}
                    </div>
                  </nav>
                </div>
                
                <div className="border-t border-white/20 py-8 px-6">
                  <div className="text-center text-sm text-white/60 font-medium">
                    © {new Date().getFullYear()} Piano Backings By Daniele
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;