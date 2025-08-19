"use client";

import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, LogIn, Music, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const menuItems = [
  { name: "Home", href: "/" },
  { name: "About", href: "/#about" },
  { name: "Services", href: "/#services" },
  { name: "Pricing", href: "/#pricing" },
  { name: "Contact", href: "/#contact" },
  { name: "Tips", href: "/#tips" },
  { name: "Support", href: "/#support" },
  { name: "Order Track", href: "/form-page" },
];

const Header = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();
  const [session, setSession] = React.useState<any>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session) {
        // Check if user is admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.email === 'daniele.buatti@gmail.com') {
          setIsAdmin(true);
        }
      }
    };
    
    checkSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      
      if (session) {
        // Check if user is admin
        const checkAdmin = async () => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', session.user.id)
            .single();
          
          if (profile?.email === 'daniele.buatti@gmail.com') {
            setIsAdmin(true);
          } else {
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
    await supabase.auth.signOut();
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
  };

  return (
    <header className="bg-[#FF00B3] text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/">
              <img className="h-16 w-auto" src="/logo.jpeg" alt="Piano Backings By Daniele Logo" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {menuItems.map((item) => (
              item.name === "Order Track" ? (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "font-bold text-lg px-4 py-2 rounded-full transition-all",
                    "bg-white text-[#FF00B3] hover:bg-gray-100 hover:text-[#1C0357]",
                    "border-2 border-white shadow-lg hover:shadow-xl",
                    "transform hover:scale-105 transition-transform duration-200"
                  )}
                >
                  <Music className="inline mr-2 h-5 w-5" />
                  {item.name}
                </Link>
              ) : (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={(e) => handleAnchorLink(item.href, e)}
                  className={cn(
                    "font-medium text-lg transition-colors hover:text-gray-200",
                    location.pathname === item.href.split('#')[0] && (location.hash === `#${item.href.split('#')[1]}` || !item.href.includes('#')) 
                      ? "border-b-2 border-white" 
                      : ""
                  )}
                >
                  {item.name}
                </a>
              )
            ))}
            {isAdmin && (
              <Link to="/admin">
                <Button 
                  variant="ghost" 
                  className="hover:bg-white/20 text-white font-medium text-lg flex items-center"
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
                className="hover:bg-white/20 text-white font-medium text-lg"
              >
                Logout
              </Button>
            ) : (
              <Link to="/login">
                <Button 
                  variant="ghost" 
                  className="hover:bg-white/20 text-white font-medium text-lg"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </Button>
              </Link>
            )}
          </nav>

          {/* Mobile Navigation Trigger */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-white/20 text-white">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-[#FF00B3] text-white border-l-0">
                <nav className="flex flex-col gap-6 mt-12">
                  {menuItems.map((item) => (
                    item.name === "Order Track" ? (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "font-bold text-xl px-4 py-3 rounded-full transition-all",
                          "bg-white text-[#FF00B3] hover:bg-gray-100 hover:text-[#1C0357]",
                          "border-2 border-white shadow-lg",
                          "text-center"
                        )}
                      >
                        <Music className="inline mr-2 h-5 w-5" />
                        {item.name}
                      </Link>
                    ) : (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={(e) => {
                          handleAnchorLink(item.href, e);
                          setIsOpen(false);
                        }}
                        className="text-2xl font-semibold py-2 px-4 rounded-lg hover:bg-white/20 transition-colors"
                      >
                        {item.name}
                      </a>
                    )
                  ))}
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setIsOpen(false)}
                      className="text-2xl font-semibold py-2 px-4 rounded-lg hover:bg-white/20 transition-colors flex items-center"
                    >
                      <Shield className="mr-2 h-6 w-6" />
                      Admin Dashboard
                    </Link>
                  )}
                  {session ? (
                    <Button 
                      onClick={handleLogout}
                      variant="ghost" 
                      className="justify-start hover:bg-white/20 text-white font-medium text-2xl"
                    >
                      Logout
                    </Button>
                  ) : (
                    <Link to="/login">
                      <Button 
                        variant="ghost" 
                        className="justify-start hover:bg-white/20 text-white font-medium text-2xl"
                        onClick={() => setIsOpen(false)}
                      >
                        <LogIn className="mr-2 h-6 w-6" />
                        Login
                      </Button>
                    </Link>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;