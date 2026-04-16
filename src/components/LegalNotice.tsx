export default function LegalNotice() {
  return (
    <footer className="border-t border-white/10 bg-[#031523] px-4 py-3 text-center text-[11px] leading-5 text-[#a3b6ca] sm:px-6 sm:text-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-center sm:gap-3">
        <span>18 U.S.C. 2257 | Terms of Use | Video Source</span>
        <span>All Videos Are Indexed From Internet.</span>
        <span>
          Mail{' '}
          <a href="mailto:dmca@vid65.com" className="text-[#8fd2ff] underline transition hover:text-white">
            dmca@vid65.com
          </a>{' '}
          To Remove Video. We Have Policy Of Instant Removal Of Videos.
        </span>
      </div>
    </footer>
  );
}
