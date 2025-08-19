"use client";

import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, LogIn, Music, Shield, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
        // Check if user is admin
        try {
          // First check if user is admin by email
          if (session.user.email === 'daniele.buatti@gmail.com') {
            setIsAdmin(true);
            return;
          }
          
          // Fallback to checking profiles table
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', session.user.id)
            .single();
          
          if (error) {
            console.error('Error fetching profile:', error);
            return;
          }
          
          if (profile?.email === 'daniele.buatti@gmail.com') {
            setIsAdmin(true);
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
        }
      }
    };
    
    checkSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      
      if (session) {
        // Check if user is admin
        const checkAdmin = async () => {
          try {
            // First check if user is admin by email
            if (session.user.email === 'daniele.buatti@gmail.com') {
              setIsAdmin(true);
              return;
            }
            
            // Fallback to checking profiles table
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', session.user.id)
              .single();
            
            if (error) {
              console.error('Error fetching profile:', error);
              setIsAdmin(false);
              return;
            }
            
            if (profile?.email === 'daniele.buatti@gmail.com') {
              setIsAdmin(true);
            } else {
              setIsAdmin(false);
            }
          } catch (error) {
            console.error('Error checking admin status:', error);
            setIsAdmin(false);
          }
        };
        
        checkAdmin();
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

  // Function to handle anchor link navigation
  const handleAnchorLink = (href: string, e: React.MouseEvent) => {
    // If it's an anchor link on the same page
    if (href.startsWith('/#') && location.pathname === '/') {
      e.preventDefault();
      const anchor = href.split('#')[1];
      const element = document.getElementById(anchor);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        // Update URL without page reload
        window.history.replaceState(null, '', `#${anchor}`);
      }
    }
    setMobileMenuOpen(false);
  };

  const menuItems = [
    { name: "Home", href: "/" },
    { name: "About", href: "/#about" },
    { name: "Services", href: "/#services" },
    { name: "Pricing", href: "/#pricing" },
    { name: "Contact", href: "/#contact" },
    { name: "Tips", href: "/#tips" },
    { name: "Support", href: "/#support" },
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
              <span className="ml-3 hidden md:block text-xl font-bold">Piano Backings</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {menuItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                onClick={(e) => handleAnchorLink(item.href, e)}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200",
                  "hover:bg-white/20 hover:text-white",
                  location.pathname === item.href.split('#')[0] && 
                  (location.hash === `#${item.href.split('#')[1]}` || !item.href.includes('#'))
                    ? "bg-white/30 text-white" 
                    : "text-white"
                )}
              >
                {item.name}
              </a>
            ))}
            
            <Link to="/form-page">
              <Button 
                className={cn(
                  "ml-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-300",
                  "bg-white text-[#FF00B3] hover:bg-gray-100 hover:text-[#1C0357]",
                  "border-2 border-white shadow-lg hover:shadow-xl",
                  "transform hover:scale-105"
                )}
              >
                <Music className="mr-2 h-4 w-4" />
                Order Track
              </Button>
            </Link>
            
            {session && (
              <Link to="/user-dashboard">
                <Button 
                  variant="ghost" 
                  className="ml-2 text-white hover:bg-white/20"
                >
                  <User className="mr-2 h-4 w-4" />
                  My Tracks
                </Button>
              </Link>
            )}
            
            {isAdmin && (
              <Link to="/admin">
                <Button 
                  variant="ghost" 
                  className="ml-2 text-white hover:bg-white/20"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Admin
                </Button>
              </Link>
            )}
            
            {session ? (
              <Button 
                onClick={handleLogout}
                variant="ghost" 
                className="ml-2 text-white hover:bg-white/20"
              >
                Logout
              </Button>
            ) : (
              <Link to="/login">
                <Button 
                  variant="ghost" 
                  className="ml-2 text-white hover:bg-white/20"
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
                      <span className="ml-3 text-xl font-bold text-white">Piano Backings</span>
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
                    {menuItems.map((item) => (
                      <a
                        key={item.name}
                        href={item.href}
                        onClick={(e) => handleAnchorLink(item.href, e)}
                        className={cn(
                          "block px-4 py-3 rounded-md text-base font-medium",
                          "text-white hover:bg-white/20"
                        )}
                      >
                        {item.name}
                      </a>
                    ))}
                    
                    <div className="pt-4 border-t border-white/20">
                      <Link 
                        to="/form-page"
                        className={cn(
                          "block w-full px-4 py-3 rounded-md text-base font-bold text-center",
                          "bg-white text-[#FF00B3] hover:bg-gray-100"
                        )}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Music className="inline mr-2 h-5 w-5" />
                        Order Track
                      </Link>
                    </div>
                    
                    {session && (
                      <Link 
                        to="/user-dashboard"
                        className={cn(
                          "block px-4 py-3 rounded-md text-base font-medium",
                          "text-white hover:bg-white/20 flex items-center"
                        )}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <User className="mr-2 h-5 w-5" />
                        My Tracks
                      </Link>
                    )}
                    
                    {isAdmin && (
                      <Link 
                        to="/admin"
                        className={cn(
                          "block px-4 py-3 rounded-md text-base font-medium",
                          "text-white hover:bg-white/20 flex items-center"
                        )}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Shield className="mr-2 h-5 w-5" />
                        Admin Dashboard
                      </Link>
                    )}
                    
                    {session ? (
                      <Button 
                        onClick={handleLogout}
                        variant="ghost" 
                        className="w-full justify-start px-4 py-3 text-base font-medium text-white hover:bg-white/20"
                      >
                        Logout
                      </Button>
                    ) : (
                      <Link 
                        to="/login"
                        className={cn(
                          "block px-4 py-3 rounded-md text-base font-medium",
                          "text-white hover:bg-white/20 flex items-center"
                        )}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <LogIn className="mr-2 h-5 w-5" />
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