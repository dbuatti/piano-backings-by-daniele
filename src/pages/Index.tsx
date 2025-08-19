import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileTextIcon, Menu } from "lucide-react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import NavigationMenu from "@/components/NavigationMenu";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex justify-between items-center mb-6">
            <div></div>
            <h1 className="text-4xl md:text-5xl font-bold text-indigo-900">Piano Backings By Daniele</h1>
            <div className="flex items-center space-x-2">
              <NavigationMenu />
              <div className="hidden md:flex space-x-4">
                <Link to="/" className="text-indigo-700 hover:text-indigo-900 font-medium">
                  Home
                </Link>
                <Link to="/form-page" className="text-indigo-700 hover:text-indigo-900 font-medium">
                  Request Form
                </Link>
              </div>
            </div>
          </div>
          <p className="text-xl text-indigo-700">Professional Piano Backing Tracks for Auditions</p>
        </header>

        {/* Introduction Section */}
        <section className="mb-12">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-indigo-800">Welcome to Piano Backings by Daniele</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Established towards the end of 2020, Piano Backings by Daniele is a small venture aimed at assisting artists as they prepare for auditions. 
                I initially offered a "pay as you feel" system, but as the business evolved, I transitioned to set prices for each track to streamline the process.
              </p>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <p className="font-semibold text-yellow-800">
                  Please be aware that songs from Stephen Sondheim, Jason Robert Brown, or Adam Guettel may require a price adjustment, 
                  as these pieces generally necessitate additional time and effort to craft the perfect backing track.
                </p>
              </div>
              
              <p className="mb-4">
                This newly created page is designed to provide all necessary information in one place. I greatly value your feedback and am constantly 
                striving to make the information more accessible and comprehensible. Feel free to drop me an email with any suggestions!
              </p>
              
              <p>
                Piano Backings by Daniele isn't a full-time pursuit. There might be periods when I'm unable to accept new projects. 
                During these times, I ask for your understanding and patience. I promise to keep you updated about my availability and any busy periods 
                where I may be unable to undertake new tasks.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Scanning Tips */}
        <section className="mb-12">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-indigo-800 flex items-center">
                <FileTextIcon className="mr-2" />
                Scanning Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                For a concise guide on scanning your music, please <a href="https://www.danielebuatti.com/post/scanning-applications" className="text-indigo-600 hover:underline font-medium">click here</a>.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Pricing Structure */}
        <section className="mb-12">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-indigo-800">Pricing Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-4">
                <li className="flex items-start">
                  <span className="text-indigo-600 font-bold mr-2">•</span>
                  <span><strong>2-5 Coffees:</strong> 16 Bar Cut (roughly 30-45 seconds)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 font-bold mr-2">•</span>
                  <span><strong>3-6 Coffees:</strong> 32 Bar Cut (roughly 60-90 seconds)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 font-bold mr-2">•</span>
                  <span><strong>4-8 Coffees:</strong> Full Song</span>
                </li>
              </ul>
              
              <p className="mb-2"><strong>Payment Timing:</strong> You can choose to pay before or after the completion of the track.</p>
              <p><strong>Delivery Timeline:</strong> You can expect to receive your track on the date specified in the form.</p>
            </CardContent>
          </Card>
        </section>

        {/* Closing */}
        <section className="text-center mb-12">
          <Card className="shadow-lg bg-indigo-50">
            <CardContent className="py-8">
              <p className="text-xl text-indigo-800 font-medium">
                Thank you for choosing Piano Backings by Daniele. I look forward to crafting your perfect backing track!
              </p>
            </CardContent>
          </Card>
        </section>

        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;