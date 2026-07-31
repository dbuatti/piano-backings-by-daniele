import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-grow flex items-center justify-center px-4 pt-24 pb-12">
        <div className="text-center max-w-md">
          <p className="text-8xl font-black text-[#1C0357] mb-2">404</p>
          <h1 className="text-2xl font-black text-[#1C0357] mb-3">
            Page not found
          </h1>
          <p className="text-gray-500 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Button asChild className="bg-[#1C0357] hover:bg-[#2D0B8C] text-white font-bold rounded-full">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Return to Home
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default NotFound;