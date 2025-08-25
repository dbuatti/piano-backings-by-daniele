// This file has been regenerated to resolve a persistent syntax error.
"use client";

import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, LogIn, Music, Shield, User, X, Home, Info, Phone, Mail, TestTube, Upload, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  const [session, setSession] = React.useState<any>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  React.useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session) {
        const adminEmails = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];
        if (adminEmails.includes(session.user.email)) {
          setIsAdmin(true);
        }
      }
    };
    
    checkSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      
      if (session) {
        const adminEmails = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];
        if (adminEmails.includes(session.user.email)) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setIsAdmin(false);
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

  const handleAnchorLink = (href: string, e: React.MouseEvent) => {
    if (href.startsWith('/#') && location.pathname === '/') {
      e.preventDefault();
      const anchor = href.split('#')[1];
      const element = document.getElementById(anchor);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        window.history.replaceState(null, '', `#${anchor}`);
      }
    }
    setMobileMenuOpen(false);
  };

  const menuItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "About", href: "/#about", icon: Info },
    { name: "Services", href: "/#services", icon: Music },
    { name: "Pricing", href: "/#pricing", icon: Music },
    { name: "Contact", href: "/#contact", icon: Phone },
    { name: "Tips", href: "/#tips", icon: Info },
    { name: "Support", href: "/#support", icon: Mail },
  ];

  return (
    <header className="bg-[#FF00B3] text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center">
              <img 
                className="h-16 w-auto rounded-lg border-2 border-white shadow-md" 
                src="/logo.jpeg" 
                alt="Piano Backings By Daniele Logo" 
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={(e) => handleAnchorLink(item.href, e)}
                  className={cn(
                    "px-2 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center",
                    "hover:bg-white/20 hover:text-white",
                    location.pathname === item.href.split('#')[0] && 
                    (location.hash === `#${item.href.split('#')[1]}` || !item.href.includes('#'))
                      ? "bg-white/30 text-white" 
                      : "text-white"
                  )}
                >
                  <Icon className="mr-1 h-4 w-4" />
                  {item.name}
                </a>
              );
            })}
            
            <Link to="/form-page">
              <Button 
                className={cn(
                  "ml-1 px-3 py-2 rounded-full text-sm font-bold transition-all duration-300",
                  "bg-white text-[#FF00B3] hover:bg-gray-100 hover:text-[#1C0357]",
                  "border-2 border-white shadow-lg hover:shadow-xl",
                  "transform hover:scale-105"
                )}
              >
                <Music className="mr-1 h-4 w-4" />
                Order Track
              </Button>
            </Link>
            
            {session && (
              <Link to="/user-dashboard">
                <Button 
                  variant="ghost" 
                  className="ml-1 text-white hover:bg-white/20 flex items-center px-2"
                >
                  <User className="mr-1 h-4 w-4" />
                  My Tracks
                </Button>
              </Link>
            )}
            
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="ml-1 text-white hover:bg-white/20 flex items-center px-2"
                  >
                    <Shield className="mr-1 h-4 w-4" />
                    Admin <Settings className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Admin Tools</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                      <Shield className="mr-2 h-4 w-4" />
                      Admin Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/test-email-notification" onClick={() => setMobileMenuOpen(false)}>
                      <TestTube className="mr-2 h-4 w-4" />
                      Test Email
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/data-importer" onClick={() => setMobileMenuOpen(false)}>
                      <Upload className="mr-2 h-4 w-4" />
                      Import Data
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {session ? (
              <Button 
                onClick={handleLogout}
                variant="ghost" 
                className="ml-1 text-white hover:bg-white/20 flex items-center px-2"
              >
                <LogIn className="mr-1 h-4 w-4" />
                Logout
              </Button>
            ) : (
              <Link to="/login">
                <Button 
                  variant="ghost" 
                  className="ml-1 text-white hover:bg-white/20 flex items-center px-2"
                >
                  <LogIn className="mr-1 h-4 w-4" />
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
              className="text-white hover:bg-white/20"
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
            className="fixed inset-0 bg-black bg-opacity-50" 
            onClick={() => setMobileMenuOpen(false)}
          />
          
          <div className="fixed inset-y-0 right-0 max-w-full flex">
            <div className="relative w-screen max-w-md">
              <div className="h-full flex flex-col bg-[#FF00B3] shadow-xl">
                <div className="px-4 py-6 bg-[#1C0357]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <img 
                        className="h-12 w-auto rounded-lg border-2 border-white" 
                        src="/logo.jpeg" 
                        alt="Piano Backings By Daniele Logo" 
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-white hover:bg-white/20"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <X className="h-6 w-6" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto py-6 px-4 sm:px-6">
                  <nav className="space-y-1">
                    {menuItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <a
                          key={item.name}
                          href={item.href}
                          onClick={(e) => handleAnchorLink(item.href, e)}
                          className={cn(
                            "block px-4 py-3 rounded-md text-base font-medium flex items-center",
                            "text-white hover:bg-white/20"
                          )}
                        >
                          <Icon className="mr-3 h-5 w-5" />
                          {item.name}
                        </a>
                      );
                    })}
                    
                    <div className="pt-4 border-t border-white/20">
                      <Link 
                        to="/form-page"
                        className={cn(
                          "block w-full px-4 py-3 rounded-md text-base font-bold text-center flex items-center justify-center",
                          "bg-white text-[#FF00B3] hover:bg-gray-100"
                        )}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Music className="mr-2 h-5 w-5" />
                        Order Track
                      </Link>
                    </div>
                    
                    {session && (
                      <Link 
                        to="/user-dashboard"
                        className={cn(
                          "block px-4 py-3 rounded-md text-base font-medium flex items-center",
                          "text-white hover:bg-white/20"
                        )}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <User className="mr-3 h-5 w-5" />
                        My Tracks
                      </Link>
                    )}
                    
                    {isAdmin && (
                      <>
                        <h3 className="text-white font-bold text-lg mt-4 mb-2 px-4">Admin Tools</h3>
                        <Link 
                          to="/admin"
                          className={cn(
                            "block px-4 py-3 rounded-md text-base font-medium flex items-center",
                            "text-white hover:bg-white/20"
                          )}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Shield className="mr-3 h-5 w-5" />
                          Admin Dashboard
                        </Link>
                        <Link 
                          to="/test-email-notification"
                          className={cn(
                            "block px-4 py-3 rounded-md text-base font-medium flex items-center",
                            "text-white hover:bg-white/20"
                          )}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <TestTube className="mr-3 h-5 w-5" />
                          Test Email
                        </Link>
                        <Link 
                          to="/data-importer"
                          className={cn(
                            "block px-4 py-3 rounded-md text-base font-medium flex items-center",
                            "text-white hover:bg-white/20"
                          )}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Upload className="mr-3 h-5 w-5" />
                          Import Data
                        </Link>
                      </>
                    )}
                    
                    {session ? (
                      <Button 
                        onClick={handleLogout}
                        variant="ghost" 
                        className="w-full justify-start px-4 py-3 text-base font-medium text-white hover:bg-white/20 flex items-center"
                      >
                        <LogIn className="mr-3 h-5 w-5" />
                        Logout
                      </Button>
                    ) : (
                      <Link 
                        to="/login"
                        className={cn(
                          "block px-4 py-3 rounded-md text-base font-medium flex items-center",
                          "text-white hover:bg-white/20"
                        )}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <LogIn className="mr-3 h-5 w-5" />
                        Login
                      </Link>
                    )}
                  </nav>
                </div>
                
                <div className="border-t border-white/20 py-6 px-4">
                  <div className="text-center text-sm text-white/80">
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