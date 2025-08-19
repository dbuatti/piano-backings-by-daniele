import { useState } from 'react';
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, FileTextIcon, LinkIcon, MicIcon, Menu } from "lucide-react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import NavigationMenu from "@/components/NavigationMenu";

const Index = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    songTitle: '',
    composer: '',
    youtubeLink: '',
    voiceMemo: '',
    sheetMusic: null as File | null,
    trackLength: '',
    paymentPreference: '',
    deliveryDate: '',
    specialRequests: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, sheetMusic: e.target.files![0] }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // In a real app, you would send this data to your backend
    alert('Form submitted! In a real application, this would be sent to our servers.');
  };

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
                For a concise guide on scanning your music, please <a href="#" className="text-indigo-600 hover:underline font-medium">click here</a>.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Next Steps */}
        <section className="mb-12">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-indigo-800">Next Steps</CardTitle>
              <CardDescription>Fill out the form below to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                To proceed, please complete this form. The form provides an option for you to attach a YouTube link, 
                a voice memo (if needed), and your sheet music in PDF format.
              </p>
              
              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      name="name" 
                      value={formData.name} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      value={formData.email} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="songTitle">Song Title</Label>
                    <Input 
                      id="songTitle" 
                      name="songTitle" 
                      value={formData.songTitle} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                  <div>
                    <Label htmlFor="composer">Composer</Label>
                    <Input 
                      id="composer" 
                      name="composer" 
                      value={formData.composer} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="youtubeLink" className="flex items-center">
                    <LinkIcon className="mr-2" size={16} />
                    YouTube Link (if applicable)
                  </Label>
                  <Input 
                    id="youtubeLink" 
                    name="youtubeLink" 
                    value={formData.youtubeLink} 
                    onChange={handleInputChange} 
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
                
                <div>
                  <Label htmlFor="voiceMemo" className="flex items-center">
                    <MicIcon className="mr-2" size={16} />
                    Voice Memo (if needed)
                  </Label>
                  <Input 
                    id="voiceMemo" 
                    name="voiceMemo" 
                    value={formData.voiceMemo} 
                    onChange={handleInputChange} 
                    placeholder="Upload a voice memo or provide a link"
                  />
                </div>
                
                <div>
                  <Label htmlFor="sheetMusic">Sheet Music (PDF)</Label>
                  <Input 
                    id="sheetMusic" 
                    name="sheetMusic" 
                    type="file" 
                    accept=".pdf" 
                    onChange={handleFileChange} 
                    required 
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="trackLength">Track Length</Label>
                    <Select onValueChange={(value) => handleSelectChange('trackLength', value)} value={formData.trackLength}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select track length" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16-bar">2-5 Coffees - 16 Bar Cut (roughly 30-45 seconds)</SelectItem>
                        <SelectItem value="32-bar">3-6 Coffees - 32 Bar Cut (roughly 60-90 seconds)</SelectItem>
                        <SelectItem value="full-song">4-8 Coffees - Full Song</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="paymentPreference">Payment Preference</Label>
                    <Select onValueChange={(value) => handleSelectChange('paymentPreference', value)} value={formData.paymentPreference}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="before">Pay before completion</SelectItem>
                        <SelectItem value="after">Pay after completion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="deliveryDate" className="flex items-center">
                    <CalendarIcon className="mr-2" size={16} />
                    Preferred Delivery Date
                  </Label>
                  <Input 
                    id="deliveryDate" 
                    name="deliveryDate" 
                    type="date" 
                    value={formData.deliveryDate} 
                    onChange={handleInputChange} 
                  />
                </div>
                
                <div>
                  <Label htmlFor="specialRequests">Special Requests</Label>
                  <Textarea 
                    id="specialRequests" 
                    name="specialRequests" 
                    value={formData.specialRequests} 
                    onChange={handleInputChange} 
                    placeholder="Any special requests or additional information..."
                  />
                </div>
                
                <div className="text-center">
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 text-lg">
                    Submit Request
                  </Button>
                </div>
              </form>
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