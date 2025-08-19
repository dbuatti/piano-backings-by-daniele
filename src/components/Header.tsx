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
    <header className="bg-white text-[#1C0357] shadow-md sticky top-0 z-50 border-b-4 border-[#F538BC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/">
              <img className="h-16 w-auto" src="/logo.jpeg" alt="Piano Backings By Daniele Logo" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "font-medium text-lg px-3 py-2 rounded-md transition-colors hover:bg-[#D1AAF2]/50",
                  location.pathname === item.href.split('#')[0] && (location.hash === item.href.split('#')[1] || !item.href.includes('#')) 
                    ? "bg-[#D1AAF2]/30 text-[#1C0357] font-bold" 
                    : "text-[#1C0357]"
                )}
              >
                {item.name}
              </Link>
            ))}
            {session ? (
              <Button 
                onClick={handleLogout}
                variant="outline" 
                className="ml-2 border-[#1C0357] text-[#1C0357] hover:bg-[#1C0357] hover:text-white"
              >
                Logout
              </Button>
            ) : (
              <Link to="/login">
                <Button 
                  variant="outline" 
                  className="ml-2 border-[#1C0357] text-[#1C0357] hover:bg-[#1C0357] hover:text-white"
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
                <Button variant="outline" size="icon" className="border-[#1C0357] text-[#1C0357] hover:bg-[#1C0357] hover:text-white">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-white text-[#1C0357] border-l-4 border-[#F538BC]">
                <nav className="flex flex-col gap-2 mt-12">
                  {menuItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      className="text-lg font-medium py-2 px-4 rounded-md hover:bg-[#D1AAF2]/30 transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                  {session ? (
                    <Button 
                      onClick={handleLogout}
                      variant="outline" 
                      className="mt-4 w-32 border-[#1C0357] text-[#1C0357] hover:bg-[#1C0357] hover:text-white justify-start"
                    >
                      Logout
                    </Button>
                  ) : (
                    <Link to="/login">
                      <Button 
                        variant="outline" 
                        className="mt-4 w-32 border-[#1C0357] text-[#1C0357] hover:bg-[#1C0357] hover:text-white justify-start"
                        onClick={() => setIsOpen(false)}
                      >
                        <LogIn className="mr-2 h-4 w-4" />
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