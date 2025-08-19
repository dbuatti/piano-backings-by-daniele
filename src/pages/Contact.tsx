import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";

const Contact = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
        <h1 className="text-4xl font-bold text-center text-[#1C0357]">Contact Us</h1>
        <p className="mt-4 text-lg text-center text-[#1C0357]">
          This is the contact page. Content will be added here soon.
        </p>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default Contact;