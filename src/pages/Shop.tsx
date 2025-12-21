{/* Track Quality Legend Overlay */}
<div className="my-12 px-4">
  <div className="max-w-4xl mx-auto bg-white/80 backdrop-blur-sm border border-[#D1AAF2]/50 rounded-2xl shadow-2xl p-8">
    <h3 className="text-2xl font-bold text-[#1C0357] mb-6 text-center">
      Track Quality Guide
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="flex flex-col items-center text-center">
        <div className="p-4 bg-pink-100 rounded-full mb-4 shadow-lg">
          <Sparkles className="h-10 w-10 text-[#F538BC]" />
        </div>
        <h4 className="font-semibold text-[#1C0357] text-lg mb-2">Polished Backing</h4>
        <p className="text-gray-700 text-sm">
          Fully produced, multi-layered piano accompaniment with professional mixing and effects.
        </p>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="p-4 bg-yellow-100 rounded-full mb-4 shadow-lg">
          <Headphones className="h-10 w-10 text-yellow-600" />
        </div>
        <h4 className="font-semibold text-[#1C0357] text-lg mb-2">One-Take Recording</h4>
        <p className="text-gray-700 text-sm">
          Live single-take piano performance — authentic feel with minimal editing.
        </p>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="p-4 bg-blue-100 rounded-full mb-4 shadow-lg">
          <Mic className="h-10 w-10 text-blue-600" />
        </div>
        <h4 className="font-semibold text-[#1C0357] text-lg mb-2">Quick Reference</h4>
        <p className="text-gray-700 text-sm">
          Basic piano guide track — fast and simple for quick practice or reference.
        </p>
      </div>
    </div>
    <p className="text-center text-sm text-gray-600 mt-6">
      Higher quality tracks take more time to produce — thank you for supporting the craft!
    </p>
  </div>
</div>