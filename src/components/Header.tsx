"use client";

import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, LogIn } from "lucide-react";
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

  React.useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };
    
    checkSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "font-medium text-lg transition-colors hover:text-gray-200",
                  location.pathname === item.href.split('#')[0] && (location.hash === item.href.split('#')[1] || !item.href.includes('#')) 
                    ? "border-b-2 border-white" 
                    : ""
                )}
              >
                {item.name}
              </Link>
            ))}
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
                    <Link
                      key={item.href}
                      to={item.href}
                      className="text-2xl font-semibold py-2 px-4 rounded-lg hover:bg-white/20 transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
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