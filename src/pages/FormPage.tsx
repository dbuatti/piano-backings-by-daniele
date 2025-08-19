import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LinkIcon, MicIcon, FileTextIcon, MusicIcon, KeyIcon } from "lucide-react";
import { MadeWithDyad } from "@/components/made-with-dyad";

const FormPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    songTitle: '',
    musicalOrArtist: '',
    songKey: '',
    differentKey: 'No',
    youtubeLink: '',
    voiceMemo: '',
    sheetMusic: null as File | null,
    recordingType: '',
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
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-indigo-900 mb-4">Piano Backings Form</h1>
          <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6 rounded">
            <p className="font-bold text-yellow-800">
              ⚠️ Important Notice: Due to high demand, there is a 2-3 week wait on backing tracks. 
              If you need a faster turnaround, consider the Rush Fee option below. Thank you for your patience!
            </p>
          </div>
        </header>

        {/* Introduction */}
        <section className="mb-12">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start mb-4">
                <MusicIcon className="text-indigo-600 mr-3 mt-1" />
                <p className="text-lg">
                  I provide custom piano backing tracks for musical theatre and pop. Whether you need a quick reference or a polished audition track, 
                  I offer flexible options to suit your needs.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Payment & Pricing */}
        <section className="mb-12">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-indigo-800 flex items-center">
                <LinkIcon className="mr-2" />
                Payment & Pricing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-lg mb-2">📌 Payment Methods</h3>
                  <ul className="space-y-2">
                    <li>
                      <a href="https://buymeacoffee.com/danielebuatti" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                        ☕ Buy Me a Coffee
                      </a>
                    </li>
                    <li>
                      <span className="font-medium">Bank Transfer:</span> BSB: 923100 | Account: 301110875
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">🔗 Follow & Connect</h3>
                  <ul className="space-y-1">
                    <li>📺 YouTube: Piano Backings</li>
                    <li>📸 Instagram: @pianobackingsbydaniele</li>
                    <li>📧 Email: pianobackingsbydaniele@gmail.com</li>
                    <li>📘 Facebook: Piano Backings</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p>
                  💡 For more information:{" "}
                  <a href="https://www.danielebuatti.com/piano-backings" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                    www.danielebuatti.com/piano-backings
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Recording Types */}
        <section className="mb-12">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-indigo-800">RECORDING TYPES</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="bg-indigo-100 text-indigo-800 font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-1 flex-shrink-0">1</div>
                  <div>
                    <span className="font-bold">Quick Reference (Voice Memo)</span> – A fast and rough voice memo ideal for quick learning or audition notes, not suited for professional use.
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="bg-indigo-100 text-indigo-800 font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-1 flex-shrink-0">2</div>
                  <div>
                    <span className="font-bold">One-Take Recording</span> – A single-pass, good-quality DAW recording with potential minor errors, suitable for self-tapes and quick references.
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="bg-indigo-100 text-indigo-800 font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-1 flex-shrink-0">3</div>
                  <div>
                    <span className="font-bold">Polished & Accurate Backing</span> – A refined, accurate track with correct notes and rhythm, ideal for auditions, performances, and dedicated practice.
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Form Section */}
        <section className="mb-12">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-indigo-800">Request Form</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h3 className="font-bold text-lg mb-2">Request Form Guidelines</h3>
                <p className="mb-3">
                  This form is designed to capture details about your piano backing request.
                </p>
                <div className="border-l-4 border-yellow-500 pl-4">
                  <p className="font-bold text-yellow-700">
                    ✅ Important: Your sheet music must be clear, correctly cut, and in the right key.
                  </p>
                </div>
                <p className="mt-3 font-medium">Before submitting, please make sure to include:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>✔️ Your sheet music in PDF format (required)</li>
                  <li>✔️ A YouTube link to the song (for tempo reference) (required)</li>
                  <li>✔️ A voice memo of you singing the song with accurate rests/beats (optional but helpful)</li>
                </ul>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      value={formData.email} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input 
                      id="name" 
                      name="name" 
                      value={formData.name} 
                      onChange={handleInputChange} 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="songTitle">Song Title *</Label>
                    <Input 
                      id="songTitle" 
                      name="songTitle" 
                      value={formData.songTitle} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                  <div>
                    <Label htmlFor="musicalOrArtist">Musical or Artist *</Label>
                    <Input 
                      id="musicalOrArtist" 
                      name="musicalOrArtist" 
                      value={formData.musicalOrArtist} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="songKey">What key is your song in? (Don't worry if you're unsure)</Label>
                    <Input 
                      id="songKey" 
                      name="songKey" 
                      value={formData.songKey} 
                      onChange={handleInputChange} 
                    />
                  </div>
                  <div>
                    <Label htmlFor="differentKey">Do you require it in a different key?</Label>
                    <Select onValueChange={(value) => handleSelectChange('differentKey', value)} value={formData.differentKey}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="No">No</SelectItem>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="Maybe">Maybe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="youtubeLink" className="flex items-center">
                    <LinkIcon className="mr-2" size={16} />
                    YouTube Link (for tempo reference) *
                  </Label>
                  <Input 
                    id="youtubeLink" 
                    name="youtubeLink" 
                    value={formData.youtubeLink} 
                    onChange={handleInputChange} 
                    placeholder="https://www.youtube.com/watch?v=..."
                    required
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
                  <Label htmlFor="sheetMusic" className="flex items-center">
                    <FileTextIcon className="mr-2" size={16} />
                    Sheet Music (PDF) *
                  </Label>
                  <Input 
                    id="sheetMusic" 
                    name="sheetMusic" 
                    type="file" 
                    accept=".pdf" 
                    onChange={handleFileChange} 
                    required 
                  />
                </div>
                
                <div>
                  <Label htmlFor="recordingType">Recording Type</Label>
                  <Select onValueChange={(value) => handleSelectChange('recordingType', value)} value={formData.recordingType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select recording type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quick-reference">Quick Reference (Voice Memo)</SelectItem>
                      <SelectItem value="one-take">One-Take Recording</SelectItem>
                      <SelectItem value="polished">Polished & Accurate Backing</SelectItem>
                    </SelectContent>
                  </Select>
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

        <MadeWithDyad />
      </div>
    </div>
  );
};

export default FormPage;