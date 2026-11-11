/** Shared transparent AlumTrack logo for the public, alumni, and admin shells. */
export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <img
      src="/assets/alumtrack-logo.png"
      alt="AlumTrack — MSU Main Campus"
      width={1254}
      height={1254}
      className={`${className} block object-contain`}
    />
  );
}
