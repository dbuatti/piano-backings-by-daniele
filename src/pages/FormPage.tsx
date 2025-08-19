import { useState } from 'react';
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LinkIcon, MicIcon, FileTextIcon, MusicIcon, KeyIcon, Coffee } from "lucide-react"; // Added Coffee icon
import { MadeWithDyad } from "@/components/made-with-dyad";
import NavigationMenu from "@/components/NavigationMenu";

const FormPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    songTitle: '',
    musicalOrArtist: '',
    songKey: '',
    differentKey: 'No',
    keyForTrack: '',
    voiceMemo: '',
    sheetMusic: null as File | null,
    youtubeLink: '',
    trackPurpose: '',
    backingType: '',
    deliveryDate: '',
    additionalServices: [],
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

  const handleCheckboxChange = (service: string) => {
    setFormData(prev => {
      const newServices = prev.additionalServices.includes(service)
        ? prev.additionalServices.filter(s => s !== service)
        : [...prev.additionalServices, service];
      return { ...prev, additionalServices: newServices };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // In a real app, you would send this data to your backend
    alert('Form submitted! In a real application, this would be sent to our servers.');
  };

  // Key options for the dropdown
  const keyOptions = [
    { value: 'C Major (0)', label: 'C Major (0)' },
    { value: 'G Major (1♯)', label: 'G Major (1♯)' },
    { value: 'D Major (2♯)', label: 'D Major (2♯)' },
    { value: 'A Major (3♯)', label: 'A Major (3♯)' },
    { value: 'E Major (4♯)', label: 'E Major (4♯)' },
    { value: 'B Major (5♯)', label: 'B Major (5♯)' },
    { value: 'F♯ Major (6♯)', label: 'F♯ Major (6♯)' },
    { value: 'C♯ Major (7♯)', label: 'C♯ Major (7♯)' },
    { value: 'F Major (1♭)', label: 'F Major (1♭)' },
    { value: 'B♭ Major (2♭)', label: 'B♭ Major (2♭)' },
    { value: 'E♭ Major (3♭)', label: 'E♭ Major (3♭)' },
    { value: 'A♭ Major (4♭)', label: 'A♭ Major (4♭)' },
    { value: 'D♭ Major (5♭)', label: 'D♭ Major (5♭)' },
    { value: 'G♭ Major (6♭)', label: 'G♭ Major (6♭)' },
    { value: 'C♭ Major (7♭)', label: 'C♭ Major (7♭)' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100">
      {/* Header Section - Designed based on EC8E16FF-8FB0-434A-B0FC-88D3199A594A_1_105_c.jpeg */}
      <header className="bg-indigo-900 text-white py-8 px-4 sm:px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          {/* Placeholder for potential piano image or decorative element */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url(/public/placeholder.svg)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
          
          <div className="relative z-10 flex-grow text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold mb-2 tracking-tight">Piano Backings Form</h1>
            <p className="text-xl md:text-2xl font-light opacity-90">Submit Your Custom Track Request</p>
          </div>
          
          <div className="relative z-10 flex items-center space-x-2">
            <NavigationMenu />
            <div className="hidden md:flex space-x-4">
              <Link to="/" className="text-indigo-200 hover:text-white font-medium transition-colors">
                Home
              </Link>
              <Link to="/form-page" className="text-indigo-200 hover:text-white font-medium transition-colors">
                Request Form
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6 rounded">
          <p className="font-bold text-yellow-800">
            ⚠️ Important Notice: Due to high demand, there is a 2-3 week wait on backing tracks. 
            If you need a faster turnaround, consider the Rush Fee option below. Thank you for your patience!
          </p>
        </div>

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
                      <a href="https://buymeacoffee.com/danielebuatti" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline flex items-center">
                        <Coffee className="mr-2 h-5 w-5" /> ☕ Buy Me a Coffee
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
                {/* Section 1 */}
                <div className="border-b pb-6">
                  <h3 className="text-xl font-semibold mb-4 text-indigo-700">Section 1: Basic Information</h3>
                  
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
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
                  
                  <div className="mt-4">
                    <Label htmlFor="songKey">What key is your song in? (Don't worry if you're unsure)</Label>
                    <Select onValueChange={(value) => handleSelectChange('songKey', value)} value={formData.songKey}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select key" />
                      </SelectTrigger>
                      <SelectContent>
                        {keyOptions.map((key) => (
                          <SelectItem key={key.value} value={key.value}>
                            {key.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="mt-4">
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
                  
                  <div className="mt-4">
                    <Label htmlFor="keyForTrack">Which key?</Label>
                    <Select onValueChange={(value) => handleSelectChange('keyForTrack', value)} value={formData.keyForTrack}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select key" />
                      </SelectTrigger>
                      <SelectContent>
                        {keyOptions.map((key) => (
                          <SelectItem key={key.value} value={key.value}>
                            {key.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Section 2 */}
                <div className="border-b pb-6">
                  <h3 className="text-xl font-semibold mb-4 text-indigo-700">Section 2: Track Details</h3>
                  
                  <div className="mt-4">
                    <Label htmlFor="youtubeLink" className="flex items-center">
                      <LinkIcon className="mr-2" size={16} />
                      YouTube URL for tempo reference *
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
                  
                  <div className="mt-4">
                    <Label htmlFor="voiceMemo" className="flex items-center">
                      <MicIcon className="mr-2" size={16} />
                      Voice Memo (optional)
                    </Label>
                    <Input 
                      id="voiceMemo" 
                      name="voiceMemo" 
                      value={formData.voiceMemo} 
                      onChange={handleInputChange} 
                      placeholder="Upload a voice memo or provide a link"
                    />
                  </div>
                  
                  <div className="mt-4">
                    <Label htmlFor="sheetMusic" className="flex items-center">
                      <FileTextIcon className="mr-2" size={16} />
                      Please upload your sheet music as a PDF *
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
                  
                  <div className="mt-4">
                    <Label htmlFor="trackPurpose">This track is for...</Label>
                    <Select onValueChange={(value) => handleSelectChange('trackPurpose', value)} value={formData.trackPurpose}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select purpose" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal-practise">Personal Practise</SelectItem>
                        <SelectItem value="audition-backing">Audition Backing Track (selftape)</SelectItem>
                        <SelectItem value="melody-bash">Melody/note bash (no formal backing required)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="mt-4">
                    <Label htmlFor="backingType">What do you need?</Label>
                    <Select onValueChange={(value) => handleSelectChange('backingType', value)} value={formData.backingType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select backing type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-song">Full song backing</SelectItem>
                        <SelectItem value="audition-cut">Audition cut backing</SelectItem>
                        <SelectItem value="note-bash">Note/melody bash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Section 3 */}
                <div className="border-b pb-6">
                  <h3 className="text-xl font-semibold mb-4 text-indigo-700">Section 3: Additional Services</h3>
                  
                  <div className="mt-4">
                    <Label htmlFor="deliveryDate" className="flex items-center">
                      <KeyIcon className="mr-2" size={16} />
                      When do you need your track for?
                    </Label>
                    <Input 
                      id="deliveryDate" 
                      name="deliveryDate" 
                      type="date" 
                      value={formData.deliveryDate} 
                      onChange={handleInputChange} 
                    />
                  </div>
                  
                  <div className="mt-6">
                    <h4 className="font-semibold mb-3">Additional Services</h4>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="rush-order"
                          className="mr-2"
                          checked={formData.additionalServices.includes('rush-order')}
                          onChange={() => handleCheckboxChange('rush-order')}
                        />
                        <Label htmlFor="rush-order" className="flex items-center">
                          <span className="font-medium">Rush Order (24-hour turnaround) +$10</span>
                        </Label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="complex-songs"
                          className="mr-2"
                          checked={formData.additionalServices.includes('complex-songs')}
                          onChange={() => handleCheckboxChange('complex-songs')}
                        />
                        <Label htmlFor="complex-songs" className="flex items-center">
                          <span className="font-medium">Complex Songs (e.g., Sondheim, JRB, Guettel) +$5–$10</span>
                        </Label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="additional-edits"
                          className="mr-2"
                          checked={formData.additionalServices.includes('additional-edits')}
                          onChange={() => handleCheckboxChange('additional-edits')}
                        />
                        <Label htmlFor="additional-edits" className="flex items-center">
                          <span className="font-medium">Additional Edits/Revisions +$5 per request</span>
                        </Label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="exclusive-ownership"
                          className="mr-2"
                          checked={formData.additionalServices.includes('exclusive-ownership')}
                          onChange={() => handleCheckboxChange('exclusive-ownership')}
                        />
                        <Label htmlFor="exclusive-ownership" className="flex items-center">
                          <span className="font-medium">Exclusive Ownership (not uploaded/shared online) $40</span>
                        </Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <Label htmlFor="specialRequests">Is there anything else you'd like to add?</Label>
                    <Textarea 
                      id="specialRequests" 
                      name="specialRequests" 
                      value={formData.specialRequests} 
                      onChange={handleInputChange} 
                      placeholder="Any special requests or additional information..."
                    />
                  </div>
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