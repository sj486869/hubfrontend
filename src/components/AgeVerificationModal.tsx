'use client';

import { useEffect, useState } from 'react';

export default function AgeVerificationModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const verified = localStorage.getItem('age_verified');
    if (verified !== 'true') {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  const confirm = () => {
    localStorage.setItem('age_verified', 'true');
    setVisible(false);
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm sm:p-5">
      <div className="relative w-full max-w-[700px] animate-fade-in overflow-hidden rounded-lg bg-[#f4f4f4] text-gray-800 shadow-2xl">
        
        {/* Close "X" - typically redirects away on adult sites if clicked */}
        <a 
          href="https://www.google.com" 
          className="absolute right-4 top-4 text-gray-400 transition hover:text-gray-700"
          aria-label="Leave site"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </a>

        {/* Main Content Area */}
        <div className="px-6 py-8 sm:px-10 sm:py-10">
          <h1 className="mb-6 text-2xl font-bold text-gray-900 sm:text-3xl">
            xHamster is <span className="text-[#ef4444]">adults only</span> website!
          </h1>

          <div className="space-y-4 text-sm leading-relaxed text-gray-700 sm:text-base">
            <p>
              The content available on xHamster may contain pornographic materials.
            </p>
            <p>
              xHamster is strictly limited to those over 18 or of legal age in your jurisdiction, whichever is greater.
            </p>
            <p>
              One of our core goals is to help parents restrict access to xHamster for minors, so we have ensured that xHamster is, and remains, fully compliant with the RTA (Restricted to Adults) code. This means that all access to the site can be blocked by simple parental control tools. It is important that responsible parents and guardians take the necessary steps to prevent minors from accessing unsuitable content online, especially age-restricted content.
            </p>
            <p>
              Anyone with a minor in their household or under their supervision should implement basic parental control protections, including computer hardware and device settings, software installation, or ISP filtering services, to block your minors from accessing inappropriate content.
            </p>
          </div>

          {/* Action Area */}
          <div className="mt-8 flex flex-col items-center">
            <p className="mb-4 font-bold text-gray-900">
              To enter xHamster you must be 18 or older
            </p>
            <button
              onClick={confirm}
              className="w-full rounded-md bg-[#ef4444] py-3.5 text-base font-bold text-white transition hover:bg-[#dc2626] sm:py-4"
            >
              I&apos;m 18 or older — enter xHamster
            </button>
          </div>
        </div>

        {/* Footer Area */}
        <div className="flex items-center justify-between border-t border-gray-300 bg-gray-200/50 px-6 py-4 sm:px-10">
          <a 
            href="#" 
            className="text-sm text-gray-600 underline transition hover:text-gray-900"
          >
            how to protect your minors
          </a>
          
          {/* RTA Logo Placeholder */}
          <div className="flex items-center space-x-1 opacity-60">
            <span className="text-2xl font-black tracking-tighter text-gray-500">RTA</span>
            <span className="text-[8px] uppercase leading-tight text-gray-500 text-left w-12">Restricted<br/>to adults</span>
          </div>
        </div>

      </div>
    </div>
  );
}