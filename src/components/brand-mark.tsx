import msuSeal from "@/assets/msu-seal.png";

/** Official Mindanao State University seal used as the AlumTrack brand mark. */
export function BrandMark({ className = "size-9" }: { className?: string }) {
  return (
    <img
      src={msuSeal}
      alt="Mindanao State University seal"
      width={256}
      height={256}
      className={`${className} rounded-md object-contain bg-white p-0.5`}
    />
  );
}
